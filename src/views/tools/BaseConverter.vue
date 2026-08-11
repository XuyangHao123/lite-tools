<template>
  <ToolLayout
    title="进制转换"
    desc="免费在线进制转换工具，支持 2-36 任意进制互转、负数、小数、大数（BigInt 无精度丢失），附字符码与原码/反码/补码视图。"
    fav-key="base-converter"
  >
    <div class="base-converter">
      <!-- 基础进制行 -->
      <div v-for="base in bases" :key="base.value" class="convert-row">
        <div class="base-label">
          <el-tag :type="base.tag" size="large" effect="dark">{{ base.label }}</el-tag>
        </div>
        <el-input
          v-model="base.input"
          size="large"
          :placeholder="`输入${base.label}数值`"
          class="base-input"
          @input="() => onInput(base)"
        />
        <el-button text :icon="CopyDocument" @click="copy(base.input)" :disabled="!base.input" />
      </div>

      <!-- 自定义进制 -->
      <div class="custom-row">
        <div class="base-label">
          <span class="custom-tag">自定义进制</span>
        </div>
        <el-input-number v-model="customBase" :min="2" :max="36" size="large" class="custom-base-num" controls-position="right" />
        <el-input
          v-model="customInput"
          size="large"
          placeholder="输入自定义进制数值"
          class="base-input"
          @input="onCustomInput"
        />
        <el-button text :icon="CopyDocument" @click="copy(customInput)" :disabled="!customInput" />
      </div>

      <div v-if="error" class="error-msg"><el-alert :title="error" type="error" show-icon :closable="false" /></div>

      <!-- 十进制的附加信息：字符码 / 原反补码 -->
      <div v-if="decValue != null && !error" class="extra-info">
        <div class="info-card">
          <div class="info-title">字符码（Unicode）</div>
          <div v-if="charInfo" class="info-row">
            <span class="info-char">{{ charInfo.ch }}</span>
            <span class="info-detail">U+{{ charInfo.hex }} · 十进制 {{ charInfo.dec }}</span>
          </div>
          <div v-else class="info-empty">当前数值不在 0-0x10FFFF 范围内，无对应 Unicode 字符</div>
        </div>
        <div class="info-card" v-if="isInteger && decValue >= 0 && decBits">
          <div class="info-title">二进制表示（8/16/32 位）</div>
          <div class="info-row" v-for="bits in decBits" :key="bits.bits">
            <span class="info-label">{{ bits.bits }} 位</span>
            <span class="info-mono">{{ bits.bin }}</span>
          </div>
          <div class="info-row" v-if="decValue8 && complement">
            <span class="info-label">原码(8位)</span>
            <span class="info-mono">{{ complement.original }}</span>
          </div>
          <div class="info-row" v-if="complement">
            <span class="info-label">反码(8位)</span>
            <span class="info-mono">{{ complement.ones }}</span>
          </div>
          <div class="info-row" v-if="complement">
            <span class="info-label">补码(8位)</span>
            <span class="info-mono">{{ complement.twos }}</span>
          </div>
        </div>
      </div>

      <div class="tips">
        <p class="tip">支持 2-36 任意进制互转；大数使用 BigInt 无精度丢失；支持负数与小数（小数部分有限精度）。</p>
        <p class="tip">在任意输入框输入数值，其他进制自动同步。十六进制输出大写。</p>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const error = ref('')

const bases = ref([
  { value: 2, label: '二进制 BIN', tag: 'primary', input: '' },
  { value: 8, label: '八进制 OCT', tag: 'success', input: '' },
  { value: 10, label: '十进制 DEC', tag: 'warning', input: '' },
  { value: 16, label: '十六进制 HEX', tag: 'danger', input: '' }
])

const customBase = ref(2)
const customInput = ref('')

// 合法的字符集（按进制）
function validChars(base) {
  if (base <= 10) return new RegExp(`^-?[0-${base - 1}]*(\\.[0-${base - 1}]*)?$`)
  const top = (base - 1).toString(base).toUpperCase()
  return new RegExp(`^-?[0-9A-${top}]*(\\.[0-9A-${top}]*)?$`, 'i')
}

