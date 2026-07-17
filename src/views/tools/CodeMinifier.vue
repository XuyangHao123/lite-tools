<template>
  <ToolLayout title="代码压缩" desc="免费在线HTML/CSS/JS代码压缩工具，去除注释和多余空格，减小文件体积，本地处理。">
    <div class="code-minifier">
      <!-- 类型选择 -->
      <el-radio-group v-model="lang" class="lang-tabs">
        <el-radio-button value="html">HTML</el-radio-button>
        <el-radio-button value="css">CSS</el-radio-button>
        <el-radio-button value="js">JavaScript</el-radio-button>
      </el-radio-group>

      <!-- 输入 -->
      <div class="io-panel">
        <label class="config-title">输入代码</label>
        <el-input v-model="input" type="textarea" :rows="10" :placeholder="`粘贴 ${lang.toUpperCase()} 代码`" class="code-input" />
      </div>

      <!-- 选项 -->
      <div class="options-row">
        <el-checkbox v-model="removeComments">移除注释</el-checkbox>
        <el-checkbox v-model="removeWhitespace">移除多余空格</el-checkbox>
      </div>

      <!-- 操作 -->
      <div class="action-bar">
        <el-button type="primary" @click="minify" :disabled="!input">压缩</el-button>
        <el-button @click="copyOutput" :disabled="!output" :icon="CopyDocument">复制结果</el-button>
        <el-button @click="clear" :disabled="!input && !output">清空</el-button>
      </div>

      <!-- 输出 -->
      <div class="io-panel" v-if="output">
        <div class="output-header">
          <label class="config-title">压缩结果</label>
          <div class="size-compare">
            <el-tag size="small" type="info">{{ formatSize(input.length) }}</el-tag>
            <el-icon><Right /></el-icon>
            <el-tag size="small" type="success">{{ formatSize(output.length) }}</el-tag>
            <el-tag v-if="reduction > 0" size="small" type="success">-{{ reduction }}%</el-tag>
          </div>
        </div>
        <el-input v-model="output" type="textarea" :rows="6" readonly class="code-input" />
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Right } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

const lang = ref('html')
const input = ref('')
const output = ref('')
const removeComments = ref(true)
const removeWhitespace = ref(true)

const reduction = computed(() => {
  if (!input.value || !output.value) return 0
  return Math.max(0, Math.round((1 - output.value.length / input.value.length) * 100))
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

function minify() {
  if (!input.value) return
  let result = input.value

  if (lang.value === 'html') {
    if (removeComments.value) result = result.replace(/<!--[\s\S]*?-->/g, '')
    if (removeWhitespace.value) {
      result = result.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '').trim()
    }
  } else if (lang.value === 'css') {
    if (removeComments.value) result = result.replace(/\/\*[\s\S]*?\*\//g, '')
    if (removeWhitespace.value) {
      result = result.replace(/\s*([{}:;,])\s*/g, '$1').replace(/;\s*}/g, '}').replace(/\s{2,}/g, ' ').trim()
    }
  } else if (lang.value === 'js') {
    if (removeComments.value) {
      // 移除单行注释（但不是URL中的 //）
      result = result.replace(/\/\/[^\n]*/g, (m) => m.includes('http') ? m : '')
      // 移除多行注释
      result = result.replace(/\/\*[\s\S]*?\*\//g, '')
    }
    if (removeWhitespace.value) {
      result = result.replace(/\s{2,}/g, ' ').replace(/\s*([=+\-*/{}();,:])\s*/g, '$1').trim()
    }
  }

  output.value = result
  ElMessage.success('压缩完成')
}

async function copyOutput() {
  if (!output.value) return
  try { await navigator.clipboard.writeText(output.value); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}

function clear() { input.value = ''; output.value = '' }
</script>

<style scoped>
.code-minifier { display: flex; flex-direction: column; gap: 16px; }
.lang-tabs { flex-wrap: wrap; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.code-input :deep(textarea) { font-family: 'Courier New', Consolas, monospace; font-size: 13px; }
.options-row { display: flex; gap: 16px; }
.action-bar { display: flex; gap: 8px; }
.output-header { display: flex; align-items: center; justify-content: space-between; }
.size-compare { display: flex; align-items: center; gap: 4px; }
</style>
