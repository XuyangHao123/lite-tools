<template>
  <ToolLayout
    title="房贷计算器"
    desc="免费在线房贷计算器，支持等额本息/等额本金、LPR 浮动利率分段计算、提前还款（缩短年限/减少月供）、公积金贷款与组合贷、CSV 导出，附两种方式对比。"
    fav-key="mortgage-calculator"
  >
    <div class="mortgage-tool">
      <div class="input-section">
        <el-form label-position="top">
          <!-- 贷款类型 -->
          <el-form-item label="贷款类型">
            <el-radio-group v-model="loanType">
              <el-radio-button value="commercial">商业贷款</el-radio-button>
              <el-radio-button value="fund">公积金贷款</el-radio-button>
              <el-radio-button value="combo">组合贷</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <div class="form-row">
            <!-- 商贷金额 -->
            <el-form-item v-if="loanType !== 'fund'" :label="`商贷金额（万元）`">
              <el-input-number
                v-model="principal"
                :min="1"
                :max="10000"
                :controls="false"
                size="large"
                class="full-width"
              />
            </el-form-item>

            <!-- 公积金金额 -->
            <el-form-item v-if="loanType !== 'commercial'" :label="`公积金金额（万元）`">
              <el-input-number
                v-model="fundPrincipal"
                :min="0"
                :max="10000"
                :controls="false"
                size="large"
                class="full-width"
              />
            </el-form-item>

            <el-form-item label="贷款年限（年）">
              <el-input-number
                v-model="years"
                :min="1"
                :max="30"
                :controls="false"
                size="large"
                class="full-width"
              />
            </el-form-item>
          </div>

          <!-- 商贷利率 -->
          <div v-if="loanType !== 'fund'" class="rate-block">
            <div class="rate-header">
              <span class="rate-title">商贷利率</span>
              <el-radio-group v-model="rateMode" size="small">
                <el-radio-button value="fixed">固定利率</el-radio-button>
                <el-radio-button value="lpr">LPR 浮动</el-radio-button>
              </el-radio-group>
            </div>
            <el-form-item v-if="rateMode === 'fixed'" label="年利率（%）" class="rate-row">
              <el-input-number
                v-model="rate"
                :min="0.01"
                :max="20"
                :step="0.01"
                :precision="2"
                :controls="false"
                size="large"
                class="rate-input"
              />
            </el-form-item>
            <div v-else class="lpr-segments">
              <div class="segment-header">
                <span>起始期数</span><span>年利率（%）</span><span></span>
              </div>
              <div v-for="(seg, i) in lprSegments" :key="i" class="segment-row">
                <el-input-number
                  v-model="seg.fromPeriod"
                  :min="1"
                  :max="720"
                  :controls="false"
                  size="default"
                  :disabled="i === 0"
                  class="seg-input"
                />
                <el-input-number
                  v-model="seg.rate"
                  :min="0.01"
                  :max="20"
                  :step="0.01"
                  :precision="2"
                  :controls="false"
                  size="default"
                  class="seg-input"
                />
                <el-button
                  text
                  :icon="Delete"
                  @click="removeSegment(i)"
                  :disabled="lprSegments.length === 1"
                />
              </div>
              <el-button text :icon="Plus" @click="addSegment" size="small">添加利率段</el-button>
              <p class="seg-tip">起始期数从 1 开始；LPR 调整后从该期起按新利率重新计算月供（保持到期日不变）。</p>
            </div>
          </div>

          <!-- 公积金利率 -->
          <el-form-item v-if="loanType !== 'commercial'" label="公积金年利率（%）" class="rate-row">
            <el-input-number
              v-model="fundRate"
              :min="0.01"
              :max="10"
              :step="0.01"
              :precision="2"
              :controls="false"
              size="large"
              class="rate-input"
            />
            <el-button text size="small" @click="fundRate = 3.1">使用首套基准 3.1%</el-button>
          </el-form-item>

          <el-form-item label="还款方式">
            <el-radio-group v-model="method" size="large">
              <el-radio-button value="equal-payment">等额本息</el-radio-button>
              <el-radio-button value="equal-principal">等额本金</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <!-- 提前还款 -->
          <div class="prepay-block">
            <div class="prepay-header">
              <span class="prepay-title">提前还款（可选）</span>
              <el-radio-group v-model="prepayMode" size="small">
                <el-radio-button value="shorten">缩短年限</el-radio-button>
                <el-radio-button value="reduce">减少月供</el-radio-button>
              </el-radio-group>
            </div>
            <div class="segment-header">
              <span>第几期</span><span>提前还本金（万元）</span><span></span>
            </div>
            <div v-for="(p, i) in prepayments" :key="i" class="segment-row">
              <el-input-number
                v-model="p.period"
                :min="1"
                :max="720"
                :controls="false"
                size="default"
                class="seg-input"
              />
              <el-input-number
                v-model="p.amount"
                :min="0"
                :max="10000"
                :precision="2"
                :controls="false"
                size="default"
                class="seg-input"
              />
              <el-button text :icon="Delete" @click="removePrepay(i)" />
            </div>
            <el-button text :icon="Plus" @click="addPrepay" size="small">添加提前还款</el-button>
            <p class="seg-tip">提前还款默认归还商贷部分（利率较高更划算）；组合贷时优先冲抵商贷本金。</p>
          </div>
        </el-form>
      </div>

      <!-- 结果 -->
      <div v-if="summary" class="result-section">
        <div class="result-highlight">
          <div class="highlight-item">
            <div class="highlight-value">{{ summary.monthlyFirst }}</div>
            <div class="highlight-label">{{ method === 'equal-payment' ? '每月还款' : '首月还款' }}（元）</div>
          </div>
          <div v-if="method === 'equal-principal'" class="highlight-item">
            <div class="highlight-value">{{ summary.monthlyLast }}</div>
            <div class="highlight-label">末月还款（元）</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-value">{{ formatMoney(summary.totalInterest) }}</div>
            <div class="highlight-label">总利息（万元）</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-value">{{ formatMoney(summary.totalPayment) }}</div>
            <div class="highlight-label">还款总额（万元）</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-value">{{ summary.actualPeriods }}</div>
            <div class="highlight-label">实际期数</div>
          </div>
        </div>

        <!-- 对比 -->
        <div class="compare-block">
          <h3 class="compare-title">等额本息 vs 等额本金</h3>
          <el-table :data="compareRows" border size="small">
            <el-table-column prop="metric" label="指标" width="140" />
            <el-table-column prop="ep" label="等额本息" />
            <el-table-column prop="epr" label="等额本金" />
            <el-table-column prop="diff" label="差额" />
          </el-table>
          <p class="compare-tip" v-if="compareDiff">
            等额本金比等额本息少付利息 <b>{{ compareDiff.interestDiff }}</b> 万元，
            但首月多还 <b>{{ compareDiff.monthlyDiff }}</b> 元。
          </p>
        </div>

        <!-- 明细表 -->
        <div class="detail-section">
          <div class="detail-header">
            <h3 class="detail-title">还款明细</h3>
            <div class="detail-actions">
              <el-button text :icon="Download" @click="exportCsv" size="small">导出 CSV</el-button>
              <el-button text :icon="CopyDocument" @click="copySummary" size="small">复制结果</el-button>
            </div>
          </div>
          <el-table :data="pagedSchedule" border size="small" max-height="460">
            <el-table-column prop="period" label="期数" width="70" />
            <el-table-column prop="monthly" label="月供(元)" />
            <el-table-column prop="principal" label="本金(元)" />
            <el-table-column prop="interest" label="利息(元)" />
            <el-table-column prop="prepay" label="提前还本(元)" />
            <el-table-column prop="balance" label="剩余本金(元)" />
          </el-table>
          <div class="pagination-row">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :page-sizes="[12, 24, 60, 120]"
              :total="summary.schedule.length"
              layout="total, sizes, prev, pager, next"
              small
            />
          </div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Delete, Download, CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'