/** 用 BigInt 把整数部分从 sourceBase 转为十进制 BigInt */
function parseBigIntInt(intStr, base) {
  if (!intStr || intStr === '-') return 0n
  const negative = intStr.startsWith('-')
  const s = (negative ? intStr.slice(1) : intStr).toUpperCase()
  let result = 0n
  const bigBase = BigInt(base)
  for (const ch of s) {
    const digit = parseInt(ch, base)
    if (isNaN(digit)) throw new Error('非法字符：' + ch)
    result = result * bigBase + BigInt(digit)
  }
  return negative ? -result : result
}

/** BigInt 整数 → 目标进制字符串 */
function bigIntToBase(val, base) {
  if (val === 0n) return '0'
  const negative = val < 0n
  let n = negative ? -val : val
  const bigBase = BigInt(base)
  let result = ''
  while (n > 0n) {
    const digit = Number(n % bigBase)
    result = digit.toString(base).toUpperCase() + result
    n = n / bigBase
  }
  return (negative ? '-' : '') + result
}

/** 小数部分：sourceBase → 十进制（Number，有限精度） */
function parseFrac(fracStr, base) {
  if (!fracStr) return 0
  let result = 0
  let factor = 1 / base
  for (const ch of fracStr.toUpperCase()) {
    const digit = parseInt(ch, base)
    if (isNaN(digit)) throw new Error('非法字符：' + ch)
    result += digit * factor
    factor /= base
  }
  return result
}

/** 十进制小数 → 目标进制（迭代乘法，最多 16 位） */
function fracToBase(frac, base, maxDigits = 16) {
  if (frac <= 0) return ''
  let result = ''
  let f = frac
  for (let i = 0; i < maxDigits && f > 0; i++) {
    f *= base
    const digit = Math.floor(f)
    result += digit.toString(base).toUpperCase()
    f -= digit
  }
  // 去掉尾部 0
  return result.replace(/0+$/, '')
}

// 当前的十进制 BigInt 整数部分（供附加信息用）
const decValue = ref(null)
const isInteger = ref(true)

function onInput(sourceBase) {
  const val = sourceBase.input.trim()
  // 清空所有
  if (!val) {
    bases.value.forEach((b) => { if (b.value !== sourceBase.value) b.input = '' })
    customInput.value = ''
    error.value = ''
    decValue.value = null
    return
  }
  const re = validChars(sourceBase.value)
  if (!re.test(val)) {
    error.value = `${sourceBase.label} 输入无效：包含非法字符`
    return
  }
  error.value = ''
  try {
    const [signRaw, ...rest] = val.split(/(?=[.])/)
    let intPart = val
    let fracPart = ''
    const dotIdx = val.indexOf('.')
    if (dotIdx >= 0) {
      intPart = val.slice(0, dotIdx)
      fracPart = val.slice(dotIdx + 1)
    }
    const negative = intPart.startsWith('-')
    if (negative) intPart = intPart.slice(1)
    if (!intPart) intPart = '0'

    const bigInt = parseBigIntInt(intPart, sourceBase.value)
    const frac = parseFrac(fracPart, sourceBase.value)

    isInteger.value = !fracPart
    decValue.value = bigInt

    // 同步其他基础进制
    bases.value.forEach((b) => {
      if (b.value !== sourceBase.value) {
        let out = bigIntToBase(bigInt, b.value)
        if (fracPart) {
          const f = fracToBase(frac, b.value)
          if (f) out += '.' + f
        }
        b.input = out
      }
    })
    // 同步自定义进制
    {
      let out = bigIntToBase(bigInt, customBase.value)
      if (fracPart) {
        const f = fracToBase(frac, customBase.value)
        if (f) out += '.' + f
      }
      customInput.value = out
    }
  } catch (e) {
    error.value = '转换失败：' + e.message
  }
}

function onCustomInput() {
  const val = customInput.value.trim()
  if (!val) {
    bases.value.forEach((b) => (b.input = ''))
    error.value = ''
    decValue.value = null
    return
  }
  const re = validChars(customBase.value)
  if (!re.test(val)) {
    error.value = `自定义进制(${customBase.value}) 输入无效`
    return
  }
  error.value = ''
  try {
    let intPart = val
    let fracPart = ''
    const dotIdx = val.indexOf('.')
    if (dotIdx >= 0) {
      intPart = val.slice(0, dotIdx)
      fracPart = val.slice(dotIdx + 1)
    }
    const negative = intPart.startsWith('-')
    if (negative) intPart = intPart.slice(1)
    if (!intPart) intPart = '0'
    const bigInt = parseBigIntInt(intPart, customBase.value)
    const frac = parseFrac(fracPart, customBase.value)
    isInteger.value = !fracPart
    decValue.value = bigInt
    bases.value.forEach((b) => {
      let out = bigIntToBase(bigInt, b.value)
      if (fracPart) {
        const f = fracToBase(frac, b.value)
        if (f) out += '.' + f
      }
      b.input = out
    })
  } catch (e) {
    error.value = '转换失败：' + e.message
  }
}

