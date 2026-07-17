<template>
  <ToolLayout title="图片裁剪缩放" desc="免费在线裁剪和缩放图片尺寸，支持自定义宽高和比例，本地处理不上传。">
    <div class="img-resize">
      <FileUploader ref="uploaderRef" v-model="fileList" :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" tip="上传一张图片进行裁剪或缩放" />

      <template v-if="fileList.length === 1">
        <div class="page-info">
          <el-tag type="info" size="large">原始尺寸：{{ imgWidth }} × {{ imgHeight }}</el-tag>
        </div>

        <!-- 模式选择 -->
        <el-radio-group v-model="mode">
          <el-radio-button value="resize">等比缩放</el-radio-button>
          <el-radio-button value="crop">自由裁剪</el-radio-button>
        </el-radio-group>

        <!-- 等比缩放 -->
        <div v-if="mode === 'resize'" class="config-section">
          <label class="config-title">缩放比例</label>
          <el-slider v-model="scalePercent" :min="1" :max="200" :step="1" show-input :show-input-controls="false" />
          <p class="config-tip">缩放后尺寸：{{ Math.round(imgWidth * scalePercent / 100) }} × {{ Math.round(imgHeight * scalePercent / 100) }}</p>
        </div>

        <!-- 自由裁剪 -->
        <div v-if="mode === 'crop'" class="config-section">
          <label class="config-title">裁剪区域（像素）</label>
          <div class="crop-inputs">
            <div class="crop-field">
              <span>左上 X</span>
              <el-input-number v-model="cropX" :min="0" :max="imgWidth" :controls="false" size="small" />
            </div>
            <div class="crop-field">
              <span>左上 Y</span>
              <el-input-number v-model="cropY" :min="0" :max="imgHeight" :controls="false" size="small" />
            </div>
            <div class="crop-field">
              <span>宽度</span>
              <el-input-number v-model="cropW" :min="1" :max="imgWidth" :controls="false" size="small" />
            </div>
            <div class="crop-field">
              <span>高度</span>
              <el-input-number v-model="cropH" :min="1" :max="imgHeight" :controls="false" size="small" />
            </div>
          </div>

          <!-- 预设比例 -->
          <div class="preset-ratios">
            <el-button size="small" @click="setRatio(1, 1)">1:1</el-button>
            <el-button size="small" @click="setRatio(4, 3)">4:3</el-button>
            <el-button size="small" @click="setRatio(16, 9)">16:9</el-button>
            <el-button size="small" @click="setRatio(3, 4)">3:4</el-button>
          </div>
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

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="process">处理并下载</el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const imgWidth = ref(0)
const imgHeight = ref(0)
const mode = ref('resize')
const scalePercent = ref(50)
const cropX = ref(0)
const cropY = ref(0)
const cropW = ref(100)
const cropH = ref(100)
const outFormat = ref('image/png')
const processing = ref(false)

const EXT_MAP = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

watch(fileList, async (files) => {
  if (files.length === 0) { imgWidth.value = 0; imgHeight.value = 0; return }
  const img = await loadImage(files[0].raw)
  imgWidth.value = img.naturalWidth
  imgHeight.value = img.naturalHeight
  cropW.value = img.naturalWidth
  cropH.value = img.naturalHeight
})

function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(raw)
  })
}

function setRatio(w, h) {
  const ratio = w / h
  const maxW = imgWidth.value
  const maxH = imgHeight.value
  let cw, ch
  if (maxW / maxH > ratio) {
    ch = maxH
    cw = Math.round(ch * ratio)
  } else {
    cw = maxW
    ch = Math.round(cw / ratio)
  }
  cropW.value = cw
  cropH.value = ch
  cropX.value = Math.round((maxW - cw) / 2)
  cropY.value = Math.round((maxH - ch) / 2)
}

async function process() {
  if (fileList.length !== 1) return
  processing.value = true
  try {
    const img = await loadImage(fileList.value[0].raw)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (mode.value === 'resize') {
      canvas.width = Math.round(imgWidth.value * scalePercent.value / 100)
      canvas.height = Math.round(imgHeight.value * scalePercent.value / 100)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    } else {
      canvas.width = cropW.value
      canvas.height = cropH.value
      ctx.drawImage(img, cropX.value, cropY.value, cropW.value, cropH.value, 0, 0, cropW.value, cropH.value)
    }

    if (outFormat.value === 'image/jpeg') {
      ctx.fillStyle = '#fff'
    }

    const dataUrl = canvas.toDataURL(outFormat.value, 0.92)
    const blob = await (await fetch(dataUrl)).blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `processed-${Date.now()}.${EXT_MAP[outFormat.value]}`
    link.click()
    ElMessage.success('处理完成')
  } catch (e) {
    ElMessage.error('处理失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function clearAll() { uploaderRef.value?.clearFiles(); fileList.value = []; imgWidth.value = 0; imgHeight.value = 0 }
</script>

<style scoped>
.img-resize { display: flex; flex-direction: column; gap: 20px; }
.page-info { display: flex; gap: 8px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.config-tip { font-size: 12px; color: #909399; margin: 0; }
.crop-inputs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.crop-field { display: flex; flex-direction: column; gap: 4px; }
.crop-field span { font-size: 12px; color: #909399; }
.preset-ratios { display: flex; gap: 8px; flex-wrap: wrap; }
.action-bar { display: flex; gap: 12px; }
@media (max-width: 768px) { .crop-inputs { grid-template-columns: repeat(2, 1fr); } }
</style>
