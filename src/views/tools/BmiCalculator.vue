<template>
  <ToolLayout title="BMI 计算器" desc="免费在线 BMI 身体质量指数计算器，输入身高体重即可计算，附健康范围参考。">
    <div class="bmi-calculator">
      <!-- 输入区 -->
      <div class="bmi-input">
        <el-form label-position="top">
          <el-form-item label="身高（厘米）">
            <el-input-number
              v-model="height"
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
              v-model="weight"
              :min="10"
              :max="300"
              :controls="false"
              size="large"
              placeholder="如 65"
              class="full-width"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 结果区 -->
      <div v-if="bmi" class="bmi-result">
        <div class="bmi-value" :style="{ color: category.color }">
          {{ bmi }}
        </div>
        <div class="bmi-category" :style="{ background: category.bg, color: category.color }">
          {{ category.label }}
        </div>
        <p class="bmi-desc">{{ category.desc }}</p>
      </div>

      <!-- 参考表 -->
      <div class="bmi-table">
        <h3 class="table-title">BMI 参考标准（中国标准）</h3>
        <el-table :data="bmiRanges" border size="small" class="full-width">
          <el-table-column prop="range" label="BMI 范围" />
          <el-table-column prop="label" label="分类" />
        </el-table>
      </div>

      <p class="tool-tip">
        提示：BMI = 体重(kg) ÷ 身高(m)²。该指标仅作参考，不适用于运动员、孕妇等特殊人群。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import ToolLayout from '@/components/ToolLayout.vue'

const height = ref(null)
const weight = ref(null)

const bmiRanges = [
  { range: '< 18.5', label: '偏瘦', color: '#909399', bg: '#f4f4f5' },
  { range: '18.5 ~ 23.9', label: '正常', color: '#67c23a', bg: '#f0f9eb' },
  { range: '24.0 ~ 27.9', label: '偏胖', color: '#e6a23c', bg: '#fdf6ec' },
  { range: '≥ 28.0', label: '肥胖', color: '#f56c6c', bg: '#fef0f0' }
]

const bmi = computed(() => {
  if (!height.value || !weight.value) return null
  const h = height.value / 100
  const value = weight.value / (h * h)
  return value.toFixed(1)
})

const category = computed(() => {
  if (!bmi.value) return { label: '', color: '#303133', bg: '#f5f7fa', desc: '' }
  const v = parseFloat(bmi.value)
  if (v < 18.5) return { ...bmiRanges[0], desc: '体重偏低，建议适当增加营养摄入。' }
  if (v < 24) return { ...bmiRanges[1], desc: '体重正常，继续保持良好的生活习惯！' }
  if (v < 28) return { ...bmiRanges[2], desc: '体重偏高，建议控制饮食并增加运动。' }
  return { ...bmiRanges[3], desc: '肥胖，建议咨询医生并制定减重计划。' }
})
</script>

<style scoped>
.bmi-calculator {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.bmi-input {
  max-width: 400px;
}

.full-width {
  width: 100%;
}

.bmi-result {
  text-align: center;
  padding: 24px;
  background: #f5f7fa;
  border-radius: 8px;
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
  color: #909399;
}

.bmi-table {
  margin-top: 8px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}

.tool-tip {
  font-size: 12px;
  color: #c0c4cc;
  margin: 0;
}

@media (max-width: 768px) {
  .bmi-value {
    font-size: 36px;
  }
}
</style>