// ===== 附加信息 =====
const charInfo = computed(() => {
  const v = decValue.value
  if (v == null || v < 0n || v > 0x10ffffn) return null
  const n = Number(v)
  if (!Number.isSafeInteger(n)) return null
  try {
    const ch = String.fromCodePoint(n)
    return { ch, hex: n.toString(16).toUpperCase().padStart(4, '0'), dec: n }
  } catch {
    return null
  }
})

const decValue8 = computed(() => {
  const v = decValue.value
  if (v == null) return null
  return Number(v)
})

// 8/16/32 位无符号二进制（仅小整数）
const decBits = computed(() => {
  const v = decValue.value
  if (v == null || v < 0n || v > 0xffffffffn) return null
  const n = Number(v)
  return [
    { bits: 8, bin: n.toString(2).padStart(8, '0') },
    { bits: 16, bin: n.toString(2).padStart(16, '0') },
    { bits: 32, bin: n.toString(2).padStart(32, '0') }
  ]
})

// 原码/反码/补码（8位，仅 -128~127）
const complement = computed(() => {
  const v = decValue.value
  if (v == null || !isInteger.value) return null
  const n = Number(v)
  if (!Number.isSafeInteger(n) || n < -128 || n > 127) return null
  if (n >= 0) {
    const bin = n.toString(2).padStart(8, '0')
    return { original: bin, ones: bin, twos: bin }
  }
  const mag = (-n).toString(2).padStart(8, '0')
  // 原码：符号位 1 + 幅值
  const original = '1' + mag.slice(1)
  // 反码：符号位不变，其余取反
  const onesArr = original.split('').map((b, i) => (i === 0 ? b : b === '0' ? '1' : '0'))
  const ones = onesArr.join('')
  // 补码：反码 +1
  let twos = (parseInt(ones, 2) + 1).toString(2).padStart(8, '0')
  if (twos.length > 8) twos = twos.slice(-8)
  return { original, ones, twos }
})

async function copy(text) {
  if (!text) return
  const ok = await copyText(text)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败')
}
</script>

<style scoped>
.base-converter { display: flex; flex-direction: column; gap: 14px; }
.convert-row, .custom-row { display: flex; align-items: center; gap: 10px; }
.base-label { width: 130px; flex-shrink: 0; }
.custom-tag { display: inline-flex; align-items: center; justify-content: center; height: 32px; padding: 0 10px; background: var(--color-primary-light, #ecf5ff); color: var(--color-primary, #409eff); border-radius: 4px; font-size: 12px; font-weight: 600; }
.custom-base-num { width: 110px; flex-shrink: 0; }
.base-input { flex: 1; }
.base-input :deep(input) { font-family: ui-monospace, 'Courier New', monospace; font-size: 16px; }
.error-msg { margin-top: 4px; }
.extra-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
.info-card { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #ebeef5); border-radius: 8px; padding: 12px 16px; }
.info-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary, #303133); margin-bottom: 8px; }
.info-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 13px; }
.info-char { font-size: 24px; font-weight: 700; color: var(--color-primary, #409eff); }
.info-detail { color: var(--color-text-regular, #606266); font-family: ui-monospace, monospace; }
.info-label { width: 80px; color: var(--color-text-secondary, #909399); flex-shrink: 0; }
.info-mono { font-family: ui-monospace, 'Courier New', monospace; color: var(--color-text-primary, #303133); word-break: break-all; }
.info-empty { font-size: 12px; color: var(--color-text-placeholder, #c0c4cc); }
.tips { margin-top: 8px; }
.tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 4px 0; }
@media (max-width: 768px) {
  .convert-row, .custom-row { flex-direction: column; align-items: stretch; }
  .base-label, .custom-base-num { width: auto; }
  .extra-info { grid-template-columns: 1fr; }
}
</style>
