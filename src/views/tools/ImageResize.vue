<template>
  <ToolLayout
    title="图片裁剪缩放"
    desc="免费在线批量裁剪和缩放图片，支持可视化裁剪框、比例预设、自定义宽高，本地处理不上传。"
    fav-key="image-resize"
  >
    <div class="img-resize">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".jpg,.jpeg,.png,.webp"
        tip="上传一张或多张图片进行裁剪或缩放（可批量）"
      />

      <template v-if="fileList.length >= 1 && refImg">
        <div class="page-info">
          <el-tag type="info" size="large">参考图：{{ refW }} × {{ refH }} px</el-tag>
          <el-tag v-if="fileList.length > 1" type="info" size="large">共 {{ fileList.length }} 张</el-tag>
        </div>

        <!-- 模式 -->
        <el-radio-group v-model="mode">
          <el-radio-button value="resize">等比缩放</el-radio-button>
          <el-radio-button value="crop">自由裁剪</el-radio-button>
        </el-radio-group>

        <!-- 等比缩放 -->
        <div v-if="mode === 'resize'" class="config-section">
          <el-radio-group v-model="resizeSub">
            <el-radio-button value="percent">百分比</el-radio-button>
            <el-radio-button value="target">目标宽高</el-radio-button>
          </el-radio-group>

          <div v-if="resizeSub === 'percent'" class="sub-section">
            <label class="config-title">缩放比例</label>
            <el-slider v-model="scalePercent" :min="1" :max="200" :step="1" show-input :show-input-controls="false" />
            <p class="config-tip">缩放后尺寸：{{ Math.round(refW * scalePercent / 100) }} × {{ Math.round(refH * scalePercent / 100) }} px</p>
          </div>

          <div v-else class="sub-section">
            <div class="crop-inputs">
              <div class="crop-field">
                <span>宽度</span>
                <el-input-number v-model="targetW" :min="1" :max="10000" :controls="false" size="small" @change="onTargetWChange" />
              </div>
              <div class="crop-field">
                <span>高度</span>
                <el-input-number v-model="targetH" :min="1" :max="10000" :controls="false" size="small" @change="onTargetHChange" />
              </div>
            </div>
            <el-checkbox v-model="lockAspect">锁定宽高比（按参考图比例，仅按宽度等比缩放，保持每张图自身比例不变形）</el-checkbox>
            <p v-if="!lockAspect" class="config-tip warn">未锁定比例时，所有图将被强制拉伸到目标宽高（可能变形）。</p>
          </div>
        </div>

        <!-- 自由裁剪 -->
        <div v-if="mode === 'crop'" class="config-section">
          <label class="config-title">裁剪框（在参考图上拖拽）</label>
          <div class="crop-editor">
            <div class="crop-stage" ref="stageRef">
              <img ref="previewImgRef" :src="refUrl" class="crop-image" alt="参考图" draggable="false" />
              <div class="crop-box" :style="boxStyle" @mousedown="onBoxDown($event, 'move')">
                <div class="handle nw" @mousedown.stop="onBoxDown($event, 'resize', 'nw')"></div>
                <div class="handle ne" @mousedown.stop="onBoxDown($event, 'resize', 'ne')"></div>
                <div class="handle sw" @mousedown.stop="onBoxDown($event, 'resize', 'sw')"></div>
                <div class="handle se" @mousedown.stop="onBoxDown($event, 'resize', 'se')"></div>
              </div>
            </div>
          </div>

          <div class="crop-inputs">
            <div class="crop-field">
              <span>左上 X</span>
              <el-input-number :model-value="pxX" :min="0" :max="refW" :controls="false" size="small" @change="(v) => setRectField('x', v)" />
            </div>
            <div class="crop-field">
              <span>左上 Y</span>
              <el-input-number :model-value="pxY" :min="0" :max="refH" :controls="false" size="small" @change="(v) => setRectField('y', v)" />
            </div>
            <div class="crop-field">
              <span>宽度</span>
              <el-input-number :model-value="pxW" :min="1" :max="refW" :controls="false" size="small" @change="(v) => setRectField('w', v)" />
            </div>
            <div class="crop-field">
              <span>高度</span>
              <el-input-number :model-value="pxH" :min="1" :max="refH" :controls="false" size="small" @change="(v) => setRectField('h', v)" />
            </div>
          </div>

          <div class="preset-ratios">
            <span class="config-title">预设比例：</span>
            <el-button size="small" :type="ratioKey === 'free' ? 'primary' : ''" @click="setRatio('free')">自由</el-button>
            <el-button size="small" :type="ratioKey === '1:1' ? 'primary' : ''" @click="setRatio('1:1')">1:1</el-button>
            <el-button size="small" :type="ratioKey === '4:3' ? 'primary' : ''" @click="setRatio('4:3')">4:3</el-button>
            <el-button size="small" :type="ratioKey === '16:9' ? 'primary' : ''" @click="setRatio('16:9')">16:9</el-button>
            <el-button size="small" :type="ratioKey === '3:4' ? 'primary' : ''" @click="setRatio('3:4')">3:4</el-button>
            <el-button size="small" @click="resetRect">重置选区</el-button>
          </div>
          <p class="config-tip">裁剪框按相对比例存储，会等比应用到批量中的每张图。</p>
        </div>

        <!-- 输出格式 -->
        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="outFormat">
            <el-radio-button value="image/png">PNG</el-radio-button>
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
            <el-radio-button value="image/webp">WebP</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 文件名模板 -->
        <div class="config-section">
          <label class="config-title">文件名模板</label>
          <el-input v-model="nameTpl" size="default" style="max-width: 320px">
            <template #prepend>命名</template>
          </el-input>
          <p class="config-tip">用 <code>{name}</code> 代表原文件名（不含扩展名）。</p>
        </div>

        <!-- 预览 -->
        <div class="config-section">
          <label class="config-title">预览（参考图处理结果）</label>
          <div class="preview-stage">
            <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" />
            <span v-else class="preview-empty">参数变化时自动刷新预览…</span>
          </div>
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="run(processAll, '处理')">
            {{ processing ? '处理中...' : `处理 ${fileList.length} 张并下载` }}
          </el-button>
          <el-button size="large" @click="clearAll(extraClear)">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob, downloadZip } from '@/composables/useDownload'
