<template>
  <ToolLayout title="Base64 编解码" desc="免费在线 Base64 编码与解码工具，支持文本双向转换，本地运行安全可靠。">
    <div class="base64-tool">
      <div class="tool-row">
        <!-- 输入 -->
        <div class="io-panel">
          <div class="panel-header">
            <span class="panel-title">输入</span>
            <el-radio-group v-model="mode" size="small">
              <el-radio-button value="encode">编码</el-radio-button>
              <el-radio-button value="decode">解码</el-radio-button>
            </el-radio-group>
          </div>
          <el-input
            v-model="input"
            type="textarea"
            :rows="8"
            :placeholder="mode === 'encode' ? '输入要编码的文本' : '输入要解码的 Base64 字符串'"
          />
        </div>

        <!-- 输出 -->
        <div class="io-panel">
          <div class="panel-header">
            <span class="panel-title">输出</span>
            <el-button :icon="CopyDocument" size="small" @click="copyOutput" :disabled="!output">
              复制
            </el-button>
          </div>
          <el-input
            v-model="output"
            type="textarea"
            :rows="8"
            readonly
            placeholder="结果将自动显示"
          />
        </div>
      </div>

      <div v-if="error" class="error-msg">
        <el-alert :title="error" type="error" show-icon :closable="false" />
      </div>

      <p class="tool-tip">
        提示：编码将文本转为 Base64 格式，解码则反向还原。支持中文（UTF-8）。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

const mode = ref('encode')
const input = ref('')
const error = ref('')

const output = computed(() => {
  if (!input.value) {
    error.value = ''
    return ''
  }
  try {
    error.value = ''
    if (mode.value === 'encode') {
      // 支持 UTF-8 中文编码
      return btoa(unescape(encodeURIComponent(input.value)))
    } else {
      return decodeURIComponent(escape(atob(input.value.trim())))
    }
  } catch (e) {
    error.value = mode.value === 'encode'
      ? '编码失败：输入包含无法处理的字符'
      : '解码失败：不是有效的 Base64 字符串'
    return ''
  }
})

async function copyOutput() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<style scoped>
.base64-tool {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tool-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.io-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.error-msg {
  margin-top: 8px;
}

.tool-tip {
  font-size: 12px;
  color: #c0c4cc;
  margin: 0;
}

@media (max-width: 768px) {
  .tool-row {
    grid-template-columns: 1fr;
  }
}
</style>
