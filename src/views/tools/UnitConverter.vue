<template>
  <ToolLayout
    title="单位换算"
    desc="免费在线单位换算工具，支持长度、重量、温度、面积、体积、速度、时间、数据存储、压力、功率、能量、角度等多类单位互转，附全单位对照表。"
    fav-key="unit-converter"
  >
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

        <el-button
          :icon="CopyDocument"
          circle
          size="large"
          @click="copyResult"
          :disabled="!result"
          class="copy-btn"
        />
      </div>

      <!-- 换算公式提示 -->
      <p class="convert-hint">
        {{ formatInput }} {{ fromUnitName }} = {{ result }} {{ toUnitName }}
      </p>

      <!-- 全单位对照表 -->
      <div class="compare-section">
        <div class="compare-header">
          <h3 class="compare-title">全单位对照表</h3>
          <span class="compare-sub">
            将 {{ formatInput }} {{ fromUnitName }} 换算到本类别所有单位
          </span>
        </div>
        <el-table :data="compareRows" border size="small" class="compare-table">
          <el-table-column prop="name" label="单位" min-width="160" />
          <el-table-column prop="value" label="换算结果" min-width="180">
            <template #default="{ row }">
              <span class="mono">{{ row.value }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button text :icon="CopyDocument" @click="copyVal(row.value)" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <p class="tool-tip">
        提示：所有单位先换算到基准单位，再由基准换算到目标单位。市制采用：1尺=1/3米、1寸=1/30尺、1丈=10尺、1斤=500g、1两=50g、1钱=5g、1亩=2000/3平方米。数据存储采用 1024 进制。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Switch, CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

// 单位定义：所有单位先换算到基准单位，再从基准换算到目标
// toBase: 当前单位 -> 基准单位
// fromBase: 基准单位 -> 当前单位
const MU_SQM = 2000 / 3 // 1 亩 = 2000/3 平方米（精确值）
const CHI_M = 1 / 3 // 1 尺 = 1/3 米
const CUN_M = CHI_M / 30 // 1 寸 = 1/30 尺
const ZHANG_M = CHI_M * 10 // 1 丈 = 10 尺

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
      { key: 'yd', name: '码(yd)', toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
      { key: 'mi', name: '英里(mi)', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
      { key: 'nmi', name: '海里(nmi)', toBase: (v) => v * 1852, fromBase: (v) => v / 1852 },
      { key: 'ly', name: '光年(ly)', toBase: (v) => v * 9.4607304725808e15, fromBase: (v) => v / 9.4607304725808e15 },
      // 市制
      { key: 'chi', name: '尺', toBase: (v) => v * CHI_M, fromBase: (v) => v / CHI_M },
      { key: 'cun', name: '寸', toBase: (v) => v * CUN_M, fromBase: (v) => v / CUN_M },
      { key: 'zhang', name: '丈', toBase: (v) => v * ZHANG_M, fromBase: (v) => v / ZHANG_M }
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
      { key: 'lb', name: '磅(lb)', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { key: 'oz', name: '盎司(oz)', toBase: (v) => v * 0.028349523125, fromBase: (v) => v / 0.028349523125 },
      // 市制
      { key: 'jin', name: '斤', toBase: (v) => v * 0.5, fromBase: (v) => v / 0.5 },
      { key: 'liang', name: '两', toBase: (v) => v * 0.05, fromBase: (v) => v / 0.05 },
      { key: 'qian', name: '钱', toBase: (v) => v * 0.005, fromBase: (v) => v / 0.005 }
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
      { key: 'mu', name: '亩', toBase: (v) => v * MU_SQM, fromBase: (v) => v / MU_SQM },
      { key: 'hectare', name: '公顷(ha)', toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
      { key: 'sqft', name: '平方英尺(ft²)', toBase: (v) => v * 0.09290304, fromBase: (v) => v / 0.09290304 },
      { key: 'acre', name: '英亩(acre)', toBase: (v) => v * 4046.8564224, fromBase: (v) => v / 4046.8564224 }
    ]
  },
  {
    key: 'volume',
    name: '体积',
    base: 'L',
    units: [
      { key: 'mL', name: '毫升(mL)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { key: 'L', name: '升(L)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'm3', name: '立方米(m³)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { key: 'gal', name: '美制加仑(gal)', toBase: (v) => v * 3.785411784, fromBase: (v) => v / 3.785411784 },
      { key: 'pt', name: '美制品脱(pt)', toBase: (v) => v * 0.473176473, fromBase: (v) => v / 0.473176473 },
      { key: 'ukgal', name: '英制加仑(ukgal)', toBase: (v) => v * 4.54609, fromBase: (v) => v / 4.54609 }
    ]
  },
  {
    key: 'speed',
    name: '速度',
    base: 'mps',
    units: [
      { key: 'mps', name: '米/秒(m/s)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'kmh', name: '千米/时(km/h)', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { key: 'mph', name: '英里/时(mph)', toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { key: 'knot', name: '节(knot)', toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 }
    ]
  },
  {
    key: 'time',
    name: '时间',
    base: 's',
    units: [
      { key: 's', name: '秒(s)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'min', name: '分(min)', toBase: (v) => v * 60, fromBase: (v) => v / 60 },
      { key: 'h', name: '时(h)', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { key: 'day', name: '天(day)', toBase: (v) => v * 86400, fromBase: (v) => v / 86400 },
      { key: 'week', name: '周(week)', toBase: (v) => v * 604800, fromBase: (v) => v / 604800 },
      { key: 'month', name: '月(month)', toBase: (v) => v * 2629800, fromBase: (v) => v / 2629800 },
      { key: 'year', name: '年(year)', toBase: (v) => v * 31557600, fromBase: (v) => v / 31557600 }
    ]
  },
  {
    key: 'data',
    name: '数据存储',
    base: 'B',
    units: [
      { key: 'bit', name: '比特(bit)', toBase: (v) => v / 8, fromBase: (v) => v * 8 },
      { key: 'B', name: '字节(B)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'KB', name: '千字节(KB)', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { key: 'MB', name: '兆字节(MB)', toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
      { key: 'GB', name: '吉字节(GB)', toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
      { key: 'TB', name: '太字节(TB)', toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
      { key: 'PB', name: '拍字节(PB)', toBase: (v) => v * 1024 ** 5, fromBase: (v) => v / 1024 ** 5 }
    ]
  },
  {
    key: 'pressure',
    name: '压力',
    base: 'Pa',
    units: [
      { key: 'Pa', name: '帕(Pa)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'kPa', name: '千帕(kPa)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { key: 'MPa', name: '兆帕(MPa)', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { key: 'bar', name: '巴(bar)', toBase: (v) => v * 1e5, fromBase: (v) => v / 1e5 },
      { key: 'psi', name: '磅/平方英寸(psi)', toBase: (v) => v * 6894.757293168, fromBase: (v) => v / 6894.757293168 },
      { key: 'atm', name: '标准大气压(atm)', toBase: (v) => v * 101325, fromBase: (v) => v / 101325 }
    ]
  },
  {
    key: 'power',
    name: '功率',
    base: 'W',
    units: [
      { key: 'W', name: '瓦(W)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'kW', name: '千瓦(kW)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { key: 'hp', name: '马力(hp)', toBase: (v) => v * 745.699872, fromBase: (v) => v / 745.699872 },
      { key: 'mhp', name: '公制马力(PS)', toBase: (v) => v * 735.49875, fromBase: (v) => v / 735.49875 }
    ]
  },
  {
    key: 'energy',
    name: '能量',
    base: 'J',
    units: [
      { key: 'J', name: '焦(J)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'kJ', name: '千焦(kJ)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { key: 'cal', name: '卡(cal)', toBase: (v) => v * 4.184, fromBase: (v) => v / 4.184 },
      { key: 'kcal', name: '千卡(kcal)', toBase: (v) => v * 4184, fromBase: (v) => v / 4184 },
      { key: 'Wh', name: '瓦时(Wh)', toBase: (v) => v * 3600, fromBase: (v) => v / 3600 },
      { key: 'kWh', name: '千瓦时(kWh)', toBase: (v) => v * 3.6e6, fromBase: (v) => v / 3.6e6 }
    ]
  },
  {
    key: 'angle',
    name: '角度',
    base: 'deg',
    units: [
      { key: 'deg', name: '度(°)', toBase: (v) => v, fromBase: (v) => v },
      { key: 'rad', name: '弧度(rad)', toBase: (v) => v * (180 / Math.PI), fromBase: (v) => v * (Math.PI / 180) },
      { key: 'grad', name: '梯度(grad)', toBase: (v) => v * 0.9, fromBase: (v) => v / 0.9 },
      { key: 'arcmin', name: '角分(′)', toBase: (v) => v / 60, fromBase: (v) => v * 60 },
      { key: 'arcsec', name: '角秒(″)', toBase: (v) => v / 3600, fromBase: (v) => v * 3600 }
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

// 格式化：保留 6 位有效小数，去尾零
function fmt(v) {
  if (v == null || isNaN(v)) return ''
  let s = parseFloat(v.toFixed(6)).toString()
  // 极大/极小数转科学计数法
  const abs = Math.abs(v)
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-6)) {
    s = v.toExponential(6).replace(/\.?0+e/, 'e')
  }
  return s
}

const formatInput = computed(() => fmt(inputValue.value))

const baseValue = computed(() => {
  if (inputValue.value === null || inputValue.value === undefined) return null
  return fromUnitObj.value.toBase(inputValue.value)
})

const result = computed(() => {
  if (baseValue.value === null) return ''
  return fmt(toUnitObj.value.fromBase(baseValue.value))
})

// 全单位对照表
const compareRows = computed(() => {
  if (baseValue.value === null) return []
  return currentUnits.value.map((u) => ({
    name: u.name,
    value: fmt(u.fromBase(baseValue.value))
  }))
})

// 切换类别时重置单位为该类别的前两个
watch(category, () => {
  const units = currentUnits.value
  fromUnit.value = units[0].key
  toUnit.value = units[1]?.key || units[0].key
})

function swapUnits() {
  const tmp = fromUnit.value
  fromUnit.value = toUnit.value
  toUnit.value = tmp
}

async function copyVal(text) {
  const ok = await copyText(text)
  ElMessage[ok ? 'success' : 'error'](ok ? '已复制：' + text : '复制失败')
}

async function copyResult() {
  if (!result.value) return
  await copyVal(`${formatInput.value} ${fromUnitName.value} = ${result.value} ${toUnitName.value}`)
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
  gap: 12px;
}

.convert-input {
  flex: 1;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.number-input {
  flex: 1;
  min-width: 0;
}

.unit-select {
  width: 160px;
  flex-shrink: 0;
}

.swap-btn,
.copy-btn {
  flex-shrink: 0;
}

.convert-hint {
  font-size: 15px;
  color: var(--color-text-regular);
  text-align: center;
  padding: 12px;
  background: var(--color-primary-light);
  border-radius: 6px;
  margin: 0;
  word-break: break-all;
}

.compare-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.compare-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.compare-sub {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.compare-table .mono {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  color: var(--color-text-primary);
}

.tool-tip {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin: 0;
  line-height: 1.8;
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

  .convert-input {
    width: 100%;
  }
}
</style>
