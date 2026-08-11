<template>
  <ToolLayout
    title="图片拼接"
    desc="免费在线将多张图片拼接为一张，支持横向/纵向/网格布局、背景色、可拖拽排序，本地处理不上传。"
    fav-key="image-merge"
  >
    <div class="img-merge">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :sortable="true"
        accept=".jpg,.jpeg,.png,.webp"
        tip="上传多张图片，可拖拽调整顺序（至少 2 张）"
      />

      <template v-if="fileList.length >= 2">
        <!-- 拼接方向 -->
        <div class="config-section">
          <label class="config-title">拼接方向</label>
          <el-radio-group v-model="direction">
            <el-radio-button value="horizontal">横向拼接</el-radio-button>
            <el-radio-button value="vertical">纵向拼接</el-radio-button>
            <el-radio-button value="grid">网格布局</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 网格参数 -->
        <div v-if="direction === 'grid'" class="config-section">
          <label class="config-title">网格行列</label>
          <div class="grid-inputs">
            <div class="crop-field">
              <span>行数</span>
              <el-input-number v-model="gridRows" :min="1" :max="50" :controls="false" size="small" />
            </div>
            <div class="crop-field">
              <span>列数</span>
              <el-input-number v-model="gridCols" :min="1" :max="50" :controls="false" size="small" />
            </div>
          </div>
          <p class="config-tip">若 行×列 少于图片数量，行数会自动扩展以容纳所有图。</p>
        </div>

        <!-- 对齐 -->
        <div class="config-section">
          <label class="config-title">对齐方式</label>
          <el-radio-group v-model="align">
            <el-radio-button value="top">起始</el-radio-button>
            <el-radio-button value="center">居中</el-radio-button>
            <el-radio-button value="bottom">末尾</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 间距 -->
        <div class="config-section">
          <label class="config-title">间距（像素）</label>
          <el-slider v-model="gap" :min="0" :max="100" :step="1" show-input :show-input-controls="false" style="max-width: 320px" />
        </div>

        <!-- 背景色 -->
        <div class="config-section">
          <label class="config-title">背景色</label>
          <div class="bg-row">
            <el-checkbox v-model="bgTransparent">透明背景</el-checkbox>
            <el-color-picker v-model="bgColor" :show-alpha="true" :disabled="bgTransparent" />
            <span class="config-tip" v-if="bgTransparent && outFormat === 'image/jpeg'">JPG 不支持透明，将使用白色填充。</span>
          </div>
        </div>

        <!-- 输出格式 -->
        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="format">
            <el-radio-button value="image/png">PNG</el-radio-button>
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
            <el-radio-button value="image/webp">WebP</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 文件名 -->
        <div class="config-section">
          <label class="config-title">输出文件名</label>
          <el-input v-model="outName" size="default" style="max-width: 320px">
            <template #prepend>名称</template>
            <template #append>.{{ ext }}</template>
          </el-input>
        </div>

        <!-- 预览 -->
        <div class="config-section">
          <label class="config-title">预览</label>
          <div class="preview-stage">
            <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" />
            <span v-else class="preview-empty">参数变化时自动刷新预览…</span>
          </div>
        </div>

        <div class="action-bar">
          <el-button :icon="Sort" @click="reverseOrder">反转顺序</el-button>
          <el-button type="primary" size="large" :loading="processing" @click="run(doMerge, '拼接')">
            {{ processing ? '拼接中...' : '拼接并下载' }}
          </el-button>
          <el-button size="large" @click="clearAll(() => { previewUrl = '' })">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { Sort } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob } from '@/composables/useDownload'
import { loadImage, createCanvas, canvasToBlob, mimeToExt } from '@/composables/useImageProcessor'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()

const direction = ref('horizontal')
const align = ref('center')
const gap = ref(0)
const gridRows = ref(2)
const gridCols = ref(3)
const bgTransparent = ref(false)
const bgColor = ref('#ffffff')
const format = ref('image/png')
const outName = ref('merged')
const previewUrl = ref('')

let previewTimer = null

const ext = computed(() => mimeToExt(format.value))

watch(
  [fileList, direction, align, gap, gridRows, gridCols, bgTransparent, bgColor, format],
  () => schedulePreview(),
  { deep: true }
)

function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer)
  if (fileList.value.length < 2) {
    previewUrl.value = ''
    return
  }
  previewTimer = setTimeout(() => {
    generatePreview().catch(() => {})
  }, 220)
}

