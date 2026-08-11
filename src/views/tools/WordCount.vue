<template>
  <ToolLayout
    title="字数统计"
    desc="免费在线字数统计工具，支持中英文字符、单词、行数、字节数、标点、词频与阅读时长估算，实时计算，本地处理。"
    fav-key="word-count"
  >
    <div class="word-count">
      <div class="io-panel">
        <div class="panel-header">
          <span class="panel-title">文本内容</span>
          <span class="panel-hint">{{ stats.bytes }} 字节 (UTF-8)</span>
        </div>
        <el-input
          v-model="text"
          type="textarea"
          :rows="9"
          placeholder="粘贴或输入文本，自动统计字数..."
        />
      </div>

      <!-- 基础统计 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.chars) }}</div>
          <div class="stat-label">总字符数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.charsNoSpace) }}</div>
          <div class="stat-label">不含空格</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.chinese) }}</div>
          <div class="stat-label">中文字数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.words) }}</div>
          <div class="stat-label">英文单词</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.lines) }}</div>
          <div class="stat-label">行数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.paragraphs) }}</div>
          <div class="stat-label">段落数</div>
        </div>
      </div>

      <!-- 扩展统计 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.bytes) }}</div>
          <div class="stat-label">UTF-8 字节</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.cnPunct) }}</div>
          <div class="stat-label">中文标点</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.enPunct) }}</div>
          <div class="stat-label">英文标点</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.numbers) }}</div>
          <div class="stat-label">数字串</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatNum(stats.digits) }}</div>
          <div class="stat-label">数字字符</div>
        </div>
        <div class="stat-card reading-card">
          <div class="stat-value">{{ stats.readTime }}</div>
          <div class="stat-label">预估阅读时长</div>
        </div>
      </div>

      <!-- 词频统计 -->
      <div v-if="topWords.length" class="freq-section">
        <div class="section-title">词频统计 Top {{ topWords.length }}</div>
        <div class="freq-bars">
          <div v-for="(w, i) in topWords" :key="i" class="freq-row">
            <span class="freq-rank">{{ i + 1 }}</span>
            <span class="freq-word">{{ w.word }}</span>
            <div class="freq-bar-track">
              <div class="freq-bar" :style="{ width: barWidth(w.count) }"></div>
            </div>
            <span class="freq-count">{{ w.count }}</span>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <el-button @click="text = ''" :disabled="!text">清空</el-button>
        <el-button type="primary" :icon="CopyDocument" @click="copyStats" :disabled="!text">复制统计结果</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText, formatNumber } from '@/utils/format'

const text = ref('')