import {
  loadImage,
  createCanvas,
  canvasToBlob,
  mimeToExt
} from '@/composables/useImageProcessor'
import { stripExt } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()

const mode = ref('resize') // resize | crop
const resizeSub = ref('percent') // percent | target
const scalePercent = ref(100)
const targetW = ref(0)
const targetH = ref(0)
const lockAspect = ref(true)
const outFormat = ref('image/png')
const nameTpl = ref('{name}-resized')

// 裁剪框（相对 0..1）
const rect = reactive({ x: 0, y: 0, w: 1, h: 1 })
const ratioKey = ref('free')

// 参考图
const refImg = ref(null)
const refUrl = ref('')
const refW = ref(0)
const refH = ref(0)
const stageRef = ref()
const previewImgRef = ref()
const previewUrl = ref('')

let previewTimer = null

const RATIO_VALUES = {
  '1:1': [1, 1],
  '4:3': [4, 3],
  '16:9': [16, 9],
  '3:4': [3, 4]
}

const boxStyle = computed(() => ({
  left: rect.x * 100 + '%',
  top: rect.y * 100 + '%',
  width: rect.w * 100 + '%',
  height: rect.h * 100 + '%'
}))

const pxX = computed(() => Math.round(rect.x * refW.value))
const pxY = computed(() => Math.round(rect.y * refH.value))
const pxW = computed(() => Math.max(1, Math.round(rect.w * refW.value)))
const pxH = computed(() => Math.max(1, Math.round(rect.h * refH.value)))

watch(fileList, async (files) => {
  revokeRef()
  refImg.value = null
  refW.value = 0
  refH.value = 0
  previewUrl.value = ''
  if (!files.length) return
  try {
    const img = await loadImage(files[0].raw)
    refImg.value = img
    refW.value = img.naturalWidth
    refH.value = img.naturalHeight
    refUrl.value = URL.createObjectURL(files[0].raw)
    targetW.value = img.naturalWidth
    targetH.value = img.naturalHeight
    resetRect()
    schedulePreview()
  } catch (e) {
    ElMessage.error('图片加载失败：' + (e.message || e))
  }
}, { immediate: false })

// 参数变化 → 刷新预览
watch(
  [mode, resizeSub, scalePercent, targetW, targetH, lockAspect, outFormat, rect, ratioKey],
  () => schedulePreview(),
  { deep: true }
)

function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    generatePreview().catch(() => {})
  }, 180)
}

async function generatePreview() {
  if (!refImg.value) return
  try {
    const canvas = await buildCanvasForImage(refImg.value)
    previewUrl.value = canvas.toDataURL(outFormat.value, 0.92)
  } catch (e) {
    // 预览失败不阻塞
  }
}

