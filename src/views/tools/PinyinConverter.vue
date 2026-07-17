<template>
  <ToolLayout title="汉字转拼音" desc="免费在线汉字转拼音工具，支持声调、首字母、多音字，本地处理不上传。">
    <div class="pinyin-tool">
      <div class="config-section">
        <label class="config-title">输入汉字</label>
        <el-input v-model="text" type="textarea" :rows="6" placeholder="输入要转换的汉字" />
      </div>

      <div class="config-section">
        <label class="config-title">输出格式</label>
        <el-radio-group v-model="mode">
          <el-radio-button value="tone">带声调</el-radio-button>
          <el-radio-button value="none">无声调</el-radio-button>
          <el-radio-button value="initial">首字母</el-radio-button>
        </el-radio-group>
      </div>

      <div class="config-section">
        <el-checkbox v-model="upperCase">大写</el-checkbox>
        <el-checkbox v-model="addSpace">字间加空格</el-checkbox>
      </div>

      <div class="action-bar">
        <el-button type="primary" :icon="CopyDocument" @click="copyResult" :disabled="!result">复制结果</el-button>
        <el-button @click="text = ''" :disabled="!text">清空</el-button>
      </div>

      <!-- 结果 -->
      <div v-if="result" class="result-section">
        <label class="config-title">拼音结果</label>
        <div class="result-box">{{ result }}</div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { pinyin } from 'pinyin-pro'
import ToolLayout from '@/components/ToolLayout.vue'

const text = ref('')
const mode = ref('tone')
const upperCase = ref(false)
const addSpace = ref(true)

const result = computed(() => {
  if (!text.value) return ''
  let opts = {}
  if (mode.value === 'tone') opts.toneType = 'num'
  else if (mode.value === 'none') opts.toneType = 'none'
  else if (mode.value === 'initial') opts.pattern = 'first'

  let result = pinyin(text.value, opts)
  if (mode.value === 'initial') {
    result = result.replace(/\s/g, '')
  } else if (!addSpace.value) {
    result = result.replace(/\s/g, '')
  }
  if (upperCase.value) result = result.toUpperCase()
  return result
})

async function copyResult() {
  if (!result.value) return
  try { await navigator.clipboard.writeText(result.value); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.pinyin-tool { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.action-bar { display: flex; gap: 12px; }
.result-section { display: flex; flex-direction: column; gap: 8px; }
.result-box { padding: 16px; background: #f5f7fa; border-radius: 8px; font-size: 18px; line-height: 1.8; color: #303133; word-break: break-all; }
</style>
