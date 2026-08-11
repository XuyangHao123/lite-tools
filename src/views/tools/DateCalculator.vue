<template>
  <ToolLayout
    title="日期计算器"
    desc="免费在线日期计算工具，支持日期间隔、工作日/节假日计算、日期加减（天/工作日/月/年）、农历显示、倒计时/纪念日，本地处理。"
    fav-key="date-calculator"
  >
    <div class="date-calc">
      <!-- 日期间隔计算 -->
      <div class="calc-section">
        <h3 class="section-title">日期间隔计算</h3>
        <div class="date-row">
          <el-date-picker v-model="date1" type="date" placeholder="开始日期" size="large" class="date-picker" />
          <el-date-picker v-model="date2" type="date" placeholder="结束日期" size="large" class="date-picker" />
        </div>
        <div class="opt-row">
          <el-checkbox v-model="excludeHoliday">排除中国法定节假日（2024-2026，仅供参考）</el-checkbox>
        </div>
        <div v-if="diffResult" class="result-display">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="相差天数">{{ diffResult.days }} 天</el-descriptions-item>
            <el-descriptions-item label="相差周数">{{ diffResult.weeks }} 周（余 {{ diffResult.weeksRemainder }} 天）</el-descriptions-item>
            <el-descriptions-item label="相差月数">{{ diffResult.months }} 个月（余 {{ diffResult.remDays }} 天）</el-descriptions-item>
            <el-descriptions-item label="相差年数">{{ diffResult.years }} 年</el-descriptions-item>
            <el-descriptions-item label="工作日 / 周末">
              含 {{ diffResult.workdays }} 个工作日、{{ diffResult.weekendDays }} 个周末日
              <span v-if="excludeHoliday" class="muted">（已排除 {{ diffResult.holidayCount }} 个节假日）</span>
            </el-descriptions-item>
          </el-descriptions>
          <el-button text :icon="CopyDocument" @click="copyVal(formatDiff(diffResult))" size="small">复制</el-button>
        </div>
      </div>

      <el-divider />

      <!-- 日期加减 -->
      <div class="calc-section">
        <h3 class="section-title">日期加减</h3>
        <div class="date-row">
          <el-date-picker v-model="baseDate" type="date" placeholder="基准日期" size="large" class="date-picker" />
          <el-input-number v-model="addAmount" :controls="false" size="large" placeholder="数量" class="amount-input" />
          <el-select v-model="addUnit" size="large" class="unit-select">
            <el-option label="天" value="day" />
            <el-option label="工作日（跳过周末）" value="workday" />
            <el-option label="月" value="month" />
            <el-option label="年" value="year" />
          </el-select>
          <el-button type="primary" size="large" @click="calcAdd">计算</el-button>
        </div>
        <div v-if="addResult" class="result-display">
          <el-alert :title="`${addResult.date}（${addResult.weekday}）`" type="success" show-icon :closable="false" />
          <div class="lunar-row">
            <span class="muted">农历：</span>
            <code>{{ addResult.lunar }}</code>
            <el-button text :icon="CopyDocument" @click="copyVal(addResult.date + '（' + addResult.weekday + '）')" size="small">复制</el-button>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 倒计时 / 纪念日 -->
      <div class="calc-section">
        <h3 class="section-title">倒计时 / 纪念日</h3>
        <div class="date-row">
          <el-date-picker v-model="targetDate" type="date" placeholder="目标日期" size="large" class="date-picker" />
          <el-button text :icon="CopyDocument" @click="copyVal(countdownText)" :disabled="!countdownText" size="small">复制</el-button>
        </div>
        <div v-if="countdownText" class="result-display">
          <el-alert :title="countdownText" :type="countdownType" show-icon :closable="false" />
          <p class="muted" v-if="countdownWorkdays !== null">其间含 {{ countdownWorkdays }} 个工作日</p>
        </div>
      </div>

      <el-divider />

      <!-- 当前日期信息 -->
      <div class="calc-section">
        <h3 class="section-title">今日信息</h3>
        <div class="today-info">
          <el-tag type="info" size="large">{{ today.date }}</el-tag>
          <el-tag type="info" size="large">{{ today.weekday }}</el-tag>
          <el-tag type="info" size="large">{{ today.lunar }}</el-tag>
          <el-tag type="info" size="large">今年第 {{ today.dayOfYear }} 天</el-tag>
          <el-tag type="info" size="large">第 {{ today.weekOfYear }} 周</el-tag>
        </div>
      </div>

      <p class="tool-tip">
        提示：工作日为周一至周五。中国法定节假日表内置 2024-2026 数据，2026 年为预估值，仅供参考以实际放假通知为准。
        农历由浏览器 Intl 中文历法生成。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const date1 = ref(new Date())
