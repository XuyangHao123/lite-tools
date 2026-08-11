<template>
  <ToolLayout
    title="CSS 渐变生成器"
    desc="免费在线 CSS 渐变生成器，支持线性/径向/圆锥/重复渐变，可视化调色、透明度与预设画廊，一键复制含 -webkit- 前缀代码，本地处理。"
    fav-key="css-gradient"
  >
    <div class="gradient-tool">
      <!-- 预览 -->
      <div class="gradient-preview" :style="{ background: cssCode }"></div>

      <!-- 类型 -->
      <div class="config-section">
        <label class="config-title">渐变类型</label>
        <el-radio-group v-model="type">
          <el-radio-button value="linear">线性渐变</el-radio-button>
          <el-radio-button value="radial">径向渐变</el-radio-button>
          <el-radio-button value="conic">圆锥渐变</el-radio-button>
          <el-radio-button value="repeating-linear">重复线性</el-radio-button>
          <el-radio-button value="repeating-radial">重复径向</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 线性 / 重复线性：角度 -->
      <div v-if="type === 'linear' || type === 'repeating-linear'" class="config-section">
        <label class="config-title">角度</label>
        <el-slider v-model="angle" :min="0" :max="360" :step="5" show-input :show-input-controls="false" />
      </div>

      <!-- 圆锥：起始角度 -->
      <div v-if="type === 'conic'" class="config-section">
        <label class="config-title">起始角度 (from)</label>
        <el-slider v-model="angle" :min="0" :max="360" :step="5" show-input :show-input-controls="false" />
      </div>

      <!-- 径向 / 重复径向：形状与位置 -->
      <div v-if="type === 'radial' || type === 'repeating-radial'" class="config-section">
        <label class="config-title">形状</label>
        <el-radio-group v-model="radialShape">
          <el-radio-button value="circle">circle 圆形</el-radio-button>
          <el-radio-button value="ellipse">ellipse 椭圆</el-radio-button>
        </el-radio-group>
        <label class="config-title" style="margin-top:8px">尺寸关键字</label>
        <el-select v-model="radialSize" size="small" style="width:200px">
          <el-option label="默认（不指定）" value="" />
          <el-option label="closest-side" value="closest-side" />
          <el-option label="closest-corner" value="closest-corner" />
          <el-option label="farthest-side" value="farthest-side" />
          <el-option label="farthest-corner" value="farthest-corner" />
        </el-select>
        <label class="config-title" style="margin-top:8px">圆心位置 (at)</label>
        <el-select v-model="radialPosition" size="small" style="width:200px">
          <el-option label="默认（center）" value="" />
          <el-option label="center" value="center" />
          <el-option label="top" value="top" />
          <el-option label="bottom" value="bottom" />
          <el-option label="left" value="left" />
          <el-option label="right" value="right" />
          <el-option label="top left" value="top left" />
          <el-option label="top right" value="top right" />
          <el-option label="bottom left" value="bottom left" />
          <el-option label="bottom right" value="bottom right" />
        </el-select>
      </div>

      <!-- 颜色节点 -->
      <div class="config-section">
        <label class="config-title">颜色节点（支持透明度）</label>
        <div class="stops-list">
          <div v-for="(stop, i) in stops" :key="i" class="stop-item">
            <el-color-picker v-model="stop.color" show-alpha />
            <el-slider v-model="stop.pos" :min="0" :max="100" :step="1" class="stop-slider" />
            <span class="stop-pos">{{ stop.pos }}%</span>
            <el-button :icon="Delete" circle size="small" @click="removeStop(i)" v-if="stops.length > 2" />
          </div>
        </div>
        <el-button size="small" :icon="Plus" @click="addStop">添加颜色节点</el-button>
      </div>

      <!-- 预设画廊 -->
      <div class="config-section">
        <label class="config-title">预设画廊</label>
        <div class="preset-gallery">
          <div
            v-for="(p, i) in presets"
            :key="i"
            class="preset-item"
            :style="{ background: p.css }"
            :title="p.name"
            @click="applyPreset(p)"
          >
            <span class="preset-name">{{ p.name }}</span>
          </div>
        </div>
      </div>

      <!-- 代码输出 -->
      <div class="code-section">
        <label class="config-title">CSS 代码（含 -webkit- 前缀）</label>
        <el-input :model-value="cssCodeFull" readonly type="textarea" :rows="4" />
        <el-button type="primary" :icon="CopyDocument" @click="copyCode" style="margin-top:8px">复制代码</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CopyDocument, Delete, Plus } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const type = ref('linear')
const angle = ref(90)
const radialShape = ref('circle')
const radialSize = ref('')
const radialPosition = ref('')
const stops = ref([
  { color: 'rgba(64,158,255,1)', pos: 0 },
  { color: 'rgba(103,194,58,1)', pos: 50 },
  { color: 'rgba(245,108,108,1)', pos: 100 }
])

