<template>
  <ToolLayout
    title="密码生成器"
    desc="免费在线生成随机密码，支持自定义长度、字符类型、排除易混字符、批量生成、口令短语与 PIN 模式，使用加密安全随机数，本地生成不上传。"
    fav-key="password-generator"
  >
    <div class="pwd-generator">
      <!-- 模式切换 -->
      <el-radio-group v-model="genMode" size="default">
        <el-radio-button value="random">随机密码</el-radio-button>
        <el-radio-button value="passphrase">口令短语</el-radio-button>
        <el-radio-button value="pin">PIN 数字</el-radio-button>
      </el-radio-group>

      <!-- 结果区 -->
      <div class="pwd-result" v-if="genMode === 'random' || genMode === 'pin'">
        <el-input v-model="password" size="large" readonly placeholder="点击下方生成按钮" class="pwd-input">
          <template #append>
            <el-button :icon="CopyDocument" @click="copy(password)" :disabled="!password">复制</el-button>
          </template>
        </el-input>
        <div class="pwd-strength">
          <span class="strength-label">强度</span>
          <el-progress :percentage="strengthPct" :color="strengthColor" :stroke-width="14" />
          <span class="entropy">{{ entropyBits }} bits 熵 · {{ strengthText }}</span>
        </div>
      </div>

      <!-- 批量结果 -->
      <div v-if="batchCount > 1" class="batch-list">
        <div class="batch-header">
          <span>批量生成 {{ batchResults.length }} 个</span>
          <el-button :icon="CopyDocument" size="small" @click="copyAllBatch">全部复制</el-button>
        </div>
        <div v-for="(p, i) in batchResults" :key="i" class="batch-row">
          <span class="batch-num">{{ i + 1 }}</span>
          <span class="batch-val">{{ p }}</span>
          <el-button text :icon="CopyDocument" @click="copy(p)" />
        </div>
      </div>

      <!-- 配置：随机密码 -->
      <el-form label-position="top" class="pwd-config" v-if="genMode === 'random'">
        <el-form-item label="密码长度">
          <el-slider v-model="length" :min="4" :max="64" show-input :show-input-controls="false" />
        </el-form-item>
        <div class="pwd-options">
          <el-form-item><el-checkbox v-model="useUpper">大写字母 (A-Z)</el-checkbox></el-form-item>
          <el-form-item><el-checkbox v-model="useLower">小写字母 (a-z)</el-checkbox></el-form-item>
          <el-form-item><el-checkbox v-model="useNumbers">数字 (0-9)</el-checkbox></el-form-item>
          <el-form-item><el-checkbox v-model="useSymbols">特殊符号</el-checkbox></el-form-item>
        </div>
        <el-form-item label="排除字符">
          <el-input v-model="excludeChars" placeholder="如 0O1lI（留空不排除）" />
          <el-checkbox v-model="excludeAmbiguous" style="margin-left:12px">排除易混字符 (0/O/1/l/I)</el-checkbox>
        </el-form-item>
        <el-form-item label="易读分隔">
          <el-checkbox v-model="easyRead">每 4 位用连字符分隔（如 abcd-efgh）</el-checkbox>
        </el-form-item>
        <el-form-item label="批量数量">
          <el-input-number v-model="batchCount" :min="1" :max="100" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" @click="generate" class="generate-btn">生成密码</el-button>
        </el-form-item>
      </el-form>

      <!-- 配置：口令短语 -->
      <el-form label-position="top" class="pwd-config" v-if="genMode === 'passphrase'">
        <el-form-item label="单词个数">
          <el-slider v-model="wordCount" :min="3" :max="10" show-input :show-input-controls="false" />
        </el-form-item>
        <el-form-item label="分隔符">
          <el-radio-group v-model="separator">
            <el-radio-button value="-">连字符 -</el-radio-button>
            <el-radio-button value="_">下划线 _</el-radio-button>
            <el-radio-button value=" ">空格</el-radio-button>
            <el-radio-button value=".">点 .</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="capitalizeWords">首字母大写</el-checkbox>
        </el-form-item>
        <el-form-item label="附加数字">
          <el-checkbox v-model="appendNumber">末尾加随机数字</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" @click="generatePassphrase" class="generate-btn">生成口令短语</el-button>
        </el-form-item>
        <div class="pwd-result">
          <el-input v-model="passphrase" size="large" readonly placeholder="口令短语将显示在此">
            <template #append>
              <el-button :icon="CopyDocument" @click="copy(passphrase)" :disabled="!passphrase">复制</el-button>
            </template>
          </el-input>
        </div>
      </el-form>

      <!-- 配置：PIN -->
      <el-form label-position="top" class="pwd-config" v-if="genMode === 'pin'">
        <el-form-item label="PIN 长度">
          <el-slider v-model="pinLength" :min="4" :max="12" show-input :show-input-controls="false" />
        </el-form-item>
        <el-form-item label="批量数量">
          <el-input-number v-model="pinBatch" :min="1" :max="100" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" @click="generatePin" class="generate-btn">生成 PIN</el-button>
        </el-form-item>
      </el-form>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const genMode = ref('random')