const date2 = ref(new Date())
const baseDate = ref(new Date())
const addAmount = ref(0)
const addUnit = ref('day')
const targetDate = ref(null)
const excludeHoliday = ref(false)
const addResult = ref(null)
const today = ref({ date: '', weekday: '', lunar: '', dayOfYear: 0, weekOfYear: 0 })

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

// 中国法定节假日（放假日，2024-2026；2026 为估值）
const HOLIDAY_RANGES = [
  ['2024-01-01', '2024-01-01'],
  ['2024-02-10', '2024-02-17'], // 春节
  ['2024-04-04', '2024-04-06'], // 清明
  ['2024-05-01', '2024-05-05'], // 劳动节
  ['2024-06-08', '2024-06-10'], // 端午
  ['2024-09-15', '2024-09-17'], // 中秋
  ['2024-10-01', '2024-10-07'], // 国庆
  ['2025-01-01', '2025-01-01'],
  ['2025-01-28', '2025-02-04'], // 春节
  ['2025-04-04', '2025-04-06'], // 清明
  ['2025-05-01', '2025-05-05'], // 劳动节
  ['2025-05-31', '2025-06-02'], // 端午
  ['2025-10-01', '2025-10-08'], // 国庆+中秋
  ['2026-01-01', '2026-01-03'],
  ['2026-02-15', '2026-02-22'], // 春节（估）
  ['2026-04-04', '2026-04-06'], // 清明（估）
  ['2026-05-01', '2026-05-05'], // 劳动节（估）
  ['2026-06-19', '2026-06-21'], // 端午（估）
  ['2026-09-25', '2026-09-27'], // 中秋（估）
  ['2026-10-01', '2026-10-07']  // 国庆（估）
]

const HOLIDAY_SET = new Set()
for (const [s, e] of HOLIDAY_RANGES) {
  const start = new Date(s)
  const end = new Date(e)
  const cur = new Date(start)
  while (cur <= end) {
    HOLIDAY_SET.add(toDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
}

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isWeekend(d) {
  const w = d.getDay()
  return w === 0 || w === 6
}

function isHoliday(d) {
  return HOLIDAY_SET.has(toDateStr(d))
}

// 加月（处理月末边界）
function addMonths(date, months) {
  const d = new Date(date)
  const origDay = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(origDay, lastDay))
  return d
}

// 加年（处理 2 月 29 日边界）
function addYears(date, years) {
  const d = new Date(date)
  const origDay = d.getDate()
  d.setDate(1)
  d.setFullYear(d.getFullYear() + years)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(origDay, lastDay))
  return d
}

// 加工作日（跳过周末，可选跳过节假日）
function addWorkdays(date, n, skipHoliday) {
  const d = new Date(date)
  const step = n >= 0 ? 1 : -1
  let remaining = Math.abs(n)
  while (remaining > 0) {
    d.setDate(d.getDate() + step)
    if (!isWeekend(d) && (!skipHoliday || !isHoliday(d))) {
      remaining--
    }
  }
  return d
}

// 精确年/月差
function preciseDiff(start, end) {
  let s = new Date(start)
  let e = new Date(end)
  let sign = 1
  if (s > e) { [s, e] = [e, s]; sign = -1 }
  s.setHours(0, 0, 0, 0)
  e.setHours(0, 0, 0, 0)

  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  if (e.getDate() < s.getDate()) months--
  if (months < 0) months = 0
  const years = Math.floor(months / 12)
  const remMonths = months % 12

  const afterMonths = addMonths(s, months)
  const remDays = Math.round((e - afterMonths) / 86400000)
  const totalDays = Math.round((e - s) / 86400000)
  const weeks = Math.floor(totalDays / 7)
  const weeksRemainder = totalDays % 7

  return { years, months, remMonths, remDays, totalDays, weeks, weeksRemainder, sign }
}

