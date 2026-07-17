<template>
  <ToolLayout title="二维码识别" desc="免费在线识别/解码图片中的二维码，支持拖拽上传，提取二维码内容，本地处理不上传。">
    <div class="qr-decoder">
      <FileUploader ref="uploaderRef" v-model="fileList" :show-file-list="false" accept=".jpg,.jpeg,.png,.gif,.bmp,.webp" tip="上传含二维码的图片，自动识别内容" />

      <template v-if="fileList.length === 1">
        <!-- 图片预览 -->
        <div class="preview-section">
          <img :src="previewUrl" class="preview-img" alt="预览" />
        </div>

        <!-- 识别结果 -->
        <div v-if="result" class="result-section">
          <el-alert title="识别成功！" type="success" show-icon :closable="false" />
          <div class="result-content">
            <label class="config-title">二维码内容</label>
            <el-input :model-value="result" type="textarea" :rows="4" readonly />
          </div>
          <div class="action-bar">
            <el-button type="primary" :icon="CopyDocument" @click="copyResult">复制内容</el-button>
            <el-button v-if="isUrl" type="success" @click="openUrl">打开链接</el-button>
            <el-button @click="retry">重新识别</el-button>
          </div>
        </div>

        <div v-if="!result && !processing" class="no-result">
          <el-alert title="未识别到二维码，请确保图片清晰且包含完整二维码" type="warning" show-icon :closable="false" />
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import jsQR from 'jsqr'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const result = ref('')
const processing = ref(false)
const previewUrl = ref('')

const isUrl = computed(() => {
  return /^https?:\/\//i.test(result.value)
})

watch(fileList, async (files) => {
  result.value = ''
  if (files.length === 0) { previewUrl.value = ''; return }

  const file = files[0]
  previewUrl.value = URL.createObjectURL(file.raw)
  processing.value = true

  try {
    const img = await loadImage(file.raw)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    })

    if (code) {
      result.value = code.data
      ElMessage.success('识别成功')
    } else {
      ElMessage.warning('未识别到二维码')
    }
  } catch (e) {
    ElMessage.error('识别失败：' + e.message)
  } finally {
    processing.value = false
  }
})

function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(raw)
  })
}

async function copyResult() {
  if (!result.value) return
  try { await navigator.clipboard.writeText(result.value); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}

function openUrl() {
  window.open(result.value, '_blank')
}

function retry() {
  if (fileList.value.length === 1) {
    // 重新触发 watch
    const f = fileList.value[0]
    fileList.value = []
    setTimeout(() => { fileList.value = [f] }, 100)
  }
}
</script>

<style scoped>
.qr-decoder { display: flex; flex-direction: column; gap: 20px; }
.preview-section { text-align: center; }
.preview-img { max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #ebeef5; }
.result-section { display: flex; flex-direction: column; gap: 12px; }
.result-content { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.action-bar { display: flex; gap: 12px; }
.no-result { margin-top: 8px; }
</style>