// 中文字符范围（基本区 + 扩展 A 区），支持撇号不被拆分的英文单词
const RE_CHINESE = /[\u4e00-\u9fff\u3400-\u4dbf]/g
const RE_WORD = /[a-zA-Z]+(?:'[a-zA-Z]+)*/g
const RE_NUMBER = /\d+/g
const RE_CNPUNCT = /[，。、；：？！“”‘’《》（）【】〈〉…—～「」『』、]/g
const RE_ENPUNCT = /[.,;:!?"'()[\]{}<>\\/-]/g

function formatNum(n) {
  return formatNumber(n || 0)
}

const stats = computed(() => {
  const t = text.value
  if (!t) {
    return {
      chars: 0, charsNoSpace: 0, chinese: 0, words: 0, lines: 0, paragraphs: 0,
      bytes: 0, cnPunct: 0, enPunct: 0, numbers: 0, digits: 0, readTime: '0 秒'
    }
  }

  const chars = t.length
  const charsNoSpace = t.replace(/\s/g, '').length
  const chinese = (t.match(RE_CHINESE) || []).length
  const words = (t.match(RE_WORD) || []).length
  const lines = t.split('\n').length
  const paragraphs = t.split(/\n\s*\n/).filter((s) => s.trim()).length
  const bytes = new TextEncoder().encode(t).length
  const cnPunct = (t.match(RE_CNPUNCT) || []).length
  const enPunct = (t.match(RE_ENPUNCT) || []).length
  const numMatches = t.match(RE_NUMBER) || []
  const numbers = numMatches.length
  const digits = numMatches.reduce((s, m) => s + m.length, 0)

  // 阅读时长：中文约 300 字/分，英文约 200 词/分
  const minutes = chinese / 300 + words / 200
  let readTime = '0 秒'
  if (minutes > 0) {
    const totalSec = Math.round(minutes * 60)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    readTime = m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`
  }

  return { chars, charsNoSpace, chinese, words, lines, paragraphs, bytes, cnPunct, enPunct, numbers, digits, readTime }
})

// 词频统计：英文按词、中文按 2 字滑动窗口，合并后取 Top 10
const freqMap = computed(() => {
  const t = text.value
  const map = new Map()
  if (!t) return map

  // 英文单词
  const enWords = t.match(RE_WORD) || []
  for (const w of enWords) {
    const lw = w.toLowerCase()
    map.set(lw, (map.get(lw) || 0) + 1)
  }

  // 中文 2 字滑动窗口（仅连续中文之间）
  const zhChars = []
  for (const ch of t) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(ch)) zhChars.push(ch)
  }
  for (let i = 0; i < zhChars.length - 1; i++) {
    const pair = zhChars[i] + zhChars[i + 1]
    map.set(pair, (map.get(pair) || 0) + 1)
  }

  return map
})

const topWords = computed(() => {
  const entries = [...freqMap.value.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
  return entries.slice(0, 10).map(([word, count]) => ({ word, count }))
})

function barWidth(count) {
  const max = topWords.value[0]?.count || 1
  return Math.max(6, Math.round((count / max) * 100)) + '%'
}

async function copyStats() {
  if (!text.value) return
  const s = stats.value
  const lines = [
    `总字符数：${s.chars}`,
    `不含空格：${s.charsNoSpace}`,
    `中文字数：${s.chinese}`,
    `英文单词：${s.words}`,
    `行数：${s.lines}`,
    `段落数：${s.paragraphs}`,
    `UTF-8 字节：${s.bytes}`,
    `中文标点：${s.cnPunct}`,
    `英文标点：${s.enPunct}`,
    `数字串：${s.numbers}`,
    `数字字符：${s.digits}`,
    `预估阅读时长：${s.readTime}`
  ]
  if (topWords.value.length) {
    lines.push('', '词频 Top ' + topWords.value.length + '：')
    topWords.value.forEach((w, i) => lines.push(`${i + 1}. ${w.word}  ${w.count}`))
  }
  const ok = await copyText(lines.join('\n'))
  ok ? ElMessage.success('已复制统计结果') : ElMessage.error('复制失败，请手动复制')
}
</script>

<style scoped>
.word-count { display: flex; flex-direction: column; gap: 18px; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.panel-hint { font-size: 12px; color: var(--color-text-secondary, #909399); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.stat-card {
  text-align: center;
  padding: 16px 8px;
  background: var(--color-bg, #f5f7fa);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  transition: box-shadow 0.2s;
}
.stat-card:hover { box-shadow: var(--shadow-hover); }
.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-primary, #409eff);
  line-height: 1.2;
}
.stat-label { font-size: 12px; color: var(--color-text-secondary, #909399); margin-top: 4px; }
.reading-card .stat-value { font-size: 18px; }

.freq-section { display: flex; flex-direction: column; gap: 10px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary, #303133); }
.freq-bars { display: flex; flex-direction: column; gap: 6px; }
.freq-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 6px;
}
.freq-rank {
  width: 22px; height: 22px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
  background: var(--color-primary, #409eff);
  border-radius: 50%;
}
.freq-word {
  min-width: 80px;
  font-family: 'Courier New', Consolas, monospace;
  font-weight: 600;
  color: var(--color-text-primary, #303133);
  word-break: break-all;
}
.freq-bar-track {
  flex: 1; height: 8px;
  background: var(--color-bg, #f5f7fa);
  border-radius: 4px; overflow: hidden;
}
.freq-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary, #409eff), #67c23a);
  border-radius: 4px;
}
.freq-count {
  min-width: 36px; text-align: right;
  font-size: 13px; font-weight: 600;
  color: var(--color-text-regular, #606266);
}

.action-bar { display: flex; gap: 12px; flex-wrap: wrap; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
}
</style>
