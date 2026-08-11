<template>
  <ToolLayout
    title="Base64 编解码"
    desc="免费在线 Base64 编码与解码工具，支持 UTF-8 中文、URL-safe、Hex、MIME 换行格式，本地运行安全可靠。"
    fav-key="base64"
  >
    <div class="base64-tool">
      <div class="action-bar">
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="encode">编码</el-radio-button>
          <el-radio-button value="decode">解码</el-radio-button>
        </el-radio-group>
        <el-button :icon="Sort" size="small" @click="swap" :disabled="!output">输入输出互换</el-button>
        <div class="spacer"></div>
        <el-radio-group v-model="variant" size="small" :disabled="mode === 'decode'">
          <el-radio-button value="standard">标准</el-radio-button>
          <el-radio-button value="urlsafe">URL-safe</el-radio-button>
          <el-radio-button value="hex">Hex</el-radio-button>
        </el-radio-group>
        <el-checkbox v-model="mimeWrap" :disabled="mode === 'decode' || variant === 'hex'">76 字符换行(MIME)</el-checkbox>
        <el-button @click="clear" :disabled="!input" size="small">清空</el-button>
      </div>

      <div class="tool-row">
        <!-- 输入 -->
        <div class="io-panel">
          <div class="panel-header">
            <span class="panel-title">输入</span>
            <span class="panel-hint">{{ inputBytes }} 字节</span>
          </div>
          <el-input
            v-model="input"
            type="textarea"
            :rows="10"
            :placeholder="mode === 'encode' ? '输入要编码的文本（支持中文、Emoji）' : '输入要解码的 Base64 / Hex 字符串'"
          />
        </div>

        <!-- 输出 -->
        <div class="io-panel">
          <div class="panel-header">
            <span class="panel-title">输出</span>
            <el-button :icon="CopyDocument" size="small" @click="copyOutput" :disabled="!output">复制</el-button>
          </div>
          <el-input
            v-model="output"
            type="textarea"
            :rows="10"
            readonly
            placeholder="结果将自动显示"
          />
        </div>
      </div>

      <div v-if="error" class="error-msg">
        <el-alert :title="error" type="error" show-icon :closable="false" />
      </div>

      <p class="tool-tip">
        提示：标准 Base64 使用 <code>+/</code>；URL-safe 替换为 <code>-_</code>（URL/文件名安全）；Hex 输出十六进制串。MIME 换行按 RFC 2045 每 76 字符断行，适合邮件/证书。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Sort } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const mode = ref('encode')
const input = ref('')
const variant = ref('standard') // standard | urlsafe | hex
const mimeWrap = ref(false)
const error = ref('')

const inputBytes = computed(() => {
  if (!input.value) return 0
  return new TextEncoder().encode(input.value).length
})

// 统一用 TextEncoder/TextDecoder 处理 UTF-8，替代已废弃的 escape/unescape
function bytesToBase64(bytes) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  let b64 = btoa(bin)
  if (variant.value === 'urlsafe') {
    b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return b64
}

function base64ToBytes(b64) {
  // 自动识别 url-safe 并还原
  let s = b64.trim().replace(/-/g, '+').replace(/_/g, '/')
  // 补齐 padding
  const pad = s.length % 4
  if (pad) s += '='.repeat(4 - pad)
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function wrapMime(b64) {
  if (!mimeWrap.value) return b64
  return b64.match(/.{1,76}/g).join('\r\n')
}

const output = computed(() => {
  if (!input.value) {
    error.value = ''
    return ''
  }
  try {
    error.value = ''
    if (mode.value === 'encode') {
      const bytes = new TextEncoder().encode(input.value)
      if (variant.value === 'hex') {
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      }
      return wrapMime(bytesToBase64(bytes))
    } else {
      // 解码：自动识别 hex 或 base64
      const trimmed = input.value.trim()
      if (/^[0-9a-fAF\s]+$/.test(trimmed) && trimmed.length % 2 === 0 && variant.value === 'hex') {
        const hex = trimmed.replace(/\s+/g, '')
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
        return new TextDecoder().decode(bytes)
      }
      const bytes = base64ToBytes(input.value)
      return new TextDecoder().decode(bytes)
    }
  } catch (e) {
    error.value = mode.value === 'encode'
      ? '编码失败：输入包含无法处理的字符'
      : '解码失败：不是有效的 Base64 / Hex 字符串'
    return ''
  }
})

function swap() {
  if (!output.value) return
  input.value = output.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}

function clear() {
  input.value = ''
  error.value = ''
}

async function copyOutput() {
  if (!output.value) return
  const ok = await copyText(output.value)
  ok ? ElMessage.success('已复制到剪贴板') : ElMessage.error('复制失败，请手动复制')
}
</script>

<style scoped>
.base64-tool { display: flex; flex-direction: column; gap: 16px; }
.action-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.spacer { flex: 1; }
.tool-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.panel-hint { font-size: 12px; color: var(--color-text-secondary, #909399); }
.error-msg { margin-top: 8px; }
.tool-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; line-height: 1.6; }
.tool-tip code { background: var(--color-primary-light, #ecf5ff); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
@media (max-width: 768px) { .tool-row { grid-template-columns: 1fr; } }
</style>