/** 依据当前参数构建输出 canvas（对任意传入的 img） */
async function buildCanvasForImage(img) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  let outW, outH, sx, sy, sw, sh, dx, dy, dw, dh
  if (mode.value === 'resize') {
    if (resizeSub.value === 'percent') {
      outW = Math.max(1, Math.round(iw * scalePercent.value / 100))
      outH = Math.max(1, Math.round(ih * scalePercent.value / 100))
      sx = 0; sy = 0; sw = iw; sh = ih; dx = 0; dy = 0; dw = outW; dh = outH
    } else if (lockAspect.value) {
      // 按目标宽度等比，保持该图自身比例
      outW = Math.max(1, targetW.value)
      outH = Math.max(1, Math.round(targetW.value * ih / iw))
      sx = 0; sy = 0; sw = iw; sh = ih; dx = 0; dy = 0; dw = outW; dh = outH
    } else {
      outW = Math.max(1, targetW.value)
      outH = Math.max(1, targetH.value)
      sx = 0; sy = 0; sw = iw; sh = ih; dx = 0; dy = 0; dw = outW; dh = outH
    }
  } else {
    // crop：rect 为相对本图的像素
    sx = Math.max(0, Math.round(rect.x * iw))
    sy = Math.max(0, Math.round(rect.y * ih))
    sw = Math.max(1, Math.min(iw - sx, Math.round(rect.w * iw)))
    sh = Math.max(1, Math.min(ih - sy, Math.round(rect.h * ih)))
    outW = sw
    outH = sh
    dx = 0; dy = 0; dw = outW; dh = outH
  }

  // P0 修复：JPG 输出时先填白底，再绘制（透明区域不会被渲染成黑色）
  const { canvas, ctx } = createCanvas(outW, outH, outFormat.value === 'image/jpeg')
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  return canvas
}

function buildName(file) {
  const base = stripExt(file.name) || 'image'
  return (nameTpl.value.replace(/\{name\}/g, base) || base) + '.' + mimeToExt(outFormat.value)
}

async function processAll() {
  if (!fileList.value.length) return
  const items = []
  for (const f of fileList.value) {
    const img = await loadImage(f.raw)
    const canvas = await buildCanvasForImage(img)
    const blob = await canvasToBlob(canvas, outFormat.value, 0.92)
    items.push({ blob, name: buildName(f) })
  }
  if (items.length === 1) {
    downloadBlob(items[0].blob, items[0].name)
  } else {
    await downloadZip(items, 'resized-images.zip')
  }
  ElMessage.success(`处理完成，共 ${items.length} 张`)
}

// ===== 裁剪框拖拽 =====
const drag = reactive({ active: false, mode: '', handle: '', startX: 0, startY: 0, startRect: null })

function dispSize() {
  const el = previewImgRef.value
  if (el && el.clientWidth) return { w: el.clientWidth, h: el.clientHeight }
  return { w: refW.value || 1, h: refH.value || 1 }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function onBoxDown(e, modeType, handle = '') {
  e.preventDefault()
  drag.active = true
  drag.mode = modeType
  drag.handle = handle
  drag.startX = e.clientX
  drag.startY = e.clientY
  drag.startRect = { ...rect }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragUp)
}

function onDragMove(e) {
  if (!drag.active || !drag.startRect) return
  const { w: dw, h: dh } = dispSize()
  const dx = (e.clientX - drag.startX) / dw
  const dy = (e.clientY - drag.startY) / dh
  const s = drag.startRect
  if (drag.mode === 'move') {
    rect.x = clamp(s.x + dx, 0, 1 - s.w)
    rect.y = clamp(s.y + dy, 0, 1 - s.h)
    return
  }
  // resize：以对角为锚点
  const anchors = {
    nw: { x: s.x + s.w, y: s.y + s.h },
    ne: { x: s.x, y: s.y + s.h },
    sw: { x: s.x + s.w, y: s.y },
    se: { x: s.x, y: s.y }
  }
  const anchor = anchors[drag.handle]
  const corners = {
    nw: { x: s.x, y: s.y },
    ne: { x: s.x + s.w, y: s.y },
    sw: { x: s.x, y: s.y + s.h },
    se: { x: s.x + s.w, y: s.y + s.h }
  }
  const startCorner = corners[drag.handle]
  let cx = clamp(startCorner.x + dx, 0, 1)
  let cy = clamp(startCorner.y + dy, 0, 1)
  let nW = Math.abs(anchor.x - cx)
  let nH = Math.abs(anchor.y - cy)
  // aspect lock
  let aspect = null
  if (ratioKey.value !== 'free' && RATIO_VALUES[ratioKey.value]) {
    const [rw, rh] = RATIO_VALUES[ratioKey.value]
    // 像素比例 = rw/rh；转换为相对比例需考虑参考图宽高
    aspect = (rw / rh) * (refH.value / refW.value)
  }
  if (aspect) {
    if (nW / aspect > nH) {
      nH = nW / aspect
    } else {
      nW = nH * aspect
    }
  }
  nW = Math.max(0.02, nW)
  nH = Math.max(0.02, nH)
  const rightAnchored = drag.handle.includes('w')
  const bottomAnchored = drag.handle.includes('n')
  let nx = rightAnchored ? anchor.x - nW : anchor.x
  let ny = bottomAnchored ? anchor.y - nH : anchor.y
  nx = clamp(nx, 0, 1 - 0.02)
  ny = clamp(ny, 0, 1 - 0.02)
  nW = Math.min(nW, 1 - nx)
  nH = Math.min(nH, 1 - ny)
  rect.x = nx
  rect.y = ny
  rect.w = nW
  rect.h = nH
}