// 随机密码配置
const length = ref(16)
const useUpper = ref(true)
const useLower = ref(true)
const useNumbers = ref(true)
const useSymbols = ref(false)
const excludeChars = ref('')
const excludeAmbiguous = ref(false)
const easyRead = ref(false)
const batchCount = ref(1)

const password = ref('')
const batchResults = ref([])

// 口令短语配置
const wordCount = ref(4)
const separator = ref('-')
const capitalizeWords = ref(false)
const appendNumber = ref(false)
const passphrase = ref('')

// PIN 配置
const pinLength = ref(6)
const pinBatch = ref(1)

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const AMBIGUOUS = '0O1lI|'

// 精简词表（约 200 个常见英文词，用于口令短语）
const WORDS = 'apple,brave,cloud,dance,eagle,flame,grace,heart,ivory,jungle,knife,lake,mango,north,ocean,piano,quiet,river,sun,tree,voice,water,yellow,zebra,arrow,bread,clock,dream,earth,field,glass,house,iron,jump,king,lemon,moon,night,orange,paper,queen,rose,stone,tiger,unit,vine,whale,xray,yarn,zone,amber,bird,coin,door,echo,fish,gold,hill,ice,jade,kite,leaf,mind,net,owl,park,quill,road,salt,tent,urn,van,wolf,yard,book,car,dog,egg,fox,gum,hat,ink,jet,key,log,map,nut,pen,quart,run,sit,tag,use,vow,war,yes,zip'.split(',')

function buildCharset() {
  let charset = ''
  if (useUpper.value) charset += UPPER
  if (useLower.value) charset += LOWER
  if (useNumbers.value) charset += NUMBERS
  if (useSymbols.value) charset += SYMBOLS
  let exclude = excludeChars.value
  if (excludeAmbiguous.value) exclude += AMBIGUOUS
  if (exclude) {
    const set = new Set(exclude)
    charset = [...charset].filter((c) => !set.has(c)).join('')
  }
  return charset
}

function randomInt(maxExclusive) {
  // 拒绝采样，避免模偏差
  const max = 0xffffffff
  const limit = max - (max % maxExclusive)
  const arr = new Uint32Array(1)
  let r
  do {
    crypto.getRandomValues(arr)
    r = arr[0]
  } while (r > limit)
  return r % maxExclusive
}

function generate() {
  const charset = buildCharset()
  if (!charset) {
    ElMessage.warning('请至少选择一种字符类型')
    return
  }
  batchResults.value = []
  const makeOne = () => {
    let result = ''
    for (let i = 0; i < length.value; i++) {
      result += charset[randomInt(charset.length)]
    }
    if (easyRead.value) {
      result = result.match(/.{1,4}/g).join('-')
    }
    return result
  }
  if (batchCount.value > 1) {
    for (let i = 0; i < batchCount.value; i++) batchResults.value.push(makeOne())
    password.value = batchResults.value[0]
  } else {
    password.value = makeOne()
  }
}

