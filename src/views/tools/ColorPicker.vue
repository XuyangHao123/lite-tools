<template>
  <ToolLayout
    title="颜色选择器"
    desc="免费在线颜色选择器，支持 HEX/RGB/HSL/HSV/CMYK 互转、配色方案、图片取色与主色调提取，本地处理。"
    fav-key="color-picker"
  >
    <div class="color-tool">
      <!-- 颜色选择 -->
      <div class="picker-section">
        <div class="picker-area">
          <el-color-picker v-model="color" :show-alpha="true" size="large" />
          <div class="color-preview" :style="{ background: previewBg }"></div>
          <el-button :icon="Star" @click="saveColor">存入色板</el-button>
        </div>

        <!-- 格式转换 -->
        <div class="format-grid">
          <div v-for="f in formats" :key="f.label" class="format-item">
            <span class="format-label">{{ f.label }}</span>
            <el-input :model-value="f.value" readonly size="default">
              <template #append>
                <el-button :icon="CopyDocument" @click="copy(f.value)" />
              </template>
            </el-input>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 调色板生成 -->
      <div class="palette-section">
        <h3 class="section-title">配色方案</h3>
        <div class="palette-types">
          <el-radio-group v-model="paletteType" size="small">
            <el-radio-button value="complementary">互补色</el-radio-button>
            <el-radio-button value="analogous">类似色</el-radio-button>
            <el-radio-button value="triadic">三角色</el-radio-button>
            <el-radio-button value="shades">明暗渐变</el-radio-button>
          </el-radio-group>
        </div>
        <div class="palette-display">
          <div
            v-for="(c, i) in palette"
            :key="i"
            class="palette-color"
            :style="{ background: c }"
            @click="color = c"
          >
            <span class="palette-hex">{{ c }}</span>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 已存色板 -->
      <div class="saved-section">
        <h3 class="section-title">我的色板（本地保存）</h3>
        <div v-if="savedColors.length" class="palette-display">
          <div
            v-for="(c, i) in savedColors"
            :key="i"
            class="palette-color saved"
            :style="{ background: c }"
            @click="color = c"
          >
            <span class="palette-hex">{{ c }}</span>
            <el-icon class="remove-x" @click.stop="removeSaved(i)"><Close /></el-icon>
          </div>
        </div>
        <p v-else class="empty-tip">点击上方“存入色板”可保存常用颜色（保存在浏览器本地）。</p>
      </div>

      <el-divider />

      <!-- 从图片取色 -->
      <div class="extract-section">
        <h3 class="section-title">从图片取色</h3>
        <FileUploader
          ref="uploaderRef"
          v-model="fileList"
          :show-file-list="false"
          accept=".jpg,.jpeg,.png,.webp"
          tip="上传 JPG/PNG/WebP 图片，自动提取主色调，可点击图片像素吸管取色"
        />

        <template v-if="pickImgUrl">
          <div class="extract-controls">
            <el-checkbox v-model="eyedropper">吸管模式（点击图片任意像素取该点颜色）</el-checkbox>
            <div class="count-control">
              <span class="config-title">主色调数量</span>
              <el-slider v-model="extractCount" :min="3" :max="12" :step="1" show-input :show-input-controls="false" style="max-width: 260px" />
            </div>
          </div>

          <div class="pick-stage" :class="{ eyedropper }">
            <img
              ref="pickImgRef"
              :src="pickImgUrl"
              class="pick-image"
              alt="取色图"
              draggable="false"
              @click="onPickClick"
            />
          </div>

          <div v-if="extractedColors.length" class="extracted-display">
            <div
              v-for="(c, i) in extractedColors"
              :key="i"
              class="extracted-color"
              :style="{ background: c }"
              @click="color = c"
            >
              <span class="palette-hex">{{ c }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { CopyDocument, Star, Close } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'
import { loadImage } from '@/composables/useImageProcessor'

const color = ref('#409eff')
const paletteType = ref('complementary')
const fileList = ref([])
const uploaderRef = ref()
const extractedColors = ref([])
const extractCount = ref(6)
const eyedropper = ref(false)

// 取色图
const pickImgRef = ref()
const pickImgUrl = ref('')
let pickImgEl = null

// 已存色板
const STORAGE_KEY = 'colorPicker.savedPalette'
const savedColors = ref([])

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) savedColors.value = JSON.parse(raw) || []
  } catch (e) {
    savedColors.value = []
  }
})