import { downloadBlob } from '@/composables/useDownload'

const loanType = ref('commercial')
const principal = ref(100) // 商贷金额（万元）
const fundPrincipal = ref(60) // 公积金金额（万元）
const years = ref(30)
const rateMode = ref('fixed')
const rate = ref(4.2) // 商贷固定年利率
const fundRate = ref(3.1) // 公积金年利率
const method = ref('equal-payment')
const prepayMode = ref('shorten')

// LPR 利率段
const lprSegments = ref([
  { fromPeriod: 1, rate: 4.2 }
])
function addSegment() {
  const last = lprSegments.value[lprSegments.value.length - 1]
  lprSegments.value.push({ fromPeriod: (last?.fromPeriod || 1) + 12, rate: last?.rate || 4.2 })
}
function removeSegment(i) {
  if (lprSegments.value.length === 1) return
  lprSegments.value.splice(i, 1)
}

// 提前还款
const prepayments = ref([])
function addPrepay() {
  prepayments.value.push({ period: 12, amount: 10 })
}
function removePrepay(i) {
  prepayments.value.splice(i, 1)
}

const page = ref(1)
const pageSize = ref(12)

function formatMoney(val) {
  return Number(val).toFixed(2)
}

// 构建利率段（保证第一段从第 1 期开始）
function buildSegments(rateModeVal, fixedRateVal, lprSegs) {
  if (rateModeVal === 'lpr') {
    const segs = lprSegs
      .map((s) => ({ fromPeriod: Math.max(1, Math.floor(s.fromPeriod) || 1), rate: s.rate }))
      .sort((a, b) => a.fromPeriod - b.fromPeriod)
    if (!segs.length || segs[0].fromPeriod !== 1) segs.unshift({ fromPeriod: 1, rate: fixedRateVal })
    return segs
  }
  return [{ fromPeriod: 1, rate: fixedRateVal }]
}

