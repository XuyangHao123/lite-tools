<template>
  <ToolLayout title="单位换算" desc="免费在线单位换算工具，支持长度、重量、温度等多种单位互转，快速准确。">
    <div class="unit-converter">
      <!-- 类别选择 -->
      <el-radio-group v-model="category" class="category-tabs">
        <el-radio-button v-for="cat in categories" :key="cat.key" :value="cat.key">
          {{ cat.name }}
        </el-radio-button>
      </el-radio-group>

      <!-- 换算输入 -->
      <div class="convert-row">
        <div class="convert-input">
          <el-input-number
            v-model="inputValue"
            :controls="false"
            size="large"
            placeholder="输入数值"
            class="number-input"
          />
          <el-select v-model="fromUnit" size="large" class="unit-select">
            <el-option
              v-for="unit in currentUnits"
              :key="unit.key"
              :label="unit.name"
              :value="unit.key"
            />
          </el-select>
        </div>

        <el-button :icon="Switch" circle size="large" @click="swapUnits" class="swap-btn" />

        <div class="convert-input">
          <el-input
            :model-value="result"
            size="large"
            readonly
            placeholder="结果"
            class="number-input"
          />
          <el-select v-model="toUnit" size="large" class="unit-select">
            <el-option
              v-for="unit in currentUnits"
              :key="unit.key"
              :label="unit.name"
              :value="unit.key"
            />
          </el-select>
        </div>
      </div>

      <!-- 换算公式提示 -->
      <p class="convert-hint">
        {{ inputValue || 0 }} {{ fromUnitName }} = {{ result }} {{ toUnitName }}
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Switch } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

// 单位定义：所有单位先换算到基准单位，再从基准换算到目标
// toBase: 当前单位 -> 基准单位的转换函数
// fromBase: 基准单位 -> 当前单位的转换函数
const categories = [
  {
    key: 'length',
    name: '长度',
    base: 'm',
    units: [
      { key: 'mm', name: '毫米(mm)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { key: 'cm', name: '厘米(cm)', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { key: 'm', name: '米(m)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'km', name: '千米(km)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { key: 'in', name: '英寸(in)', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { key: 'ft', name: '英尺(ft)', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { key: 'mi', name: '英里(mi)', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 }
    ]
  },
  {
    key: 'weight',
    name: '重量',
    base: 'kg',
    units: [
      { key: 'mg', name: '毫克(mg)', toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
      { key: 'g', name: '克(g)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { key: 'kg', name: '千克(kg)', toBase: (v) => v, fromBase: (v) => v },
      { key: 't', name: '吨(t)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { key: 'lb', name: '磅(lb)', toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      { key: 'oz', name: '盎司(oz)', toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 }
    ]
  },
  {
    key: 'temperature',
    name: '温度',
    base: 'c',
    units: [
      { key: 'c', name: '摄氏度(°C)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'f', name: '华氏度(°F)', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
      { key: 'k', name: '开尔文(K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
    ]
  },
  {
    key: 'area',
    name: '面积',
    base: 'sqm',
    units: [
      { key: 'sqcm', name: '平方厘米(cm²)', toBase: (v) => v / 1e4, fromBase: (v) => v * 1e4 },
      { key: 'sqm', name: '平方米(m²)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'mu', name: '亩', toBase: (v) => v * 666.667, fromBase: (v) => v / 666.667 },
      { key: 'hectare', name: '公顷(ha)', toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
      { key: 'sqft', name: '平方英尺(ft²)', toBase: (v) => v * 0.092903, fromBase: (v) => v / 0.092903 },
      { key: 'acre', name: '英亩(acre)', toBase: (v) => v * 4046.86, fromBase: (v) => v / 4046.86 }
    ]
  }
]

const category = ref('length')
const inputValue = ref(1)
const fromUnit = ref('m')
const toUnit = ref('cm')

const currentCategory = computed(() =>
  categories.find((c) => c.key === category.value)
)

const currentUnits = computed(() => currentCategory.value.units)

const fromUnitObj = computed(() =>
  currentUnits.value.find((u) => u.key === fromUnit.value)
)
const toUnitObj = computed(() =>
  currentUnits.value.find((u) => u.key === toUnit.value)
)

const fromUnitName = computed(() => fromUnitObj.value?.name || '')
const toUnitName = computed(() => toUnitObj.value?.name || '')

const result = computed(() => {
  if (inputValue.value === null || inputValue.value === undefined) return ''
  const baseValue = fromUnitObj.value.toBase(inputValue.value)
  const resultValue = toUnitObj.value.fromBase(baseValue)
  // 保留合理精度
  return parseFloat(resultValue.toFixed(6)).toString()
})

// 切换类别时重置单位为该类别的前两个
function onCategoryChange() {
  const units = currentUnits.value
  fromUnit.value = units[0].key
  toUnit.value = units[1]?.key || units[0].key
}

// 监听类别变化
import { watch } from 'vue'
watch(category, onCategoryChange)

function swapUnits() {
  const tmp = fromUnit.value
  fromUnit.value = toUnit.value
  toUnit.value = tmp
}
</script>

<style scoped>
.unit-converter {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.category-tabs {
  flex-wrap: wrap;
}

.convert-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.convert-input {
  flex: 1;
  display: flex;
  gap: 8px;
}

.number-input {
  flex: 1;
}

.unit-select {
  width: 160px;
  flex-shrink: 0;
}

.swap-btn {
  flex-shrink: 0;
}

.convert-hint {
  font-size: 15px;
  color: #606266;
  text-align: center;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin: 0;
}

@media (max-width: 768px) {
  .convert-row {
    flex-direction: column;
  }

  .swap-btn {
    transform: rotate(90deg);
  }

  .unit-select {
    width: 120px;
  }
}
</style>
