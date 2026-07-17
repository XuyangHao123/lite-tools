<template>
  <ToolLayout title="日期计算器" desc="免费在线日期计算工具，计算两个日期间隔天数、日期加减天数，本地处理。">
    <div class="date-calc">
      <!-- 日期间隔计算 -->
      <div class="calc-section">
        <h3 class="section-title">日期间隔计算</h3>
        <div class="date-row">
          <el-date-picker v-model="date1" type="date" placeholder="开始日期" size="large" class="date-picker" />
          <el-date-picker v-model="date2" type="date" placeholder="结束日期" size="large" class="date-picker" />
        </div>
        <div v-if="diffResult" class="result-display">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="相差天数">{{ diffResult.days }} 天</el-descriptions-item>
            <el-descriptions-item label="相差周数">{{ diffResult.weeks }} 周（{{ diffResult.weeksRemainder }} 天）</el-descriptions-item>
            <el-descriptions-item label="相差月数">约 {{ diffResult.months }} 个月</el-descriptions-item>
            <el-descriptions-item label="相差年数">约 {{ diffResult.years }} 年</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <el-divider />

      <!-- 日期加减 -->
      <div class="calc-section">
        <h3 class="section-title">日期加减天数</h3>
        <div class="date-row">
          <el-date-picker v-model="baseDate" type="date" placeholder="基准日期" size="large" class="date-picker" />
          <el-input-number v-model="addDays" :controls="false" size="large" placeholder="天数" class="days-input" />
          <el-button type="primary" size="large" @click="calcAddDays">计算</el-button>
        </div>
        <div v-if="addResult" class="result-display">
          <el-alert :title="`结果：${addResult.date}（${addResult.weekday}）`" type="success" show-icon :closable="false" />
        </div>
      </div>

      <el-divider />

      <!-- 当前日期信息 -->
      <div class="calc-section">
        <h3 class="section-title">今日信息</h3>
        <div class="today-info">
          <el-tag type="info" size="large">{{ today.date }}</el-tag>
          <el-tag type="info" size="large">{{ today.weekday }}</el-tag>
          <el-tag type="info" size="large">今年第 {{ today.dayOfYear }} 天</el-tag>
          <el-tag type="info" size="large">第 {{ today.weekOfYear }} 周</el-tag>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'

const date1 = ref(new Date())
const date2 = ref(new Date())
const baseDate = ref(new Date())
const addDays = ref(0)
const addResult = ref(null)
const today = ref({ date: '', weekday: '', dayOfYear: 0, weekOfYear: 0 })

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const diffResult = computed(() => {
  if (!date1.value || !date2.value) return null
  const d1 = new Date(date1.value)
  const d2 = new Date(date2.value)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  const diffMs = Math.abs(d2 - d1)
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const weeksRemainder = days % 7
  const months = Math.floor(days / 30)
  const years = (days / 365).toFixed(1)
  return { days, weeks, weeksRemainder, months, years }
})

function calcAddDays() {
  if (!baseDate.value) return
  const d = new Date(baseDate.value)
  d.setDate(d.getDate() + addDays.value)
  addResult.value = {
    date: d.toLocaleDateString('zh-CN'),
    weekday: WEEKDAYS[d.getDay()]
  }
}

onMounted(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const weekOfYear = Math.ceil(dayOfYear / 7)
  today.value = {
    date: now.toLocaleDateString('zh-CN'),
    weekday: WEEKDAYS[now.getDay()],
    dayOfYear,
    weekOfYear
  }
})
</script>

<style scoped>
.date-calc { display: flex; flex-direction: column; gap: 8px; }
.calc-section { display: flex; flex-direction: column; gap: 12px; }
.section-title { font-size: 16px; font-weight: 700; color: #303133; margin: 0; }
.date-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.date-picker { flex: 1; min-width: 180px; }
.days-input { width: 120px; }
.result-display { margin-top: 4px; }
.today-info { display: flex; gap: 8px; flex-wrap: wrap; }
@media (max-width: 768px) { .date-row { flex-direction: column; } .date-picker, .days-input { width: 100%; } }
</style>