/**
 * 核心计算引擎
 * @param {object} opts
 * @param {number} opts.principal 本金（元）
 * @param {number} opts.totalPeriods 总期数
 * @param {Array} opts.rateSegments [{fromPeriod, rate}] 年利率（%）
 * @param {'equal-payment'|'equal-principal'} opts.method
 * @param {Array} opts.prepayments [{period, amount}] amount 元
 * @param {'shorten'|'reduce'} opts.prepayMode
 */
function computeLoan(opts) {
  const { principal: P, totalPeriods, rateSegments, method: m, prepayments: pps, prepayMode } = opts
  const schedule = []
  let balance = P
  let period = 1
  let lockedPayment = null
  let lockedPrincipal = null

  const monthlyRate = (p) => {
    let seg = rateSegments[0]
    for (const s of rateSegments) {
      if (p >= s.fromPeriod) seg = s
    }
    return seg.rate / 100 / 12
  }

  const safetyCap = totalPeriods + 720
  while (balance > 0.005 && period <= safetyCap) {
    const r = monthlyRate(period)
    const interest = balance * r
    let payment, principalPart

    if (m === 'equal-payment') {
      if (lockedPayment != null) {
        payment = Math.min(lockedPayment, balance + interest)
      } else {
        const remaining = totalPeriods - period + 1
        if (remaining <= 0) {
          payment = balance + interest
        } else if (r === 0) {
          principalPart = balance / remaining
          payment = principalPart + interest
        } else {
          const pow = Math.pow(1 + r, remaining)
          payment = (balance * r * pow) / (pow - 1)
        }
      }
      principalPart = payment - interest
    } else {
      // equal-principal
      if (lockedPrincipal != null) {
        principalPart = Math.min(lockedPrincipal, balance)
      } else {
        const remaining = totalPeriods - period + 1
        principalPart = remaining > 0 ? balance / remaining : balance
      }
      payment = principalPart + interest
    }

    if (principalPart > balance) {
      principalPart = balance
      payment = principalPart + interest
    }
    balance -= principalPart

    // 提前还款（期末）
    let prepay = 0
    const pp = pps.find((p) => p.period === period)
    if (pp && pp.amount > 0 && balance > 0) {
      prepay = Math.min(pp.amount, balance)
      balance -= prepay
      if (m === 'equal-payment') {
        if (prepayMode === 'shorten') lockedPayment = payment
        else lockedPayment = null
      } else {
        if (prepayMode === 'shorten') lockedPrincipal = principalPart
        else lockedPrincipal = null
      }
    }

    schedule.push({
      period,
      monthly: round2(payment),
      principal: round2(principalPart),
      interest: round2(interest),
      prepay: round2(prepay),
      balance: round2(Math.max(0, balance))
    })

    if (balance <= 0.005) break
    period++
  }
  return schedule
}