function persistSaved() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedColors.value))
  } catch (e) {
    /* 忽略配额错误 */
  }
}

// ===== 颜色解析/转换 =====
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function parseColor(str) {
  if (!str) return { r: 0, g: 0, b: 0, a: 1 }
  const s = String(str).trim()
  if (s.startsWith('#')) {
    let hex = s.slice(1)
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100
      }
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    }
  }
  const m = s.match(/rgba?\(([^)]+)\)/i)
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()))
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] == null ? 1 : clamp(parts[3], 0, 1) }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

function toHexByte(x) {
  return Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')
}
function rgbToHex(r, g, b) {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
}
function rgbToHex8(r, g, b, a) {
  const base = rgbToHex(r, g, b)
  if (a >= 1) return base
  return base + toHexByte(a * 255)
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) }
}

function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const k = 1 - Math.max(r, g, b)
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 }
  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  }
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

const parsed = computed(() => parseColor(color.value))

const previewBg = computed(() => color.value)

const formats = computed(() => {
  const { r, g, b, a } = parsed.value
  const { h, s, l } = rgbToHsl(r, g, b)
  const hsv = rgbToHsv(r, g, b)
  const cmyk = rgbToCmyk(r, g, b)
  const hex8 = rgbToHex8(r, g, b, a)
  const rgba = a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`
  const hsla = a >= 1 ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${a})`
  return [
    { label: 'HEX', value: hex8.toUpperCase() },
    { label: 'RGB', value: rgba },
    { label: 'HSL', value: hsla },
    { label: 'HSV', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
    { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` }
  ]
})

const palette = computed(() => {
  const { r, g, b } = parsed.value
  const { h, s, l } = rgbToHsl(r, g, b)
  switch (paletteType.value) {
    case 'complementary':
      return [rgbToHex8(r, g, b, parsed.value.a), hslToHex((h + 180) % 360, s, l)]
    case 'analogous':
      return [
        hslToHex((h + 330) % 360, s, l),
        rgbToHex8(r, g, b, parsed.value.a),
        hslToHex((h + 30) % 360, s, l)
      ]
    case 'triadic':
      return [
        rgbToHex8(r, g, b, parsed.value.a),
        hslToHex((h + 120) % 360, s, l),
        hslToHex((h + 240) % 360, s, l)
      ]
    case 'shades':
      return [0, 25, 50, 75, 100].map((p) =>
        hslToHex(h, s, Math.max(10, Math.min(90, l + (p - 50) / 2)))
      )
    default:
      return [rgbToHex8(r, g, b, parsed.value.a)]
  }
})

// ===== 图片取色 =====
watch(fileList, async (files) => {
  if (pickImgUrl.value) {
    URL.revokeObjectURL(pickImgUrl.value)
    pickImgUrl.value = ''
  }
  extractedColors.value = []
  if (!files.length) return
  try {
    pickImgEl = await loadImage(files[0].raw)
    pickImgUrl.value = URL.createObjectURL(files[0].raw)
    extractedColors.value = extractColors(pickImgEl, extractCount.value)
  } catch (e) {
    ElMessage.error('图片加载失败：' + (e.message || e))
  }
})

watch(extractCount, () => {
  if (pickImgEl) extractedColors.value = extractColors(pickImgEl, extractCount.value)
})

/** 按色相聚类提取主色调 */
function extractColors(img, count) {
  const maxDim = 100
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  const bins = {}
  const gray = { r: 0, g: 0, b: 0, count: 0 }
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 125) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const { h: hue, s } = rgbToHsl(r, g, b)
    if (s < 0.12) {
      gray.r += r; gray.g += g; gray.b += b; gray.count++
    } else {
      const bin = Math.floor(hue / 15) * 15
      if (!bins[bin]) bins[bin] = { r: 0, g: 0, b: 0, count: 0 }
      bins[bin].r += r; bins[bin].g += g; bins[bin].b += b; bins[bin].count++
    }
  }
  const arr = Object.values(bins).filter((x) => x.count > 0)
  if (gray.count > 0) arr.push(gray)
  arr.sort((a, b) => b.count - a.count)
  return arr.slice(0, count).map((x) =>
    rgbToHex(Math.round(x.r / x.count), Math.round(x.g / x.count), Math.round(x.b / x.count))
  )
}

/** 吸管：点击图片像素取色 */
function onPickClick(e) {
  if (!eyedropper.value || !pickImgEl) return
  const imgEl = pickImgRef.value
  if (!imgEl) return
  // 图片在页面上的显示尺寸
  const rect = imgEl.getBoundingClientRect()
  const scaleX = pickImgEl.naturalWidth / rect.width
  const scaleY = pickImgEl.naturalHeight / rect.height
  const px = Math.floor((e.clientX - rect.left) * scaleX)
  const py = Math.floor((e.clientY - rect.top) * scaleY)
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  ctx.drawImage(pickImgEl, px, py, 1, 1, 0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  color.value = rgbToHex(d[0], d[1], d[2])
  ElMessage.success('已取色：' + color.value)
}

// ===== 色板保存 =====
function saveColor() {
  const c = formats.value[0].value.toLowerCase()
  if (savedColors.value.includes(c)) {
    ElMessage.info('该颜色已在色板中')
    return
  }
  savedColors.value.push(c)
  persistSaved()
  ElMessage.success('已存入色板')
}

function removeSaved(i) {
  savedColors.value.splice(i, 1)
  persistSaved()
}

async function copy(text) {
  const ok = await copyText(text)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败')
}

onUnmounted(() => {
  if (pickImgUrl.value) URL.revokeObjectURL(pickImgUrl.value)
})
</script>

<style scoped>
.color-tool { display: flex; flex-direction: column; gap: 8px; }
.picker-section { display: flex; flex-direction: column; gap: 16px; }
.picker-area { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.color-preview { width: 80px; height: 80px; border-radius: 8px; border: 1px solid var(--color-border, #ebeef5); }
.format-grid { display: flex; flex-direction: column; gap: 8px; }
.format-item { display: flex; align-items: center; gap: 8px; }
.format-label { width: 48px; font-size: 13px; font-weight: 600; color: var(--color-text-secondary, #909399); flex-shrink: 0; }
.format-item :deep(.el-input) { flex: 1; }
.section-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary, #303133); margin: 0 0 12px; }
.palette-display { display: flex; gap: 8px; flex-wrap: wrap; }
.palette-color {
  width: 80px; height: 80px; border-radius: 8px; cursor: pointer;
  display: flex; align-items: flex-end; justify-content: center; padding: 4px;
  transition: transform 0.2s; position: relative; border: 1px solid var(--color-border, #ebeef5);
}
.palette-color:hover { transform: scale(1.05); }
.palette-color.saved { outline: 1px solid var(--color-primary, #409eff); }
.palette-hex { font-size: 11px; color: #fff; background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; }
.remove-x {
  position: absolute; top: 4px; right: 4px;
  color: #fff; background: rgba(0,0,0,0.5); border-radius: 50%;
  padding: 2px; font-size: 12px; cursor: pointer;
}
.empty-tip { font-size: 12px; color: var(--color-text-secondary, #909399); }
.extract-controls { display: flex; flex-direction: column; gap: 12px; margin: 12px 0; }
.count-control { display: flex; flex-direction: column; gap: 6px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.pick-stage { display: flex; justify-content: center; }
.pick-image { max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid var(--color-border, #ebeef5); }
.pick-stage.eyedropper .pick-image { cursor: crosshair; }
.extracted-display { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.extracted-color {
  width: 80px; height: 80px; border-radius: 8px; cursor: pointer;
  display: flex; align-items: flex-end; justify-content: center; padding: 4px;
  border: 1px solid var(--color-border, #ebeef5);
}
</style>
