<template>
  <ToolLayout
    title="时间戳转换"
    desc="免费在线 Unix 时间戳转换工具，支持时间戳与日期互转、时区切换、批量转换、RFC 2822/3339 格式输出，本地处理。"
    fav-key="timestamp-converter"
  >
    <div class="timestamp-tool">
      <!-- 时区选择 -->
      <div class="tz-row">
        <span class="tz-label">时区：</span>
        <el-select v-model="timezone" size="default" class="tz-select" filterable>
          <el-option
            v-for="tz in timezones"
            :key="tz.value"
            :label="tz.label"
            :value="tz.value"
          />
        </el-select>
        <el-button text :icon="CopyDocument" @click="copyVal(dateResult?.local || '')" :disabled="!dateResult" size="small">复制当前时区结果</el-button>
      </div>

      <!-- 时间戳 → 日期 -->
      <div class="convert-section">
        <h3 class="section-title">时间戳 → 日期</h3>
        <div class="convert-row">
          <el-input v-model="timestampInput" placeholder="输入时间戳，如 1697040000" size="large" class="flex-1" />
          <el-radio-group v-model="tsUnit" size="default">
            <el-radio-button value="s">秒</el-radio-button>
            <el-radio-button value="ms">毫秒</el-radio-button>
            <el-radio-button value="auto">自动</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="dateResult" class="result-display">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item v-for="row in dateRows" :key="row.label" :label="row.label">
              <span class="mono">{{ row.value }}</span>
              <el-button text :icon="CopyDocument" @click="copyVal(row.value)" class="row-copy" size="small" />
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <el-divider />

      <!-- 日期 → 时间戳 -->
      <div class="convert-section">
        <h3 class="section-title">日期 → 时间戳</h3>
        <div class="convert-row">
          <el-date-picker v-model="dateInput" type="datetime" placeholder="选择日期时间" size="large" class="flex-1" />
          <el-button type="primary" size="large" @click="copyVal(String(tsResult?.seconds || ''))" :disabled="!tsResult">复制秒级</el-button>
          <el-button size="large" @click="copyVal(String(tsResult?.millis || ''))" :disabled="!tsResult">复制毫秒级</el-button>
        </div>
        <div v-if="tsResult" class="result-display">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="秒级时间戳">{{ tsResult.seconds }}</el-descriptions-item>
            <el-descriptions-item label="毫秒级时间戳">{{ tsResult.millis }}</el-descriptions-item>
            <el-descriptions-item label="所选时区">{{ tsResult.tzDisplay }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <el-divider />

      <!-- 批量转换 -->
      <div class="convert-section">
        <h3 class="section-title">批量转换</h3>
        <div class="batch-mode-row">
          <el-radio-group v-model="batchMode" size="default">
            <el-radio-button value="ts2date">时间戳 → 日期</el-radio-button>
            <el-radio-button value="date2ts">日期 → 时间戳</el-radio-button>
          </el-radio-group>
        </div>
        <div class="batch-row">
          <el-input
            v-model="batchInput"
            type="textarea"
            :rows="6"
            :placeholder="batchPlaceholder"
            class="flex-1"
          />
          <el-input
            :model-value="batchOutput"
            type="textarea"
            :rows="6"
            readonly
            placeholder="转换结果（每行一条）"
            class="flex-1"
          />
        </div>
        <div class="batch-actions">
          <el-button text :icon="CopyDocument" @click="copyVal(batchOutput)" :disabled="!batchOutput" size="small">复制结果</el-button>
          <el-button text :icon="Delete" @click="batchInput = ''" :disabled="!batchInput" size="small">清空</el-button>
        </div>
      </div>

      <el-divider />

      <!-- 当前时间 -->
      <div class="now-section">
        <h3 class="section-title">当前时间</h3>
        <div class="now-display">
          <div v-for="row in nowRows" :key="row.label" class="now-item">
            <span class="now-label">{{ row.label }}</span>
            <code>{{ row.value }}</code>
            <el-button text :icon="CopyDocument" @click="copyVal(row.value)" class="row-copy" size="small" />
          </div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CopyDocument, Delete } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const timezones = [
  { label: 'UTC', value: 'UTC' },
  { label: '中国 (Asia/Shanghai)', value: 'Asia/Shanghai' },
  { label: '日本 (Asia/Tokyo)', value: 'Asia/Tokyo' },
  { label: '香港 (Asia/Hong_Kong)', value: 'Asia/Hong_Kong' },
  { label: '新加坡 (Asia/Singapore)', value: 'Asia/Singapore' },
  { label: '韩国 (Asia/Seoul)', value: 'Asia/Seoul' },
  { label: '印度 (Asia/Kolkata)', value: 'Asia/Kolkata' },
  { label: '迪拜 (Asia/Dubai)', value: 'Asia/Dubai' },
  { label: '美东 (America/New_York)', value: 'America/New_York' },
  { label: '美西 (America/Los_Angeles)', value: 'America/Los_Angeles' },
  { label: '芝加哥 (America/Chicago)', value: 'America/Chicago' },
  { label: '英国 (Europe/London)', value: 'Europe/London' },
  { label: '巴黎 (Europe/Paris)', value: 'Europe/Paris' },
  { label: '莫斯科 (Europe/Moscow)', value: 'Europe/Moscow' },
  { label: '悉尼 (Australia/Sydney)', value: 'Australia/Sydney' }
]
const timezone = ref('Asia/Shanghai')

const timestampInput = ref('')
const tsUnit = ref('s')
const dateInput = ref(new Date())
const batchMode = ref('ts2date')
const batchInput = ref('')

const now = ref({ seconds: 0, millis: 0, local: '', utc: '', iso: '' })
let timer = null