const stopsStr = computed(() =>
  stops.value
    .slice()
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${s.pos}%`)
    .join(', ')
)

const gradientFn = computed(() => {
  switch (type.value) {
    case 'linear': return 'linear-gradient'
    case 'radial': return 'radial-gradient'
    case 'conic': return 'conic-gradient'
    case 'repeating-linear': return 'repeating-linear-gradient'
    case 'repeating-radial': return 'repeating-radial-gradient'
    default: return 'linear-gradient'
  }
})

const cssCode = computed(() => {
  const fn = gradientFn.value
  if (fn === 'linear-gradient' || fn === 'repeating-linear-gradient') {
    return `${fn}(${angle.value}deg, ${stopsStr.value})`
  }
  if (fn === 'conic-gradient') {
    return `${fn}(from ${angle.value}deg, ${stopsStr.value})`
  }
  // 径向（含重复径向）
  const shapePart = radialShape.value
  const sizePart = radialSize.value ? ' ' + radialSize.value : ''
  const posPart = radialPosition.value ? ` at ${radialPosition.value}` : ''
  const config = (shapePart + sizePart + posPart).trim()
  return config ? `${fn}(${config}, ${stopsStr.value})` : `${fn}(${stopsStr.value})`
})

const cssCodeFull = computed(() => {
  return `background: ${cssCode.value};\nbackground: -webkit-${cssCode.value};`
})

function addStop() {
  stops.value.push({ color: 'rgba(144,147,153,1)', pos: 50 })
}

function removeStop(i) {
  stops.value.splice(i, 1)
}

async function copyCode() {
  const ok = await copyText(cssCodeFull.value)
  ok ? ElMessage.success('代码已复制') : ElMessage.error('复制失败，请手动复制')
}

// 应用预设：解析预设 css 字符串，尽量还原到控件
function applyPreset(p) {
  // 先尝试解析类型与参数
  const css = p.css
  // 提取颜色节点（含 rgba/hex/#rrggbb + 位置%）
  const stopRe = /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s+(\d+)%/g
  const newStops = []
  let mm
  while ((mm = stopRe.exec(css)) !== null) {
    newStops.push({ color: mm[1].trim(), pos: Number(mm[2]) })
  }
  if (newStops.length < 2) {
    // 无法解析，仅复制代码
    copyCode()
    return
  }

  // 判定类型
  if (css.includes('conic-gradient')) {
    type.value = 'conic'
    const fromM = css.match(/from\s+(-?\d+)deg/)
    if (fromM) angle.value = Number(fromM[1])
  } else if (css.includes('repeating-linear-gradient')) {
    type.value = 'repeating-linear'
    const a = css.match(/repeating-linear-gradient\(\s*(-?\d+)deg/)
    if (a) angle.value = Number(a[1])
  } else if (css.includes('repeating-radial-gradient')) {
    type.value = 'repeating-radial'
  } else if (css.includes('radial-gradient')) {
    type.value = 'radial'
    const shapeM = css.match(/radial-gradient\(\s*(circle|ellipse)/)
    if (shapeM) radialShape.value = shapeM[1]
    const sizeM = css.match(/(closest-side|closest-corner|farthest-side|farthest-corner)/)
    radialSize.value = sizeM ? sizeM[1] : ''
    const posM = css.match(/at\s+([a-z ]+?)(?:,|\))/)
    radialPosition.value = posM ? posM[1].trim() : ''
  } else {
    type.value = 'linear'
    const a = css.match(/linear-gradient\(\s*(-?\d+)deg/)
    if (a) angle.value = Number(a[1])
  }
  stops.value = newStops
}

const presets = [
  { name: '日落', css: 'linear-gradient(90deg, #ff512f 0%, #f09819 100%)' },
  { name: '海洋', css: 'linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: '紫罗兰', css: 'linear-gradient(90deg, #4776e6 0%, #8e54e9 100%)' },
  { name: '薄荷', css: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)' },
  { name: '桃粉', css: 'linear-gradient(90deg, #ff9a9e 0%, #fad0c4 100%)' },
  { name: '深夜', css: 'linear-gradient(90deg, #232526 0%, #414345 100%)' },
  { name: '火焰', css: 'linear-gradient(90deg, #f12711 0%, #f5af19 100%)' },
  { name: '极光', css: 'linear-gradient(90deg, #00c6ff 0%, #0072ff 100%)' },
  { name: '草莓', css: 'linear-gradient(90deg, #e64980 0%, #f783ac 100%)' },
  { name: '森林', css: 'linear-gradient(90deg, #134e5e 0%, #71b280 100%)' },
  { name: '阳光', css: 'radial-gradient(circle at center, #fceabb 0%, #f8b500 100%)' },
  { name: '光晕', css: 'radial-gradient(circle farthest-corner at top left, #00dbde 0%, #fc00ff 100%)' },
  { name: '彩虹环', css: 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f0a500)' },
  { name: '霓虹', css: 'repeating-linear-gradient(45deg, #fc28a8 0px, #fc28a8 10px, #03edda 10px, #03edda 20px)' },
  { name: '斑马线', css: 'repeating-linear-gradient(45deg, #fff 0px, #fff 10px, #333 10px, #333 20px)' },
  { name: '波纹', css: 'repeating-radial-gradient(circle at center, #fff 0px, #fff 8px, #409eff 8px, #409eff 16px)' }
]
</script>

<style scoped>
.gradient-tool { display: flex; flex-direction: column; gap: 20px; }
.gradient-preview {
  width: 100%; height: 200px;
  border-radius: var(--radius, 8px);
  border: 1px solid var(--color-border, #ebeef5);
  box-shadow: var(--shadow-sm);
}
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.stops-list { display: flex; flex-direction: column; gap: 8px; }
.stop-item { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.stop-slider { width: 140px; }
.stop-pos { font-size: 12px; color: var(--color-text-secondary, #909399); width: 40px; }

.preset-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.preset-item {
  height: 56px; border-radius: 6px;
  border: 1px solid var(--color-border, #ebeef5);
  cursor: pointer; position: relative; overflow: hidden;
  display: flex; align-items: flex-end; justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.preset-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.preset-name {
  font-size: 11px; color: #fff;
  background: rgba(0,0,0,0.4); padding: 2px 8px;
  border-radius: 4px; margin-bottom: 4px;
}

.code-section { display: flex; flex-direction: column; gap: 8px; }
</style>