// 工作日统计
function countWorkdays(start, end, skipHoliday) {
  let s = new Date(start)
  let e = new Date(end)
  if (s > e) [s, e] = [e, s]
  s.setHours(0, 0, 0, 0)
  e.setHours(0, 0, 0, 0)
  let workdays = 0
  let weekendDays = 0
  let holidayCount = 0
  const cur = new Date(s)
  while (cur <= e) {
    if (isWeekend(cur)) {
      weekendDays++
    } else {
      if (skipHoliday && isHoliday(cur)) {
        holidayCount++
      } else {
        workdays++
      }
    }
    cur.setDate(cur.getDate() + 1)
  }
  return { workdays, weekendDays, holidayCount }
}

const diffResult = computed(() => {
  if (!date1.value || !date2.value) return null
  const d1 = new Date(date1.value)
  const d2 = new Date(date2.value)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  const diff = preciseDiff(d1, d2)
  const wd = countWorkdays(d1, d2, excludeHoliday.value)
  return {
    days: diff.totalDays,
    weeks: diff.weeks,
    weeksRemainder: diff.weeksRemainder,
    months: diff.months,
    remDays: diff.remDays,
    years: diff.years,
    workdays: wd.workdays,
    weekendDays: wd.weekendDays,
    holidayCount: wd.holidayCount
  }
})

function formatDiff(r) {
  if (!r) return ''
  return `相差 ${r.days} 天（${r.weeks} 周余 ${r.weeksRemainder} 天 / ${r.years} 年 ${r.months % 12} 个月），含 ${r.workdays} 个工作日、${r.weekendDays} 个周末日`
}

// 农历
function getLunar(date) {
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric', month: 'long', day: 'numeric'
    }).format(date)
  } catch (e) {
    return '农历不可用'
  }
}

function calcAdd() {
  if (!baseDate.value || addAmount.value == null) return
  let d
  const n = addAmount.value
  switch (addUnit.value) {
    case 'day':
      d = new Date(baseDate.value)
      d.setDate(d.getDate() + n)
      break
    case 'workday':
      d = addWorkdays(baseDate.value, n, excludeHoliday.value)
      break
    case 'month':
      d = addMonths(baseDate.value, n)
      break
    case 'year':
      d = addYears(baseDate.value, n)
      break
  }
  addResult.value = {
    date: toDateStr(d),
    weekday: WEEKDAYS[d.getDay()],
    lunar: getLunar(d)
  }
}

// 倒计时
const countdown = computed(() => {
  if (!targetDate.value) return null
  const target = new Date(targetDate.value)
  target.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffMs = target - now
  const days = Math.round(diffMs / 86400000)
  return { days, isPast: days < 0 }
})

const countdownText = computed(() => {
  if (!countdown.value) return ''
  const d = countdown.value.days
  if (d === 0) return '今天就是目标日期'
  return countdown.value.isPast ? `已过去 ${Math.abs(d)} 天` : `距今还有 ${d} 天`
})
const countdownType = computed(() => {
  if (!countdown.value) return 'info'
  return countdown.value.isPast ? 'warning' : 'success'
})
const countdownWorkdays = computed(() => {
  if (!countdown.value) return null
  const target = new Date(targetDate.value)
  target.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return countWorkdays(now, target, excludeHoliday.value).workdays
})

onMounted(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / 86400000)
  const weekOfYear = Math.ceil(dayOfYear / 7)
  today.value = {
    date: toDateStr(now),
    weekday: WEEKDAYS[now.getDay()],
    lunar: getLunar(now),
    dayOfYear,
    weekOfYear
  }
})

async function copyVal(text) {
  if (!text) return
  const ok = await copyText(text)
  ElMessage[ok ? 'success' : 'error'](ok ? '已复制' : '复制失败')
}
</script>

<style scoped>
.date-calc { display: flex; flex-direction: column; gap: 8px; }
.calc-section { display: flex; flex-direction: column; gap: 12px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
.date-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.date-picker { flex: 1; min-width: 180px; }
.amount-input { width: 120px; }
.unit-select { width: 200px; }
.opt-row { font-size: 13px; color: var(--color-text-regular); }
.result-display { margin-top: 4px; display: flex; flex-direction: column; gap: 8px; }
.lunar-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.muted { color: var(--color-text-secondary); font-size: 13px; }
.today-info { display: flex; gap: 8px; flex-wrap: wrap; }
.tool-tip { font-size: 12px; color: var(--color-text-placeholder); margin: 8px 0 0; line-height: 1.8; }
code { font-family: 'SF Mono', Menlo, Consolas, monospace; color: var(--color-text-primary); }

@media (max-width: 768px) {
  .date-row { flex-direction: column; align-items: stretch; }
  .date-picker, .amount-input, .unit-select { width: 100%; }
}
</style>
