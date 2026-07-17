<template>
  <ToolLayout title="房贷计算器" desc="免费在线房贷计算器，支持等额本息和等额本金两种方式，计算月供、利息、总额，本地计算。">
    <div class="mortgage-tool">
      <div class="input-section">
        <el-form label-position="top">
          <div class="form-row">
            <el-form-item label="贷款金额（万元）">
              <el-input-number v-model="principal" :min="1" :max="10000" :controls="false" size="large" class="full-width" />
            </el-form-item>
            <el-form-item label="贷款年限">
              <el-select v-model="years" size="large" class="full-width">
                <el-option v-for="y in [5,10,15,20,25,30]" :key="y" :label="y + '年'" :value="y" />
              </el-select>
            </el-form-item>
          </div>
          <div class="form-row">
            <el-form-item label="年利率（%）">
              <el-input-number v-model="rate" :min="0.01" :max="20" :step="0.01" :precision="2" :controls="false" size="large" class="full-width" />
            </el-form-item>
            <el-form-item label="还款方式">
              <el-radio-group v-model="method" size="large">
                <el-radio-button value="equal-payment">等额本息</el-radio-button>
                <el-radio-button value="equal-principal">等额本金</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </div>
        </el-form>
      </div>

      <!-- 结果 -->
      <div v-if="result" class="result-section">
        <div class="result-highlight">
          <div class="highlight-item">
            <div class="highlight-value">{{ result.monthlyFirst }}</div>
            <div class="highlight-label">{{ method === 'equal-payment' ? '每月还款' : '首月还款' }}</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-value">{{ formatMoney(result.totalInterest) }}</div>
            <div class="highlight-label">总利息（万元）</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-value">{{ formatMoney(result.totalPayment) }}</div>
            <div class="highlight-label">还款总额（万元）</div>
          </div>
        </div>

        <div v-if="method === 'equal-principal'" class="info-tip">
          <el-alert type="info" :closable="false" show-icon>
            <template #title>等额本金：每月递减，末月还款 {{ result.monthlyLast }} 元</template>
          </el-alert>
        </div>

        <!-- 还款明细表 -->
        <div class="detail-section">
          <h3 class="detail-title">还款明细（前12期）</h3>
          <el-table :data="result.schedule" border size="small" max-height="400">
            <el-table-column prop="period" label="期数" width="80" />
            <el-table-column prop="monthly" label="月供(元)" />
            <el-table-column prop="principal" label="本金(元)" />
            <el-table-column prop="interest" label="利息(元)" />
            <el-table-column prop="balance" label="剩余本金(元)" />
          </el-table>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'

const principal = ref(100) // 万元
const years = ref(30)
const rate = ref(4.2)
const method = ref('equal-payment')

function formatMoney(val) {
  return val.toFixed(2)
}

const result = computed(() => {
  const p = principal.value * 10000 // 转为元
  const n = years.value * 12 // 总期数
  const r = rate.value / 100 / 12 // 月利率

  if (method.value === 'equal-payment') {
    // 等额本息
    const monthly = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
    const totalPayment = monthly * n
    const totalInterest = totalPayment - p

    const schedule = []
    let balance = p
    for (let i = 1; i <= Math.min(12, n); i++) {
      const interest = balance * r
      const principalPart = monthly - interest
      balance -= principalPart
      schedule.push({
        period: i,
        monthly: monthly.toFixed(2),
        principal: principalPart.toFixed(2),
        interest: interest.toFixed(2),
        balance: Math.max(0, balance).toFixed(2)
      })
    }

    return {
      monthlyFirst: monthly.toFixed(2),
      totalInterest: totalInterest / 10000,
      totalPayment: totalPayment / 10000,
      schedule
    }
  } else {
    // 等额本金
    const monthlyPrincipal = p / n
    const firstInterest = p * r
    const firstMonthly = monthlyPrincipal + firstInterest
    const lastInterest = monthlyPrincipal * r
    const lastMonthly = monthlyPrincipal + lastInterest
    const totalInterest = (firstInterest + lastInterest) * n / 2
    const totalPayment = p + totalInterest

    const schedule = []
    let balance = p
    for (let i = 1; i <= Math.min(12, n); i++) {
      const interest = balance * r
      const monthly = monthlyPrincipal + interest
      balance -= monthlyPrincipal
      schedule.push({
        period: i,
        monthly: monthly.toFixed(2),
        principal: monthlyPrincipal.toFixed(2),
        interest: interest.toFixed(2),
        balance: Math.max(0, balance).toFixed(2)
      })
    }

    return {
      monthlyFirst: firstMonthly.toFixed(2),
      monthlyLast: lastMonthly.toFixed(2),
      totalInterest: totalInterest / 10000,
      totalPayment: totalPayment / 10000,
      schedule
    }
  }
})
</script>

<style scoped>
.mortgage-tool { display: flex; flex-direction: column; gap: 24px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.full-width { width: 100%; }
.result-section { display: flex; flex-direction: column; gap: 16px; }
.result-highlight { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.highlight-item { text-align: center; padding: 20px 8px; background: #ecf5ff; border-radius: 8px; }
.highlight-value { font-size: 24px; font-weight: 800; color: #409eff; }
.highlight-label { font-size: 12px; color: #909399; margin-top: 4px; }
.info-tip { margin: 0; }
.detail-section { display: flex; flex-direction: column; gap: 8px; }
.detail-title { font-size: 15px; font-weight: 600; color: #303133; margin: 0; }
@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .result-highlight { grid-template-columns: 1fr; }
  .highlight-value { font-size: 20px; }
}
</style>