function round2(v) {
  return Number(Number(v).toFixed(2))
}

// 构造各贷款部分
function buildCommercialSchedule(methodVal) {
  const segs = buildSegments(rateMode.value, rate.value, lprSegments.value)
  return computeLoan({
    principal: principal.value * 10000,
    totalPeriods: years.value * 12,
    rateSegments: segs,
    method: methodVal,
    prepayments: prepayments.value.map((p) => ({ period: p.period, amount: p.amount * 10000 })),
    prepayMode: prepayMode.value
  })
}

function buildFundSchedule(methodVal) {
  return computeLoan({
    principal: fundPrincipal.value * 10000,
    totalPeriods: years.value * 12,
    rateSegments: [{ fromPeriod: 1, rate: fundRate.value }],
    method: methodVal,
    prepayments: [], // 提前还款优先冲抵商贷
    prepayMode: prepayMode.value
  })
}

// 合并两个 schedule（按期数对齐求和）
function mergeSchedules(a, b) {
  const len = Math.max(a.length, b.length)
  const merged = []
  for (let i = 0; i < len; i++) {
    const ra = a[i] || { period: i + 1, monthly: 0, principal: 0, interest: 0, prepay: 0, balance: 0 }
    const rb = b[i] || { period: i + 1, monthly: 0, principal: 0, interest: 0, prepay: 0, balance: 0 }
    merged.push({
      period: i + 1,
      monthly: round2(ra.monthly + rb.monthly),
      principal: round2(ra.principal + rb.principal),
      interest: round2(ra.interest + rb.interest),
      prepay: round2(ra.prepay + rb.prepay),
      balance: round2(ra.balance + rb.balance)
    })
  }
  return merged
}

function scheduleFor(methodVal) {
  if (loanType.value === 'commercial') return buildCommercialSchedule(methodVal)
  if (loanType.value === 'fund') return buildFundSchedule(methodVal)
  // 组合贷
  return mergeSchedules(buildCommercialSchedule(methodVal), buildFundSchedule(methodVal))
}

function summarize(schedule) {
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0)
  const totalPayment = schedule.reduce((s, r) => s + r.monthly + r.prepay, 0)
  const first = schedule[0]
  const last = schedule[schedule.length - 1]
  return {
    monthlyFirst: first ? round2(first.monthly).toFixed(2) : '0.00',
    monthlyLast: last ? round2(last.monthly).toFixed(2) : '0.00',
    totalInterest: totalInterest / 10000,
    totalPayment: totalPayment / 10000,
    actualPeriods: schedule.length,
    schedule
  }
}

const summary = computed(() => {
  if (principal.value <= 0 && loanType.value !== 'fund') return null
  if (loanType.value === 'fund' && fundPrincipal.value <= 0) return null
  if (loanType.value === 'combo' && principal.value <= 0 && fundPrincipal.value <= 0) return null
  return summarize(scheduleFor(method.value))
})

