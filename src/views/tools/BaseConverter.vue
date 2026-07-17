<template>
  <ToolLayout title="进制转换" desc="免费在线进制转换工具，支持二进制/八进制/十进制/十六进制互转，实时计算，本地处理。">
    <div class="base-converter">
      <div v-for="base in bases" :key="base.value" class="convert-row">
        <div class="base-label">
          <el-tag :type="base.tag" size="large">{{ base.label }}</el-tag>
        </div>
        <el-input
          v-model="base.input"
          size="large"
          :placeholder="`输入${base.label}数值`"
          class="base-input"
          @input="(val) => onInput(base, val)"
        />
      </div>

      <div v-if="error" class="error-msg"><el-alert :title="error" type="error" show-icon :closable="false" /></div>

      <div class="tips">
        <p class="tip">支持进制：二进制(2)、八进制(8)、十进制(10)、十六进制(16)</p>
        <p class="tip">在任意输入框输入数值，其他进制自动同步</p>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'

const error = ref('')

const bases = ref([
  { value: 2, label: '二进制 BIN', tag: 'primary', input: '' },
  { value: 8, label: '八进制 OCT', tag: 'success', input: '' },
  { value: 10, label: '十进制 DEC', tag: 'warning', input: '' },
  { value: 16, label: '十六进制 HEX', tag: 'danger', input: '' }
])

function onInput(base, val) {
  val = val.trim()
  if (!val) {
    bases.value.forEach((b) => { if (b.value !== base.value) b.input = '' })
    error.value = ''
    return
  }

  // 验证输入合法性
  const validChars = base.value === 2 ? /^[01]+$/
    : base.value === 8 ? /^[0-7]+$/
    : base.value === 10 ? /^\d+$/
    : /^[0-9a-fA-F]+$/

  if (!validChars.test(val)) {
    error.value = `${base.label}输入无效：包含非法字符`
    return
  }
  error.value = ''

  // 转为十进制
  const decimal = parseInt(val, base.value)
  if (isNaN(decimal)) {
    error.value = '转换失败：数值超出范围'
    return
  }

  // 同步其他进制
  bases.value.forEach((b) => {
    if (b.value !== base.value) {
      b.input = decimal.toString(b.value).toUpperCase()
    }
  })
}
</script>

<style scoped>
.base-converter { display: flex; flex-direction: column; gap: 16px; }
.convert-row { display: flex; align-items: center; gap: 12px; }
.base-label { width: 140px; flex-shrink: 0; }
.base-input { flex: 1; }
.base-input :deep(input) { font-family: 'Courier New', monospace; font-size: 16px; }
.error-msg { margin-top: 4px; }
.tips { margin-top: 8px; }
.tip { font-size: 12px; color: #c0c4cc; margin: 4px 0; }
@media (max-width: 768px) {
  .convert-row { flex-direction: column; align-items: stretch; }
  .base-label { width: auto; }
}
</style>
