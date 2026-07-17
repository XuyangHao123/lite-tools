<template>
  <ToolLayout title="图片格式转换" desc="免费在线转换图片格式，支持JPG/PNG/WebP/互转，本地处理不上传。">
    <div class="img-convert">
      <FileUploader ref="uploaderRef" v-model="fileList" accept=".jpg,.jpeg,.png,.webp,.bmp" tip="支持 JPG、PNG、WebP、BMP，可多选批量转换" />

      <template v-if="fileList.length >= 1">
        <div class="config-section">
          <label class="config-title">转换为</label>
          <el-radio-group v-model="targetFormat">
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
            <el-radio-button value="image/png">PNG</el-radio-button>
            <el-radio-button value="image/webp">WebP</el-radio-button>
          </el-radio-group>
        </div>

        <div class="config-section" v-if="targetFormat === 'image/jpeg' || targetFormat === 'image/webp'">
          <label class="config-title">质量</label>
          <el-slider v-model="quality" :min="10" :max="100" :step="5" show-input :show-input-controls="false" />
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="convertAll">
            {{ processing ? '转换中...' : `转换 ${fileList.length} 张图片` }}
          </el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>

      <div v-if="results.length" class="result-box">
        <el-alert :title="`转换完成！共 ${results.length} 张`" type="success" show-icon :closable="false" />
        <div class="result-list">
          <div v-for="(r, i) in results" :key="i" class="result-item">
            <img :src="r.url" class="result-thumb" :alt="r.name" />
            <span class="result-name">{{ r.name }}</span>
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
import { Download } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const targetFormat = ref('image/png')
const quality = ref(85)
const processing = ref(false)
const results = ref([])

const EXT_MAP = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(raw)
  })
}

async function convertImage(file) {
  const img = await loadImage(file.raw)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (targetFormat.value === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)

  const dataUrl = canvas.toDataURL(targetFormat.value, quality.value / 100)
  const blob = await (await fetch(dataUrl)).blob()
  const ext = EXT_MAP[targetFormat.value]
  return {
    url: URL.createObjectURL(blob),
    name: file.name.replace(/\.[^.]+$/, '') + '.' + ext
  }
}

async function convertAll() {
  if (fileList.length === 0) return
  processing.value = true
  results.value = []
  try {
    for (const file of fileList.value) {
      results.value.push(await convertImage(file))
    }
    ElMessage.success('转换完成')
  } catch (e) {
    ElMessage.error('转换失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function downloadOne(r) { const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click() }
function downloadAll() { results.value.forEach((r, i) => setTimeout(() => downloadOne(r), i * 300)) }
function clearAll() { uploaderRef.value?.clearFiles(); fileList.value = []; results.value = [] }
</script>

<style scoped>
.img-convert { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.action-bar { display: flex; gap: 12px; }
.result-box { display: flex; flex-direction: column; gap: 12px; }
.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f7fa; border-radius: 8px; }
.result-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
.result-name { flex: 1; font-size: 13px; color: #303133; }
</style>
