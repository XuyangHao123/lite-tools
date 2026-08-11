<template>
  <ToolLayout
    title="图片格式转换"
    desc="免费在线转换图片格式，支持 JPG/PNG/WebP 互转，可按最小体积自动选择格式，本地处理不上传。"
    fav-key="image-convert"
  >
    <div class="img-convert">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".jpg,.jpeg,.png,.webp,.bmp"
        tip="支持 JPG、PNG、WebP、BMP，可多选批量转换"
      />

      <template v-if="fileList.length >= 1">
        <!-- 目标格式 -->
        <div class="config-section">
          <label class="config-title">转换目标</label>
          <el-radio-group v-model="targetFormat" :disabled="autoMin">
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
            <el-radio-button value="image/png">PNG（无损）</el-radio-button>
            <el-radio-button value="image/webp">WebP</el-radio-button>
          </el-radio-group>
          <el-checkbox v-model="autoMin">按最小体积自动选择格式（对每图分别转 3 种取最小）</el-checkbox>
        </div>

        <!-- 质量（JPG/WebP 适用，PNG 无损） -->
        <div v-if="!autoMin && (targetFormat === 'image/jpeg' || targetFormat === 'image/webp')" class="config-section">
          <label class="config-title">质量</label>
          <el-slider v-model="quality" :min="10" :max="100" :step="1" show-input :show-input-controls="false" />
          <p class="config-tip">PNG 为无损格式，不使用质量参数。</p>
        </div>

        <!-- 文件名模板 -->
        <div class="config-section">
          <label class="config-title">文件名模板</label>
          <el-input v-model="nameTpl" size="default" style="max-width: 320px">
            <template #prepend>命名</template>
          </el-input>
          <p class="config-tip">用 <code>{name}</code> 代表原文件名（不含扩展名），扩展名按目标格式自动生成。</p>
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="run(convertAll, '转换')">
            {{ processing ? '转换中...' : `转换 ${fileList.length} 张图片` }}
          </el-button>
          <el-button size="large" @click="clearAll(() => { results = [] })">清空</el-button>
        </div>
      </template>

      <!-- 结果列表 -->
      <div v-if="results.length" class="result-box">
        <el-alert :title="`转换完成！共 ${results.length} 张`" type="success" show-icon :closable="false" />
        <div class="result-list">
          <div v-for="(r, i) in results" :key="i" class="result-item">
            <img :src="r.url" class="result-thumb" :alt="r.name" />
            <div class="result-info">
              <span class="result-name">{{ r.name }}</span>
              <div class="size-compare">
                <el-tag size="small" type="info">{{ formatSize(r.originalSize) }}</el-tag>
                <el-icon><Right /></el-icon>
                <el-tag size="small" :type="r.delta < 0 ? 'success' : 'warning'">{{ formatSize(r.compressedSize) }}</el-tag>
                <el-tag v-if="r.delta < 0" size="small" type="success">{{ r.delta }}%</el-tag>
                <el-tag v-if="r.chosenFormat" size="small" type="info">自动: {{ r.chosenFormat.toUpperCase() }}</el-tag>
              </div>
            </div>
            <el-button size="small" :icon="Download" @click="downloadOne(r)">下载</el-button>
          </div>
        </div>
        <el-button type="primary" :icon="Files" @click="downloadAllZip" v-if="results.length > 1">
          打包下载全部（ZIP）
        </el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { Download, Right, Files } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob, downloadZip } from '@/composables/useDownload'
import { loadImage, createCanvas, canvasToBlob, fillWhiteBg, mimeToExt } from '@/composables/useImageProcessor'
import { formatSize, stripExt } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()

const targetFormat = ref('image/png')
const autoMin = ref(false)
const quality = ref(85)
const nameTpl = ref('{name}')
const results = ref([])

const CANDIDATES = ['image/jpeg', 'image/png', 'image/webp']

watch(fileList, () => {
  revokeResults()
  results.value = []
})

function buildName(file, mime) {
  const base = stripExt(file.name) || 'image'
  const name = nameTpl.value.replace(/\{name\}/g, base) || base
  return `${name}.${mimeToExt(mime)}`
}

/** 把图片绘制到与原图同尺寸的画布（JPG 填白底），返回 canvas+ctx */
async function imageToCanvas(file, mime) {
  const img = await loadImage(file.raw)
  const { canvas, ctx } = createCanvas(img.naturalWidth, img.naturalHeight, false)
  if (mime === 'image/jpeg') fillWhiteBg(ctx, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  return canvas
}

async function convertOne(file) {
  const originalSize = file.size
  if (autoMin.value) {
    // 对每种格式生成 blob，取最小
    const tries = []
    for (const mime of CANDIDATES) {
      const canvas = await imageToCanvas(file, mime)
      const q = mime === 'image/png' ? 1 : quality.value / 100
      const blob = await canvasToBlob(canvas, mime, q)
      tries.push({ mime, blob })
    }
    tries.sort((a, b) => a.blob.size - b.blob.size)
    const best = tries[0]
    const compressedSize = best.blob.size
    return {
      name: buildName(file, best.mime),
      blob: best.blob,
      url: URL.createObjectURL(best.blob),
      originalSize,
      compressedSize,
      delta: Math.round((compressedSize / originalSize - 1) * 100),
      chosenFormat: mimeToExt(best.mime)
    }
  } else {
    const mime = targetFormat.value
    const canvas = await imageToCanvas(file, mime)
    const q = mime === 'image/png' ? 1 : quality.value / 100
    const blob = await canvasToBlob(canvas, mime, q)
    const compressedSize = blob.size
    return {
      name: buildName(file, mime),
      blob,
      url: URL.createObjectURL(blob),
      originalSize,
      compressedSize,
      delta: Math.round((compressedSize / originalSize - 1) * 100),
      chosenFormat: null
    }
  }
}

async function convertAll() {
  if (!fileList.value.length) return
  revokeResults()
  results.value = []
  const out = []
  for (const file of fileList.value) {
    out.push(await convertOne(file))
  }
  results.value = out
  ElMessage.success(`转换完成，共 ${out.length} 张`)
}

function downloadOne(r) {
  downloadBlob(r.blob, r.name)
}

async function downloadAllZip() {
  if (!results.value.length) return
  await downloadZip(
    results.value.map((r) => ({ blob: r.blob, name: r.name })),
    'converted-images.zip'
  )
  ElMessage.success('已打包下载')
}

function revokeResults() {
  results.value.forEach((r) => {
    if (r.url) URL.revokeObjectURL(r.url)
  })
}

onUnmounted(() => {
  revokeResults()
})
</script>

<style scoped>
.img-convert { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.config-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; }
.config-tip code { background: var(--color-primary-light, #ecf5ff); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
.action-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.result-box { display: flex; flex-direction: column; gap: 12px; }
.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px;
  background: var(--color-bg, #f5f7fa);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 8px;
}
.result-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
.result-info { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.result-name { font-size: 13px; color: var(--color-text-primary, #303133); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.size-compare { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
</style>