function onDragUp() {
  drag.active = false
  drag.startRect = null
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragUp)
}

function setRectField(field, v) {
  if (v == null || isNaN(v)) return
  if (field === 'x') rect.x = clamp(v / refW.value, 0, 1 - rect.w)
  else if (field === 'y') rect.y = clamp(v / refH.value, 0, 1 - rect.h)
  else if (field === 'w') rect.w = clamp(v / refW.value, 0.02, 1 - rect.x)
  else if (field === 'h') rect.h = clamp(v / refH.value, 0.02, 1 - rect.y)
}

function setRatio(key) {
  ratioKey.value = key
  if (key === 'free') return
  const [rw, rh] = RATIO_VALUES[key]
  const aspect = rw / rh
  const iasp = refW.value / refH.value
  let bw, bh
  if (iasp > aspect) {
    bh = 1
    bw = (aspect * refH.value) / refW.value
  } else {
    bw = 1
    bh = (refW.value / aspect) / refH.value
  }
  rect.x = (1 - bw) / 2
  rect.y = (1 - bh) / 2
  rect.w = bw
  rect.h = bh
}

function resetRect() {
  ratioKey.value = 'free'
  rect.x = 0
  rect.y = 0
  rect.w = 1
  rect.h = 1
}

function onTargetWChange() {
  if (lockAspect.value && refW.value && refH.value) {
    targetH.value = Math.max(1, Math.round(targetW.value * refH.value / refW.value))
  }
}
function onTargetHChange() {
  if (lockAspect.value && refW.value && refH.value) {
    targetW.value = Math.max(1, Math.round(targetH.value * refW.value / refH.value))
  }
}

function extraClear() {
  revokeRef()
  refImg.value = null
  refW.value = 0
  refH.value = 0
  previewUrl.value = ''
}

function revokeRef() {
  if (refUrl.value) {
    URL.revokeObjectURL(refUrl.value)
    refUrl.value = ''
  }
}

onUnmounted(() => {
  if (previewTimer) clearTimeout(previewTimer)
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragUp)
  revokeRef()
})
</script>

<style scoped>
.img-resize { display: flex; flex-direction: column; gap: 20px; }
.page-info { display: flex; gap: 8px; flex-wrap: wrap; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.config-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; }
.config-tip.warn { color: #e6a23c; }
.config-tip code { background: var(--color-primary-light, #ecf5ff); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
.sub-section { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
.crop-inputs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.crop-field { display: flex; flex-direction: column; gap: 4px; }
.crop-field span { font-size: 12px; color: var(--color-text-secondary, #909399); }
.preset-ratios { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.preset-ratios .config-title { margin-right: 4px; }
.action-bar { display: flex; gap: 12px; flex-wrap: wrap; }

.crop-editor { display: flex; justify-content: center; }
.crop-stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  user-select: none;
}
.crop-image { display: block; max-width: 100%; max-height: 60vh; border-radius: 6px; }
.crop-box {
  position: absolute;
  border: 2px solid var(--color-primary, #409eff);
  background: rgba(64, 158, 255, 0.15);
  cursor: move;
  box-sizing: border-box;
}
.handle {
  position: absolute;
  width: 12px; height: 12px;
  background: #fff;
  border: 2px solid var(--color-primary, #409eff);
  border-radius: 50%;
}
.handle.nw { top: -7px; left: -7px; cursor: nwse-resize; }
.handle.ne { top: -7px; right: -7px; cursor: nesw-resize; }
.handle.sw { bottom: -7px; left: -7px; cursor: nesw-resize; }
.handle.se { bottom: -7px; right: -7px; cursor: nwse-resize; }

.preview-stage {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg, #f5f7fa);
  border: 1px dashed var(--color-border, #ebeef5);
  border-radius: 8px;
  padding: 12px;
}
.preview-img { max-width: 100%; max-height: 320px; border-radius: 6px; }
.preview-empty { font-size: 12px; color: var(--color-text-secondary, #909399); }

@media (max-width: 768px) {
  .crop-inputs { grid-template-columns: repeat(2, 1fr); }
}
</style>
