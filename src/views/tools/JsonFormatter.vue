<template>
  <ToolLayout title="JSON 格式化" desc="免费在线 JSON 格式化、压缩、校验工具，支持错误定位，开发者必备。">
    <div class="json-tool">
      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button type="primary" @click="format" :disabled="!input">格式化</el-button>
        <el-button @click="minify" :disabled="!input">压缩</el-button>
        <el-button @click="validate" :disabled="!input">校验</el-button>
        <el-button @click="copyOutput" :disabled="!output" :icon="CopyDocument">复制</el-button>
        <el-button @click="clear">清空</el-button>
        <div class="indent-control">
          <span class="indent-label">缩进</span>
          <el-input-number v-model="indent" :min="1" :max="8" size="small" controls-position="right" />
        </div>
      </div>

      <!-- 输入输出 -->
      <div class="io-row">
        <div class="io-panel">
          <div class="panel-title">输入 JSON</div>
          <el-input
            v-model="input"
            type="textarea"
            :rows="16"
            placeholder='粘贴 JSON 文本，如 {"name":"test","value":123}'
            class="json-input"
          />
        </div>
        <div class="io-panel">
          <div class="panel-title">输出结果</div>
          <el-input
            v-model="output"
            type="textarea"
            :rows="16"
            readonly
            placeholder="格式化结果将显示在此"
            class="json-output"
          />
        </div>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
      />
      <el-alert
        v-if="successMsg"
        :title="successMsg"
        type="success"
        show-icon
        :closable="false"
      />

      <p class="tool-tip">
        提示：格式化使 JSON 更易读，压缩去除空格减小体积。所有操作在浏览器本地完成。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

const input = ref('')
const output = ref('')
const error = ref('')
const successMsg = ref('')
const indent = ref(2)

function clearMessages() {
  error.value = ''
  successMsg.value = ''
}

/** 格式化 */
function format() {
  clearMessages()
  if (!input.value.trim()) return
  try {
    const parsed = JSON.parse(input.value)
    output.value = JSON.stringify(parsed, null, indent.value)
    successMsg.value = '格式化成功'
  } catch (e) {
    error.value = `JSON 解析错误：${e.message}`
  }
}

/** 压缩 */
function minify() {
  clearMessages()
  if (!input.value.trim()) return
  try {
    const parsed = JSON.parse(input.value)
    output.value = JSON.stringify(parsed)
    successMsg.value = '压缩成功'
  } catch (e) {
    error.value = `JSON 解析错误：${e.message}`
  }
}

/** 校验 */
function validate() {
  clearMessages()
  if (!input.value.trim()) return
  try {
    JSON.parse(input.value)
    successMsg.value = '✓ JSON 格式正确'
  } catch (e) {
    error.value = `JSON 解析错误：${e.message}`
  }
}

async function copyOutput() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

function clear() {
  input.value = ''
  output.value = ''
  clearMessages()
}
</script>

<style scoped>
.json-tool {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.indent-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.indent-label {
  font-size: 13px;
  color: #606266;
}

.io-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.io-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.json-input :deep(textarea),
.json-output :deep(textarea) {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
}

.tool-tip {
  font-size: 12px;
  color: #c0c4cc;
  margin: 0;
}

@media (max-width: 768px) {
  .io-row {
    grid-template-columns: 1fr;
  }

  .indent-control {
    margin-left: 0;
  }
}
</style>
