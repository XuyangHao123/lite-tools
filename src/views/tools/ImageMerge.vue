<template>
  <ToolLayout title="图片拼接" desc="免费在线将多张图片拼接为一张，支持横向/纵向拼接，自动对齐，本地处理不上传。">
    <div class="img-merge">
      <FileUploader ref="uploaderRef" v-model="fileList" accept=".jpg,.jpeg,.png,.webp" tip="上传多张图片，按列表顺序拼接" />

      <template v-if="fileList.length >= 2">
        <div class="config-section">
          <label class="config-title">拼接方向</label>
          <el-radio-group v-model="direction">
            <el-radio-button value="horizontal">横向拼接</el-radio-button>
            <el-radio-button value="vertical">纵向拼接</el-radio-button>
          </el-radio-group>
        </div>

        <div class="config-section">
          <label class="config-title">对齐方式</label>
          <el-radio-group v-model="align">
            <el-radio-button value="top">顶部对齐</el-radio-button>
            <el-radio-button value="center">居中对齐</el-radio-button>
            <el-radio-button value="bottom">底部对齐</el-radio-button>
          </el-radio-group>
        </div>

        <div class="config-section">
          <label class="config-title">间距（像素）</label>
          <el-input-number v-model="gap" :min="0" :max="100" size="default" />
        </div>

        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="format">
            <el-radio-button value="image/png">PNG</el-radio-button>
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
          </el-radio-group>
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="merge">拼接并下载</el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const direction = ref('horizontal')
const align = ref('center')
const gap = ref(0)
const format = ref('image/png')
const processing = ref(false)

const EXT_MAP = { 'image/png': 'png', 'image/jpeg': 'jpg' }

function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(raw)
  })
}

async function merge() {
  if (fileList.length < 2) return
  processing.value = true
  try {
    const imgs = []
    for (const f of fileList.value) {
      imgs.push(await loadImage(f.raw))
    }

    let totalWidth = 0, totalHeight = 0, maxWidth = 0, maxHeight = 0
    for (const img of imgs) {
      maxWidth = Math.max(maxWidth, img.naturalWidth)
      maxHeight = Math.max(maxHeight, img.naturalHeight)
    }

    if (direction.value === 'horizontal') {
      totalWidth = imgs.reduce((sum, img) => sum + img.naturalWidth, 0) + gap.value * (imgs.length - 1)
      totalHeight = maxHeight
    } else {
      totalWidth = maxWidth
      totalHeight = imgs.reduce((sum, img) => sum + img.naturalHeight, 0) + gap.value * (imgs.length - 1)
    }

    const canvas = document.createElement('canvas')
    canvas.width = totalWidth
    canvas.height = totalHeight
    const ctx = canvas.getContext('2d')

    if (format.value === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, totalWidth, totalHeight)
    }

    let offset = 0
    for (const img of imgs) {
      let x, y
      if (direction.value === 'horizontal') {
        x = offset
        if (align.value === 'top') y = 0
        else if (align.value === 'center') y = (totalHeight - img.naturalHeight) / 2
        else y = totalHeight - img.naturalHeight
        ctx.drawImage(img, x, y)
        offset += img.naturalWidth + gap.value
      } else {
        y = offset
        if (align.value === 'top') x = 0
        else if (align.value === 'center') x = (totalWidth - img.naturalWidth) / 2
        else x = totalWidth - img.naturalWidth
        ctx.drawImage(img, x, y)
        offset += img.naturalHeight + gap.value
      }
    }

    const dataUrl = canvas.toDataURL(format.value, 0.92)
    const blob = await (await fetch(dataUrl)).blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `merged-${Date.now()}.${EXT_MAP[format.value]}`
    link.click()
    ElMessage.success('拼接完成')
  } catch (e) {
    ElMessage.error('拼接失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function clearAll() { uploaderRef.value?.clearFiles(); fileList.value = [] }
</script>

<style scoped>
.img-merge { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.action-bar { display: flex; gap: 12px; }
</style>
