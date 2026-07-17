<template>
  <ToolLayout title="文本对比" desc="免费在线文本对比工具，逐行比较两段文本差异，高亮显示新增/删除/修改行，本地处理。">
    <div class="text-diff">
      <div class="input-row">
        <div class="io-panel">
          <label class="config-title">原始文本</label>
          <el-input v-model="text1" type="textarea" :rows="10" placeholder="粘贴原始文本" />
        </div>
        <div class="io-panel">
          <label class="config-title">修改后文本</label>
          <el-input v-model="text2" type="textarea" :rows="10" placeholder="粘贴修改后文本" />
        </div>
      </div>

      <div class="action-bar">
        <el-button type="primary" @click="compare" :disabled="!text1 && !text2">对比</el-button>
        <el-button @click="clear">清空</el-button>
      </div>

      <!-- 对比结果 -->
      <div v-if="diffResult.length" class="diff-result">
        <div class="diff-summary">
          <el-tag type="success" size="small">新增 {{ stats.added }} 行</el-tag>
          <el-tag type="danger" size="small">删除 {{ stats.removed }} 行</el-tag>
          <el-tag type="info" size="small">相同 {{ stats.same }} 行</el-tag>
        </div>
        <div class="diff-list">
          <div v-for="(line, i) in diffResult" :key="i" class="diff-line" :class="'diff-' + line.type">
            <span class="line-num">{{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}</span>
            <span class="line-content">{{ line.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'

const text1 = ref('')
const text2 = ref('')
const diffResult = ref([])

const stats = computed(() => {
  return {
    added: diffResult.value.filter((l) => l.type === 'added').length,
    removed: diffResult.value.filter((l) => l.type === 'removed').length,
    same: diffResult.value.filter((l) => l.type === 'same').length
  }
})

/** 简单的逐行对比（LCS算法简化版） */
function compare() {
  const lines1 = text1.value.split('\n')
  const lines2 = text2.value.split('\n')
  const result = []

  // 使用简单的 LCS（最长公共子序列）算法
  const m = lines1.length, n = lines2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // 回溯生成 diff
  let i = m, j = n
  const temp = []
  while (i > 0 && j > 0) {
    if (lines1[i - 1] === lines2[j - 1]) {
      temp.unshift({ type: 'same', text: lines1[i - 1] })
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      temp.unshift({ type: 'removed', text: lines1[i - 1] })
      i--
    } else {
      temp.unshift({ type: 'added', text: lines2[j - 1] })
      j--
    }
  }
  while (i > 0) { temp.unshift({ type: 'removed', text: lines1[i - 1] }); i-- }
  while (j > 0) { temp.unshift({ type: 'added', text: lines2[j - 1] }); j-- }

  diffResult.value = temp
}

function clear() {
  text1.value = ''
  text2.value = ''
  diffResult.value = []
}
</script>

<style scoped>
.text-diff { display: flex; flex-direction: column; gap: 16px; }
.input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.action-bar { display: flex; gap: 8px; }
.diff-result { display: flex; flex-direction: column; gap: 12px; }
.diff-summary { display: flex; gap: 8px; }
.diff-list { border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden; font-family: 'Courier New', monospace; font-size: 13px; }
.diff-line { display: flex; padding: 2px 8px; }
.line-num { width: 20px; flex-shrink: 0; color: #909399; }
.line-content { white-space: pre-wrap; word-break: break-all; }
.diff-same { background: #f5f7fa; }
.diff-added { background: #f0f9eb; }
.diff-removed { background: #fef0f0; }
.diff-added .line-num { color: #67c23a; }
.diff-removed .line-num { color: #f56c6c; }
@media (max-width: 768px) { .input-row { grid-template-columns: 1fr; } }
</style>
