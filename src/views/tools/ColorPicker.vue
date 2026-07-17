<template>
  <ToolLayout title="颜色选择器" desc="免费在线颜色选择器，支持HEX/RGB/HSL互转、调色板生成、从图片提取颜色，本地处理。">
    <div class="color-tool">
      <!-- 颜色选择 -->
      <div class="picker-section">
        <div class="picker-area">
          <el-color-picker v-model="color" :show-alpha="true" size="large" />
          <div class="color-preview" :style="{ background: color }"></div>
        </div>

        <!-- 格式转换 -->
        <div class="format-grid">
          <div class="format-item">
            <span class="format-label">HEX</span>
            <el-input :model-value="hex" readonly size="default">
              <template #append><el-button :icon="CopyDocument" @click="copy(hex)" /></template>
            </el-input>
          </div>
          <div class="format-item">
            <span class="format-label">RGB</span>
            <el-input :model-value="rgb" readonly size="default">
              <template #append><el-button :icon="CopyDocument" @click="copy(rgb)" /></template>
            </el-input>
          </div>
          <div class="format-item">
            <span class="format-label">HSL</span>
            <el-input :model-value="hsl" readonly size="default">
              <template #append><el-button :icon="CopyDocument" @click="copy(hsl)" /></template>
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
          <div v-for="(c, i) in palette" :key="i" class="palette-color" :style="{ background: c }" @click="color = c">
            <span class="palette-hex">{{ c }}</span>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 从图片提取颜色 -->
      <div class="extract-section">
        <h3 class="section-title">从图片提取颜色</h3>
        <FileUploader ref="uploaderRef" v-model="fileList" :show-file-list="false" accept=".jpg,.jpeg,.png" tip="上传图片，自动提取主色调" />
        <div v-if="extractedColors.length" class="extracted-display">
          <div v-for="(c, i) in extractedColors" :key="i" class="extracted-color" :style="{ background: c }" @click="color = c">
            <span class="palette-hex">{{ c }}</span>
          </div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const color = ref('#409eff')
const paletteType = ref('complementary')
const fileList = ref([])
const uploaderRef = ref()
const extractedColors = ref([])

// HEX → RGB
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

// RGB → HSL
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// HSL → HEX
function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

const hex = computed(() => color.value.slice(0, 7))
const rgb = computed(() => {
  const { r, g, b } = hexToRgb(hex.value)
  return `rgb(${r}, ${g}, ${b})`
})
const hsl = computed(() => {
  const { h, s, l } = rgbToHsl(hexToRgb(hex.value))
  return `hsl(${h}, ${s}%, ${l}%)`
})

const palette = computed(() => {
  const { h, s, l } = rgbToHsl(hexToRgb(hex.value))
  switch (paletteType.value) {
    case 'complementary':
      return [color.value, hslToHex((h + 180) % 360, s, l)]
    case 'analogous':
      return [hslToHex((h + 330) % 360, s, l), color.value, hslToHex((h + 30) % 360, s, l)]
    case 'triadic':
      return [color.value, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)]
    case 'shades':
      return [0, 25, 50, 75, 100].map((p) => hslToHex(h, s, Math.max(10, Math.min(90, l + (p - 50) / 2))))
    default:
      return [color.value]
  }
})

// 从图片提取主色调
watch(fileList, async (files) => {
  if (files.length === 0) { extractedColors.value = []; return }
  const img = await loadImage(files[0].raw)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const size = 50
  canvas.width = size
  canvas.height = size
  ctx.drawImage(img, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data

  // 简单聚类：按颜色分组取最多的
  const colorMap = {}
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32
    const g = Math.round(data[i + 1] / 32) * 32
    const b = Math.round(data[i + 2] / 32) * 32
    const key = `${r},${g},${b}`
    colorMap[key] = (colorMap[key] || 0) + 1
  }
  const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  extractedColors.value = sorted.map(([key]) => {
    const [r, g, b] = key.split(',').map(Number)
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
  })
})

function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(raw)
  })
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.color-tool { display: flex; flex-direction: column; gap: 8px; }
.picker-section { display: flex; flex-direction: column; gap: 16px; }
.picker-area { display: flex; align-items: center; gap: 16px; }
.color-preview { width: 80px; height: 80px; border-radius: 8px; border: 1px solid #ebeef5; }
.format-grid { display: flex; flex-direction: column; gap: 8px; }
.format-item { display: flex; align-items: center; gap: 8px; }
.format-label { width: 40px; font-size: 13px; font-weight: 600; color: #909399; }
.format-item :deep(.el-input) { flex: 1; }
.section-title { font-size: 16px; font-weight: 700; color: #303133; margin: 0 0 12px; }
.palette-display { display: flex; gap: 8px; flex-wrap: wrap; }
.palette-color { width: 80px; height: 80px; border-radius: 8px; cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding: 4px; transition: transform 0.2s; }
.palette-color:hover { transform: scale(1.05); }
.palette-hex { font-size: 11px; color: #fff; background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; }
.extracted-display { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.extracted-color { width: 80px; height: 80px; border-radius: 8px; cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding: 4px; }
</style>