// 在指定时区格式化日期
function formatInTz(date, tz) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(date)
  } catch (e) {
    return date.toLocaleString('zh-CN')
  }
}

function relativeTime(ms) {
  const diff = Date.now() - ms
  const abs = Math.abs(diff)
  const sign = diff > 0 ? '前' : '后'
  const unit = (n, w) => `${Math.round(n)}${w}${sign}`
  if (abs < 60000) return unit(abs / 1000, '秒')
  if (abs < 3600000) return unit(abs / 60000, '分钟')
  if (abs < 86400000) return unit(abs / 3600000, '小时')
  if (abs < 2592000000) return unit(abs / 86400000, '天') // 30 天
  if (abs < 31536000000) return unit(abs / 2592000000, '个月') // 月
  return unit(abs / 31536000000, '年')
}

// 自动判断秒/毫秒：>1e11 视为毫秒（1e11 秒 = 公元 5138 年）
function autoToMs(ts) {
  const n = Number(ts)
  if (isNaN(n)) return null
  if (tsUnit.value === 's') return n * 1000
  if (tsUnit.value === 'ms') return n
  return n > 1e11 ? n : n * 1000
}

const dateResult = computed(() => {
  const ts = timestampInput.value.trim()
  if (!ts) return null
  const ms = autoToMs(ts)
  if (ms == null) return null
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null
  return {
    local: formatInTz(d, timezone.value),
    utc: d.toUTCString(),
    iso: d.toISOString(),
    rfc2822: d.toUTCString(),
    rfc3339: d.toISOString(),
    relative: relativeTime(ms),
    tz: timezone.value
  }
})

const dateRows = computed(() => {
  if (!dateResult.value) return []
  const r = dateResult.value
  return [
    { label: '所选时区 (' + r.tz + ')', value: r.local },
    { label: 'UTC 时间', value: r.utc },
    { label: 'ISO 8601', value: r.iso },
    { label: 'RFC 3339', value: r.rfc3339 },
    { label: 'RFC 2822', value: r.rfc2822 },
    { label: '相对时间', value: r.relative }
  ]
})

const tsResult = computed(() => {
  if (!dateInput.value) return null
  const ms = new Date(dateInput.value).getTime()
  if (isNaN(ms)) return null
  return {
    seconds: Math.floor(ms / 1000),
    millis: ms,
    tzDisplay: formatInTz(new Date(ms), timezone.value)
  }
})

const batchPlaceholder = computed(() =>
  batchMode.value === 'ts2date'
    ? '每行一个时间戳（自动识别秒/毫秒）\n如：\n1697040000\n1697040000000'
    : '每行一个日期字符串\n如：\n2024-10-12 08:00:00\n2024-10-12T08:00:00Z'
)

const batchOutput = computed(() => {
  const lines = batchInput.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return ''
  return lines
    .map((line) => {
      if (batchMode.value === 'ts2date') {
        const n = Number(line)
        if (isNaN(n)) return `${line}\t无效`
        const ms = n > 1e11 ? n : n * 1000
        const d = new Date(ms)
        if (isNaN(d.getTime())) return `${line}\t无效`
        return `${line}\t${formatInTz(d, timezone.value)} (UTC: ${d.toISOString()})`
      } else {
        const d = new Date(line)
        if (isNaN(d.getTime())) return `${line}\t无效`
        return `${line}\t${Math.floor(d.getTime() / 1000)}  /  ${d.getTime()}ms`
      }
    })
    .join('\n')
})

const nowRows = computed(() => [
  { label: '时间戳(秒)', value: now.value.seconds },
  { label: '时间戳(毫秒)', value: now.value.millis },
  { label: '本地时间', value: now.value.local },
  { label: '所选时区', value: now.value.tzDisplay },
  { label: 'UTC', value: now.value.utc }
])

onMounted(() => {
  const update = () => {
    const d = new Date()
    now.value = {
      seconds: Math.floor(d.getTime() / 1000),
      millis: d.getTime(),
      local: d.toLocaleString('zh-CN'),
      tzDisplay: formatInTz(d, timezone.value),
      utc: d.toUTCString(),
      iso: d.toISOString()
    }
  }
  update()
  timer = setInterval(update, 1000)
})
onUnmounted(() => clearInterval(timer))

async function copyVal(text) {
  if (!text) return
  const ok = await copyText(text)
  ElMessage[ok ? 'success' : 'error'](ok ? '已复制' : '复制失败')
}
</script>

<style scoped>
.timestamp-tool { display: flex; flex-direction: column; gap: 8px; }
.tz-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tz-label { font-size: 13px; color: var(--color-text-regular); }
.tz-select { width: 240px; }

.convert-section { display: flex; flex-direction: column; gap: 12px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
.convert-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.flex-1 { flex: 1; min-width: 200px; }
.result-display { margin-top: 4px; }

.mono { font-family: 'SF Mono', Menlo, Consolas, monospace; color: var(--color-text-primary); }
.row-copy { margin-left: 8px; }

.batch-mode-row { display: flex; }
.batch-row { display: flex; gap: 12px; }
.batch-actions { display: flex; gap: 4px; }

.now-section { display: flex; flex-direction: column; gap: 12px; }
.now-display { display: flex; flex-direction: column; gap: 8px; }
.now-item { display: flex; align-items: center; gap: 12px; }
.now-label { width: 120px; font-size: 13px; color: var(--color-text-secondary); flex-shrink: 0; }
.now-item code { font-size: 14px; color: var(--color-text-primary); font-family: 'SF Mono', Menlo, Consolas, monospace; }

@media (max-width: 768px) {
  .convert-row { flex-direction: column; align-items: stretch; }
  .batch-row { flex-direction: column; }
  .tz-select { width: 100%; }
  .now-label { width: 100px; }
}
</style>