// 对比：两种方式都用当前参数计算（含提前还款）
const compareRows = computed(() => {
  if (!summary.value) return []
  const ep = summarize(scheduleFor('equal-payment'))
  const epr = summarize(scheduleFor('equal-principal'))
  const fmt = (v) => round2(v).toFixed(2)
  const fmtWan = (v) => Number(v).toFixed(2)
  return [
    {
      metric: '首月月供(元)',
      ep: fmt(ep.monthlyFirst),
      epr: fmt(epr.monthlyFirst),
      diff: fmt(parseFloat(ep.monthlyFirst) - parseFloat(epr.monthlyFirst))
    },
    {
      metric: '总利息(万元)',
      ep: fmtWan(ep.totalInterest),
      epr: fmtWan(epr.totalInterest),
      diff: fmtWan(ep.totalInterest - epr.totalInterest)
    },
    {
      metric: '还款总额(万元)',
      ep: fmtWan(ep.totalPayment),
      epr: fmtWan(epr.totalPayment),
      diff: fmtWan(ep.totalPayment - epr.totalPayment)
    },
    {
      metric: '实际期数',
      ep: ep.actualPeriods,
      epr: epr.actualPeriods,
      diff: ep.actualPeriods - epr.actualPeriods
    }
  ]
})

const compareDiff = computed(() => {
  if (!compareRows.value.length) return null
  return {
    interestDiff: compareRows.value[1].diff,
    monthlyDiff: compareRows.value[0].diff
  }
})

const pagedSchedule = computed(() => {
  if (!summary.value) return []
  const start = (page.value - 1) * pageSize.value
  return summary.value.schedule.slice(start, start + pageSize.value)
})

function exportCsv() {
  if (!summary.value) return
  const rows = [['期数', '月供(元)', '本金(元)', '利息(元)', '提前还本(元)', '剩余本金(元)']]
  for (const r of summary.value.schedule) {
    rows.push([r.period, r.monthly, r.principal, r.interest, r.prepay, r.balance])
  }
  const csv = '\ufeff' + rows.map((r) => r.join(',')).join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), '还款明细.csv')
  ElMessage.success('已导出 CSV')
}

async function copySummary() {
  if (!summary.value) return
  const s = summary.value
  const text = [
    `贷款类型：${loanType.value}`,
    `还款方式：${method.value === 'equal-payment' ? '等额本息' : '等额本金'}`,
    `贷款年限：${years.value} 年`,
    method.value === 'equal-payment'
      ? `每月还款：${s.monthlyFirst} 元`
      : `首月还款：${s.monthlyFirst} 元，末月：${s.monthlyLast} 元`,
    `总利息：${formatMoney(s.totalInterest)} 万元`,
    `还款总额：${formatMoney(s.totalPayment)} 万元`,
    `实际期数：${s.actualPeriods} 期`
  ].join('\n')
  const ok = await copyText(text)
  ElMessage[ok ? 'success' : 'error'](ok ? '已复制结果' : '复制失败')
}
</script>

<style scoped>
.mortgage-tool { display: flex; flex-direction: column; gap: 24px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.full-width { width: 100%; }

.rate-block, .prepay-block {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rate-header, .prepay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.rate-title, .prepay-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.rate-row { display: flex; align-items: center; gap: 12px; margin-bottom: 0; }
.rate-input { width: 160px; }

.lpr-segments { display: flex; flex-direction: column; gap: 8px; }
.segment-header {
  display: grid;
  grid-template-columns: 1fr 1fr 32px;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.segment-row {
  display: grid;
  grid-template-columns: 1fr 1fr 32px;
  gap: 8px;
  align-items: center;
}
.seg-input { width: 100%; }
.seg-tip { font-size: 12px; color: var(--color-text-placeholder); margin: 4px 0 0; line-height: 1.6; }

.result-section { display: flex; flex-direction: column; gap: 20px; }
.result-highlight {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.highlight-item {
  text-align: center;
  padding: 16px 8px;
  background: var(--color-primary-light);
  border-radius: 8px;
}
.highlight-value { font-size: 22px; font-weight: 800; color: var(--color-primary); }
.highlight-label { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }

.compare-block { display: flex; flex-direction: column; gap: 8px; }
.compare-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin: 0; }
.compare-tip { font-size: 13px; color: var(--color-text-regular); margin: 4px 0 0; }

.detail-section { display: flex; flex-direction: column; gap: 12px; }
.detail-header { display: flex; justify-content: space-between; align-items: center; }
.detail-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin: 0; }
.detail-actions { display: flex; gap: 4px; }
.pagination-row { display: flex; justify-content: flex-end; }

@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .highlight-value { font-size: 18px; }
}
</style>
