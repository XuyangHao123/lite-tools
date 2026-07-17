<template>
  <ToolLayout title="字数统计" desc="免费在线字数统计工具，支持中英文字符、单词、行数统计，实时计算，本地处理。">
    <div class="word-count">
      <el-input v-model="text" type="textarea" :rows="10" placeholder="粘贴或输入文本，自动统计字数..." />

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.chars }}</div>
          <div class="stat-label">总字符数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.charsNoSpace }}</div>
          <div class="stat-label">不含空格</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.chinese }}</div>
          <div class="stat-label">中文字数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.words }}</div>
          <div class="stat-label">英文单词</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.lines }}</div>
          <div class="stat-label">行数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.paragraphs }}</div>
          <div class="stat-label">段落数</div>
        </div>
      </div>

      <div class="action-bar">
        <el-button @click="text = ''">清空</el-button>
        <el-button @click="copyStats">复制统计结果</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import ToolLayout from '@/components/ToolLayout.vue'

const text = ref('')

const stats = computed(() => {
  const t = text.value
  if (!t) return { chars: 0, charsNoSpace: 0, chinese: 0, words: 0, lines: 0, paragraphs: 0 }

  const chars = t.length
  const charsNoSpace = t.replace(/\s/g, '').length
  const chinese = (t.match(/[\u4e00-\u9fa5]/g) || []).length
  const words = (t.match(/[a-zA-Z]+/g) || []).length
  const lines = t.split('\n').length
  const paragraphs = t.split(/\n\s*\n/).filter((s) => s.trim()).length

  return { chars, charsNoSpace, chinese, words, lines, paragraphs }
})

async function copyStats() {
  const s = stats.value
  const result = `总字符数：${s.chars}\n不含空格：${s.charsNoSpace}\n中文字数：${s.chinese}\n英文单词：${s.words}\n行数：${s.lines}\n段落数：${s.paragraphs}`
  try {
    await navigator.clipboard.writeText(result)
    ElMessage.success('已复制统计结果')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.word-count { display: flex; flex-direction: column; gap: 20px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.stat-card { text-align: center; padding: 16px 8px; background: #f5f7fa; border-radius: 8px; }
.stat-value { font-size: 28px; font-weight: 800; color: #409eff; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }
.action-bar { display: flex; gap: 12px; }
</style>
