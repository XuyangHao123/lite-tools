<template>
  <ToolLayout
    title="BMI 计算器"
    desc="免费在线 BMI 身体质量指数计算器，支持公制/英制、性别年龄、体脂率、理想体重、BMR 基础代谢与 TDEE 估算，附中国/WHO/亚洲三种标准。"
    fav-key="bmi-calculator"
  >
    <div class="bmi-calculator">
      <!-- 顶部设置 -->
      <div class="top-bar">
        <el-radio-group v-model="unitMode" size="default">
          <el-radio-button value="metric">公制 (cm/kg)</el-radio-button>
          <el-radio-button value="imperial">英制 (ft/in/lb)</el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="standard" size="default">
          <el-radio-button value="china">中国标准</el-radio-button>
          <el-radio-button value="who">WHO 标准</el-radio-button>
          <el-radio-button value="asia">亚洲标准</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 输入区 -->
      <div class="bmi-input">
        <el-form label-position="top">
          <div class="form-row">
            <el-form-item label="性别">
              <el-radio-group v-model="gender" size="large">
                <el-radio-button value="male">男</el-radio-button>
                <el-radio-button value="female">女</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="年龄（岁）">
              <el-input-number
                v-model="age"
                :min="3"
                :max="120"
                :controls="false"
                size="large"
                placeholder="如 30"
                class="full-width"
              />
            </el-form-item>
          </div>

          <!-- 公制输入 -->
          <div v-if="unitMode === 'metric'" class="form-row">
            <el-form-item label="身高（厘米）">
              <el-input-number
                v-model="heightCm"
                :min="50"
                :max="250"
                :controls="false"
                size="large"
                placeholder="如 170"
                class="full-width"
              />
            </el-form-item>
            <el-form-item label="体重（千克）">
              <el-input-number
                v-model="weightKg"
                :min="10"
                :max="300"
                :controls="false"
                size="large"
                placeholder="如 65"
                class="full-width"
              />
            </el-form-item>
          </div>

          <!-- 英制输入 -->
          <div v-else class="form-row">
            <el-form-item label="身高（英尺）">
              <el-input-number
                v-model="heightFt"
                :min="1"
                :max="8"
                :controls="false"
                size="large"
                placeholder="如 5"
                class="full-width"
              />
            </el-form-item>
            <el-form-item label="身高（英寸）">
              <el-input-number
                v-model="heightIn"
                :min="0"
                :max="11"
                :controls="false"
                size="large"
                placeholder="如 7"
                class="full-width"
              />
            </el-form-item>
            <el-form-item label="体重（磅）">
              <el-input-number
                v-model="weightLb"
                :min="20"
                :max="660"
                :controls="false"
                size="large"
                placeholder="如 150"
                class="full-width"
              />
            </el-form-item>
          </div>
        </el-form>
      </div>

      <!-- 结果区 -->
      <div v-if="bmi" class="bmi-result">
        <div class="bmi-main">
          <div class="bmi-value" :style="{ color: category.color }">{{ bmi }}</div>
          <div class="bmi-category" :style="{ background: category.bg, color: category.color }">
            {{ category.label }}
          </div>
          <p class="bmi-desc">{{ category.desc }}</p>
          <el-button text :icon="CopyDocument" @click="copyAll" class="copy-btn">复制结果</el-button>
        </div>

        <!-- 派生指标 -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">体脂率</div>
            <div class="metric-value">{{ bodyFat || '—' }}<span class="unit">%</span></div>
            <div class="metric-hint">{{ bodyFatHint }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">理想体重</div>
            <div class="metric-value">{{ idealWeight || '—' }}<span class="unit">kg</span></div>
            <div class="metric-hint">{{ idealWeightHint }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">BMR 基础代谢</div>
            <div class="metric-value">{{ bmr || '—' }}<span class="unit">kcal</span></div>
            <div class="metric-hint">Mifflin-St Jeor 公式</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">TDEE 总消耗</div>
            <div class="metric-value">{{ tdee || '—' }}<span class="unit">kcal</span></div>
            <div class="metric-hint">BMR × {{ activityFactor }}</div>
          </div>
        </div>

        <!-- 活动量 -->
        <div class="activity-row">
          <span class="activity-label">活动量：</span>
          <el-select v-model="activity" size="default" class="activity-select">
            <el-option
              v-for="a in activities"
              :key="a.key"
              :label="`${a.name}（×${a.factor}）`"
              :value="a.key"
            />
          </el-select>
        </div>
      </div>

      <!-- 参考表 -->
      <div class="bmi-table">
        <h3 class="table-title">BMI 参考标准（{{ currentStandard.name }}）</h3>
        <el-table :data="currentStandard.ranges" border size="small" class="full-width">
          <el-table-column prop="range" label="BMI 范围" />
          <el-table-column prop="label" label="分类" />
        </el-table>
      </div>

      <p class="tool-tip">
        提示：BMI = 体重(kg) ÷ 身高(m)²。体脂率采用 Deurenberg 公式（仅适用于成人）。
        儿童请参考 WHO 生长曲线（百分位法）。该指标仅作参考，不适用于运动员、孕妇等特殊人群。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const unitMode = ref('metric')
const standard = ref('china')
const gender = ref('male')
const age = ref(25)
const heightCm = ref(null)
const weightKg = ref(null)
const heightFt = ref(null)
const heightIn = ref(null)
const weightLb = ref(null)
const activity = ref('light')

const activities = [
  { key: 'sedentary', name: '久坐（无运动）', factor: 1.2 },
  { key: 'light', name: '轻度（每周1-3次）', factor: 1.375 },
  { key: 'moderate', name: '中度（每周3-5次）', factor: 1.55 },
  { key: 'heavy', name: '重度（每周6-7次）', factor: 1.725 },
  { key: 'veryHeavy', name: '极重（体力劳动/运动员）', factor: 1.9 }
]

const activityFactor = computed(() =>
  activities.find((a) => a.key === activity.value)?.factor ?? 1.2
)

// 三种标准：max 为该区间的上界（不包含），按顺序匹配第一个 v < max 的区间
const standards = {
  china: {
    name: '中国标准',
    ranges: [
      { range: '< 18.5', max: 18.5, label: '偏瘦', color: '#909399', bg: '#f4f4f5', desc: '体重偏低，建议适当增加营养摄入。' },
      { range: '18.5 ~ 23.9', max: 24.0, label: '正常', color: '#67c23a', bg: '#f0f9eb', desc: '体重正常，继续保持良好的生活习惯！' },
      { range: '24.0 ~ 27.9', max: 28.0, label: '偏胖', color: '#e6a23c', bg: '#fdf6ec', desc: '体重偏高，建议控制饮食并增加运动。' },
      { range: '≥ 28.0', max: Infinity, label: '肥胖', color: '#f56c6c', bg: '#fef0f0', desc: '肥胖，建议咨询医生并制定减重计划。' }
    ]
  },
  who: {
    name: 'WHO 标准',
    ranges: [
      { range: '< 18.5', max: 18.5, label: '偏瘦', color: '#909399', bg: '#f4f4f5', desc: '体重偏低。' },
      { range: '18.5 ~ 24.9', max: 25.0, label: '正常', color: '#67c23a', bg: '#f0f9eb', desc: '体重正常。' },
      { range: '25.0 ~ 29.9', max: 30.0, label: '偏胖', color: '#e6a23c', bg: '#fdf6ec', desc: '超重，建议适度控制。' },
      { range: '≥ 30.0', max: Infinity, label: '肥胖', color: '#f56c6c', bg: '#fef0f0', desc: '肥胖，建议就医减重。' }
    ]
  },
  asia: {
    name: '亚洲标准',
    ranges: [
      { range: '< 18.5', max: 18.5, label: '偏瘦', color: '#909399', bg: '#f4f4f5', desc: '体重偏低。' },
      { range: '18.5 ~ 22.9', max: 23.0, label: '正常', color: '#67c23a', bg: '#f0f9eb', desc: '体重正常。' },
      { range: '23.0 ~ 24.9', max: 25.0, label: '偏胖', color: '#e6a23c', bg: '#fdf6ec', desc: '超重前期。' },
      { range: '25.0 ~ 29.9', max: 30.0, label: '肥胖', color: '#f56c6c', bg: '#fef0f0', desc: '一级肥胖。' },
      { range: '≥ 30.0', max: Infinity, label: '重度肥胖', color: '#f56c6c', bg: '#fef0f0', desc: '二级肥胖，建议就医。' }
    ]
  }
}

const currentStandard = computed(() => standards[standard.value])

const effectiveHeightCm = computed(() => {
  if (unitMode.value === 'metric') return heightCm.value
  if (heightFt.value == null && heightIn.value == null) return null
  const ft = heightFt.value || 0
  const inch = heightIn.value || 0
  return ft * 30.48 + inch * 2.54
})

const effectiveWeightKg = computed(() => {
  if (unitMode.value === 'metric') return weightKg.value
  if (weightLb.value == null) return null
  return weightLb.value * 0.45359237
})

const isChild = computed(() => age.value != null && age.value < 18)
const isElderly = computed(() => age.value != null && age.value >= 65)

const bmi = computed(() => {
  const h = effectiveHeightCm.value
  const w = effectiveWeightKg.value
  if (!h || !w || h <= 0) return null
  const hm = h / 100
  const value = w / (hm * hm)
  return value.toFixed(1)
})

const category = computed(() => {
  if (!bmi.value) return { label: '', color: '#303133', bg: '#f5f7fa', desc: '' }
  // 儿童不使用成人分类
  if (isChild.value) {
    return {
      label: '请参考 WHO 生长曲线',
      color: '#909399',
      bg: '#f4f4f5',
      desc: '儿童 BMI 需结合性别与年龄查百分位表判定，本工具仅提供数值。'
    }
  }
  const v = parseFloat(bmi.value)
  const ranges = currentStandard.value.ranges
  const found = ranges.find((r) => v < r.max) || ranges[ranges.length - 1]
  let desc = found.desc
  if (isElderly.value) {
    desc += '（老年人 BMI 适当放宽，正常范围约 20~26.9）'
  }
  return { ...found, desc }
})

// 体脂率：Deurenberg 公式（仅成人）
const bodyFat = computed(() => {
  if (!bmi.value || isChild.value) return null
  const v = parseFloat(bmi.value)
  const sex = gender.value === 'male' ? 1 : 0
  const bf = 1.2 * v + 0.23 * age.value - 10.8 * sex - 5.4
  return Math.max(0, bf).toFixed(1)
})
const bodyFatHint = computed(() => {
  if (isChild.value) return 'Deurenberg 公式不适用于儿童'
  if (!bodyFat.value) return '需输入身高、体重、年龄'
  const bf = parseFloat(bodyFat.value)
  const normalLow = gender.value === 'male' ? 10 : 20
  const normalHigh = gender.value === 'male' ? 20 : 30
  if (bf < normalLow) return '偏低'
  if (bf <= normalHigh) return '正常范围'
  return '偏高'
})

// 理想体重
const idealWeight = computed(() => {
  const h = effectiveHeightCm.value
  if (!h) return null
  const w = gender.value === 'male' ? (h - 80) * 0.7 : (h - 70) * 0.6
  return w > 0 ? w.toFixed(1) : null
})
const idealWeightHint = computed(() => {
  if (!idealWeight.value) return ''
  return gender.value === 'male' ? '(身高-80)×0.7' : '(身高-70)×0.6'
})

// BMR：Mifflin-St Jeor
const bmr = computed(() => {
  const h = effectiveHeightCm.value
  const w = effectiveWeightKg.value
  if (!h || !w || age.value == null) return null
  const s = gender.value === 'male' ? 5 : -161
  const v = 10 * w + 6.25 * h - 5 * age.value + s
  return Math.max(0, v).toFixed(0)
})

// TDEE
const tdee = computed(() => {
  if (!bmr.value) return null
  return (parseFloat(bmr.value) * activityFactor.value).toFixed(0)
})

async function copyAll() {
  if (!bmi.value) return
  const lines = [
    `BMI：${bmi.value}（${category.value.label}）`,
    bodyFat.value ? `体脂率：${bodyFat.value}%（${bodyFatHint.value}）` : '体脂率：不适用',
    idealWeight.value ? `理想体重：${idealWeight.value} kg` : '',
    bmr.value ? `BMR：${bmr.value} kcal` : '',
    tdee.value ? `TDEE：${tdee.value} kcal` : '',
    `标准：${currentStandard.value.name}`
  ].filter(Boolean)
  const ok = await copyText(lines.join('\n'))
  ElMessage[ok ? 'success' : 'error'](ok ? '已复制结果' : '复制失败')
}
</script>

<style scoped>
.bmi-calculator {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.bmi-input {
  max-width: 640px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full-width {
  width: 100%;
}

.bmi-result {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: var(--color-primary-light);
  border-radius: 8px;
}

.bmi-main {
  text-align: center;
}

.bmi-value {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.2;
}

.bmi-category {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.bmi-desc {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.copy-btn {
  margin-top: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.metric-card {
  text-align: center;
  padding: 16px 8px;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.metric-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  margin-top: 4px;
}

.metric-value .unit {
  font-size: 13px;
  font-weight: 400;
  margin-left: 2px;
  color: var(--color-text-regular);
}

.metric-hint {
  font-size: 11px;
  color: var(--color-text-placeholder);
  margin-top: 4px;
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.activity-label {
  font-size: 13px;
  color: var(--color-text-regular);
}

.activity-select {
  width: 240px;
}

.bmi-table {
  margin-top: 0;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}

.tool-tip {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin: 0;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bmi-value {
    font-size: 36px;
  }

  .activity-select {
    width: 100%;
  }
}
</style>
