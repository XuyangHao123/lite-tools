<template>
  <ToolLayout title="图片压缩" desc="免费在线压缩图片大小，支持JPG/PNG/WebP，自定义质量，本地处理不上传。">
    <div class="img-compress">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".jpg,.jpeg,.png,.webp"
        tip="支持 JPG、PNG、WebP 格式，可多选批量压缩"
      />

      <template v-if="fileList.length >= 1">
        <!-- 压缩设置 -->
        <div class="config-section">
          <label class="config-title">压缩质量</label>
          <el-slider v-model="quality" :min="10" :max="100" :step="5" show-input :show-input-controls="false" />
          <p class="config-tip">质量越低，体积越小。建议 60-80 之间。</p>
        </div>

        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="outputFormat">
            <el-radio-button value="auto">保持原格式</el-radio-button>
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
            <el-radio-button value="image/png">PNG</el-radio-button>
            <el-radio-button value="image/webp">WebP（更小）</el-radio-button>
          </el-radio-group>
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="compressAll">
            {{ processing ? '压缩中...' : `压缩 ${fileList.length} 张图片` }}
          </el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>

      <!-- 结果列表 -->
      <div v-if="results.length" class="result-box">
        <el-alert :title="`压缩完成！共处理 ${results.length} 张图片`" type="success" show-icon :closable="false" />
        <div class="result-list">
          <div v-for="(r, i) in results" :key="i" class="result-item">
            <img :src="r.url" class="result-thumb" :alt="r.name" />
            <div class="result-info">
              <span class="result-name">{{ r.name }}</span>
              <div class="size-compare">
                <el-tag size="small" type="info">{{ formatSize(r.originalSize) }}</el-tag>
                <el-icon><Right /></el-icon>
                <el-tag size="small" :type="r.reduction > 0 ? 'success' : 'info'">{{ formatSize(r.compressedSize) }}</el-tag>
                <el-tag v-if="r.reduction > 0" size="small" type="success">-{{ r.reduction }}%</el-tag>
                <el-tag v-else size="small" type="warning">未减小</el-tag>
              </div>
            </div>
            <el-button size="small" :icon="Download" @click="downloadOne(r)">下载</el-button>
          </div>
        </div>
        <el-button type="primary" @click="downloadAll" v-if="results.length > 1">全部下载</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Right } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const quality = ref(70)
const outputFormat = ref('auto')
const processing = ref(false)
const results = ref([])

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function getExt(mimeType) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  return map[mimeType] || 'img'
}

async function compressImage(file) {
  const img = await loadImage(file.raw)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  // 白色背景（JPG不支持透明）
  const targetFormat = outputFormat.value === 'auto' ? file.raw.type : outputFormat.value
  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)

  const dataUrl = canvas.toDataURL(targetFormat, quality.value / 100)
  const bytes = dataUrlToBytes(dataUrl)
  const blob = await (await fetch(dataUrl)).blob()

  return {
    url: URL.createObjectURL(blob),
    name: file.name.replace(/\.[^.]+$/, '') + '-compressed.' + getExt(targetFormat),
    originalSize: file.size,
    compressedSize: bytes,
    reduction: Math.max(0, Math.round((1 - bytes / file.size) * 100))
  }
}

function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(raw)
  })
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1]
  return Math.floor(base64.length * 0.75)
}

async function compressAll() {
  if (fileList.length === 0) return
  processing.value = true
  results.value = []

  try {
    for (const file of fileList.value) {
      const result = await compressImage(file)
      results.value.push(result)
    }
    ElMessage.success('压缩完成')
  } catch (e) {
    ElMessage.error('压缩失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function downloadOne(r) {
  const link = document.createElement('a')
  link.href = r.url
  link.download = r.name
  link.click()
}

function downloadAll() {
  results.value.forEach((r, i) => setTimeout(() => downloadOne(r), i * 300))
}

function clearAll() {
  uploaderRef.value?.clearFiles()
  fileList.value = []
  results.value = []
}
</script>

<style scoped>
.img-compress { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.config-tip { font-size: 12px; color: #909399; margin: 0; }
.action-bar { display: flex; gap: 12px; }
.result-box { display: flex; flex-direction: column; gap: 12px; }
.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; background: #f5f7fa; border-radius: 8px;
}
.result-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
.result-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.result-name { font-size: 13px; color: #303133; }
.size-compare { display: flex; align-items: center; gap: 4px; }
</style>
