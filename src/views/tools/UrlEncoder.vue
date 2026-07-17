<template>
  <ToolLayout title="URL 编解码" desc="免费在线URL编码与解码工具，支持encodeURI/encodeURIComponent，本地处理。">
    <div class="url-tool">
      <div class="tool-row">
        <div class="io-panel">
          <div class="panel-header">
            <span class="panel-title">输入</span>
            <el-radio-group v-model="mode" size="small">
              <el-radio-button value="encode">编码</el-radio-button>
              <el-radio-button value="decode">解码</el-radio-button>
            </el-radio-group>
          </div>
          <el-input v-model="input" type="textarea" :rows="6" :placeholder="mode === 'encode' ? '输入要编码的URL或文本' : '输入要解码的URL编码字符串'" />
        </div>
        <div class="io-panel">
          <div class="panel-header">
            <span class="panel-title">输出</span>
            <el-button :icon="CopyDocument" size="small" @click="copyOutput" :disabled="!output">复制</el-button>
          </div>
          <el-input v-model="output" type="textarea" :rows="6" readonly placeholder="结果将自动显示" />
        </div>
      </div>

      <div v-if="error" class="error-msg"><el-alert :title="error" type="error" show-icon :closable="false" /></div>

      <div class="encode-type" v-if="mode === 'encode'">
        <el-radio-group v-model="encodeType" size="small">
          <el-radio-button value="encodeURIComponent">encodeURIComponent（推荐）</el-radio-button>
          <el-radio-button value="encodeURI">encodeURI（保留特殊字符）</el-radio-button>
        </el-radio-group>
      </div>

      <p class="tool-tip">提示：encodeURIComponent 用于编码参数值，encodeURI 用于编码完整URL。</p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

const input = ref('')
const mode = ref('encode')
const encodeType = ref('encodeURIComponent')
const error = ref('')

const output = computed(() => {
  if (!input.value) { error.value = ''; return '' }
  try {
    error.value = ''
    if (mode.value === 'encode') {
      return encodeType.value === 'encodeURIComponent'
        ? encodeURIComponent(input.value)
        : encodeURI(input.value)
    } else {
      return decodeURIComponent(input.value)
    }
  } catch (e) {
    error.value = '解码失败：不是有效的URL编码字符串'
    return ''
  }
})

async function copyOutput() {
  if (!output.value) return
  try { await navigator.clipboard.writeText(output.value); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.url-tool { display: flex; flex-direction: column; gap: 16px; }
.tool-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title { font-size: 14px; font-weight: 600; color: #303133; }
.error-msg { margin-top: 8px; }
.encode-type { display: flex; }
.tool-tip { font-size: 12px; color: #c0c4cc; margin: 0; }
@media (max-width: 768px) { .tool-row { grid-template-columns: 1fr; } }
</style>