function alignPos(a, outer, inner) {
  if (inner >= outer) return 0
  if (a === 'top') return 0
  if (a === 'bottom') return outer - inner
  return (outer - inner) / 2
}

async function buildMerge() {
  const imgs = []
  for (const f of fileList.value) imgs.push(await loadImage(f.raw))
  if (!imgs.length) return null

  let maxW = 0
  let maxH = 0
  for (const im of imgs) {
    maxW = Math.max(maxW, im.naturalWidth)
    maxH = Math.max(maxH, im.naturalHeight)
  }
  const g = gap.value

  let totalW, totalH
  let cols = 1
  let rows = 1
  if (direction.value === 'horizontal') {
    totalW = imgs.reduce((s, im) => s + im.naturalWidth, 0) + g * (imgs.length - 1)
    totalH = maxH
  } else if (direction.value === 'vertical') {
    totalW = maxW
    totalH = imgs.reduce((s, im) => s + im.naturalHeight, 0) + g * (imgs.length - 1)
  } else {
    cols = Math.max(1, gridCols.value)
    rows = Math.max(gridRows.value, Math.ceil(imgs.length / cols))
    totalW = maxW * cols + g * (cols - 1)
    totalH = maxH * rows + g * (rows - 1)
  }

  let shouldFill = !bgTransparent.value
  let fillStyle = bgColor.value
  if (format.value === 'image/jpeg') {
    shouldFill = true
    if (bgTransparent.value) fillStyle = '#ffffff'
  }
  const { canvas, ctx } = createCanvas(totalW, totalH, false)
  if (shouldFill) {
    ctx.fillStyle = fillStyle
    ctx.fillRect(0, 0, totalW, totalH)
  }

  if (direction.value === 'horizontal') {
    let ox = 0
    for (const im of imgs) {
      const y = alignPos(align.value, totalH, im.naturalHeight)
      ctx.drawImage(im, ox, y)
      ox += im.naturalWidth + g
    }
  } else if (direction.value === 'vertical') {
    let oy = 0
    for (const im of imgs) {
      const x = alignPos(align.value, totalW, im.naturalWidth)
      ctx.drawImage(im, x, oy)
      oy += im.naturalHeight + g
    }
  } else {
    imgs.forEach((im, i) => {
      const r = Math.floor(i / cols)
      const c = i % cols
      const cx = c * (maxW + g)
      const cy = r * (maxH + g)
      const x = alignPos(align.value, maxW, im.naturalWidth)
      const y = alignPos(align.value, maxH, im.naturalHeight)
      ctx.drawImage(im, cx + x, cy + y)
    })
  }
  return canvas
}

async function generatePreview() {
  const canvas = await buildMerge()
  if (!canvas) {
    previewUrl.value = ''
    return
  }
  const maxDim = 1000
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height))
  const { canvas: pc, ctx: pctx } = createCanvas(canvas.width * scale, canvas.height * scale, false)
  pctx.drawImage(canvas, 0, 0, pc.width, pc.height)
  previewUrl.value = pc.toDataURL(format.value, 0.92)
}

async function doMerge() {
  if (fileList.value.length < 2) {
    ElMessage.warning('请至少上传 2 张图片')
    return
  }
  const canvas = await buildMerge()
  const blob = await canvasToBlob(canvas, format.value, 0.92)
  const name = (outName.value || 'merged') + '.' + mimeToExt(format.value)
  downloadBlob(blob, name)
  ElMessage.success('拼接完成')
}

function reverseOrder() {
  fileList.value = [...fileList.value].reverse()
}

onUnmounted(() => {
  if (previewTimer) clearTimeout(previewTimer)
})
</script>

<style scoped>
.img-merge { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.config-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; }
.action-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.grid-inputs { display: flex; gap: 16px; flex-wrap: wrap; }
.crop-field { display: flex; flex-direction: column; gap: 4px; }
.crop-field span { font-size: 12px; color: var(--color-text-secondary, #909399); }
.bg-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.preview-stage {
  min-height: 160px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg, #f5f7fa);
  border: 1px dashed var(--color-border, #ebeef5);
  border-radius: 8px; padding: 12px;
}
.preview-img { max-width: 100%; max-height: 360px; border-radius: 6px; }
.preview-empty { font-size: 12px; color: var(--color-text-secondary, #909399); }
</style>