function generatePassphrase() {
  const parts = []
  for (let i = 0; i < wordCount.value; i++) {
    let w = WORDS[randomInt(WORDS.length)]
    if (capitalizeWords.value) w = w.charAt(0).toUpperCase() + w.slice(1)
    parts.push(w)
  }
  let result = parts.join(separator.value)
  if (appendNumber.value) result += separator.value + String(randomInt(10000)).padStart(4, '0')
  passphrase.value = result
}

function generatePin() {
  batchResults.value = []
  const makeOne = () => {
    let r = ''
    for (let i = 0; i < pinLength.value; i++) r += NUMBERS[randomInt(10)]
    return r
  }
  if (pinBatch.value > 1) {
    for (let i = 0; i < pinBatch.value; i++) batchResults.value.push(makeOne())
    password.value = batchResults.value[0]
  } else {
    password.value = makeOne()
  }
}

// 基于熵的强度评估（更准确）
const entropyBits = computed(() => {
  const pwd = password.value
  if (!pwd) return 0
  // 估算当前字符集大小
  let charset = buildCharset()
  if (!charset) charset = LOWER + UPPER + NUMBERS
  const bits = Math.round(pwd.length * Math.log2(charset.length))
  return bits
})

const strengthPct = computed(() => {
  const e = entropyBits.value
  if (!e) return 0
  // 0-28 弱, 28-60 中, 60-128 强
  return Math.min(100, Math.round((e / 128) * 100))
})

const strengthText = computed(() => {
  const e = entropyBits.value
  if (!e) return ''
  if (e < 28) return '弱'
  if (e < 60) return '中等'
  if (e < 90) return '强'
  return '极强'
})

const strengthColor = computed(() => {
  const e = entropyBits.value
  if (e < 28) return '#f56c6c'
  if (e < 60) return '#e6a23c'
  if (e < 90) return '#67c23a'
  return '#409eff'
})

async function copy(text) {
  if (!text) return
  const ok = await copyText(text)
  ok ? ElMessage.success('已复制到剪贴板') : ElMessage.error('复制失败，请手动复制')
}

async function copyAllBatch() {
  if (!batchResults.value.length) return
  const ok = await copyText(batchResults.value.join('\n'))
  ok ? ElMessage.success('已复制全部') : ElMessage.error('复制失败')
}

// 初始生成
generate()
</script>

<style scoped>
.pwd-generator { display: flex; flex-direction: column; gap: 20px; }
.pwd-result { display: flex; flex-direction: column; gap: 12px; }
.pwd-input :deep(.el-input__inner) { font-family: ui-monospace, 'Courier New', monospace; font-size: 18px; letter-spacing: 1px; }
.pwd-strength { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.strength-label { font-size: 13px; color: var(--color-text-secondary, #909399); }
.entropy { font-size: 12px; color: var(--color-text-secondary, #909399); }
.pwd-options { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
.generate-btn { min-width: 140px; }
.batch-list { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #ebeef5); border-radius: 8px; padding: 12px; }
.batch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; color: var(--color-text-secondary, #909399); }
.batch-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px dashed var(--color-border, #ebeef5); }
.batch-row:last-child { border-bottom: none; }
.batch-num { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--color-primary-light, #ecf5ff); color: var(--color-primary, #409eff); border-radius: 50%; font-size: 12px; flex-shrink: 0; }
.batch-val { flex: 1; font-family: ui-monospace, 'Courier New', monospace; font-size: 14px; color: var(--color-text-primary, #303133); word-break: break-all; }
@media (max-width: 768px) { .pwd-options { grid-template-columns: 1fr; } }
</style>
