<template>
  <ToolLayout
    title="图片压缩"
    desc="免费在线压缩图片大小，支持 JPG/PNG/WebP，自定义质量或目标体积，本地处理不上传。"
    fav-key="image-compress"
  >
    <div class="img-compress">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".jpg,.jpeg,.png,.webp"
        tip="支持 JPG、PNG、WebP 格式，可多选批量压缩"
      />

      <template v-if="fileList.length >= 1">
        <!-- 压缩模式 -->
        <div class="config-section">
          <label class="config-title">压缩模式</label>
          <el-radio-group v-model="compressMode">
            <el-radio-button value="quality">按质量</el-radio-button>
            <el-radio-button value="target">按目标体积</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 按质量 -->
        <div v-if="compressMode === 'quality'" class="config-section">
          <label class="config-title">压缩质量</label>
          <el-slider v-model="quality" :min="10" :max="100" :step="1" show-input :show-input-controls="false" />
          <p class="config-tip">质量越低，体积越小。建议 60-80 之间。</p>
        </div>

        <!-- 按目标体积 -->
        <div v-else class="config-section">
          <label class="config-title">目标体积（KB）</label>
          <el-input-number v-model="targetKB" :min="1" :max="102400" :controls="false" size="default" style="width: 200px" />
          <p class="config-tip">自动二分查找能压缩到目标体积的最高质量；若即便最低质量仍超出目标，将给出提示并使用最低质量。</p>
        </div>

        <!-- 输出格式 -->
        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="outputFormat">
            <el-radio-button value="auto">保持原格式</el-radio-button>
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
            <el-radio-button value="image/png">PNG</el-radio-button>
            <el-radio-button value="image/webp">WebP（更小）</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 文件名模板 -->
        <div class="config-section">
          <label class="config-title">文件名模板</label>
          <el-input v-model="nameTpl" size="default" style="max-width: 320px">
            <template #prepend>命名</template>
          </el-input>
          <p class="config-tip">用 <code>{name}</code> 代表原文件名（不含扩展名），默认 <code>{name}-compressed</code>。</p>
        </div>

        <!-- 操作 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="run(compressAll, '压缩')">
            {{ processing ? '压缩中...' : `压缩 ${fileList.length} 张图片` }}
          </el-button>
          <el-button size="large" @click="clearAll(() => { results = [] })">清空</el-button>
        </div>
      </template>

      <!-- 结果列表 -->
      <div v-if="results.length" class="result-box">
        <el-alert :title="`压缩完成！共处理 ${results.length} 张图片`" type="success" show-icon :closable="false" />
        <div class="result-list">
          <div v-for="(r, i) in results" :key="i" class="result-item">
            <img :src="r.compUrl" class="result-thumb" :alt="r.name" />
            <div class="result-info">
              <span class="result-name">{{ r.name }}</span>
              <div class="size-compare">
                <el-tag size="small" type="info">{{ formatSize(r.originalSize) }}</el-tag>
                <el-icon><Right /></el-icon>
                <el-tag size="small" :type="r.reduction > 0 ? 'success' : 'info'">{{ formatSize(r.compressedSize) }}</el-tag>
                <el-tag v-if="r.reduction > 0" size="small" type="success">-{{ r.reduction }}%</el-tag>
                <el-tag v-else size="small" type="warning">未减小</el-tag>
                <el-tag v-if="r.quality != null" size="small" type="info">q{{ Math.round(r.quality * 100) }}</el-tag>
                <el-tooltip
                  v-if="r.achieved === false"
                  :content="`无法压缩到目标 ${targetKB}KB，已使用最低质量`"
                >
                  <el-tag size="small" type="danger">未达标</el-tag>
                </el-tooltip>
              </div>
            </div>
            <div class="result-actions">
              <el-button size="small" @click="openCompare(r)">对比</el-button>
              <el-button size="small" :icon="Download" @click="downloadOne(r)">下载</el-button>
            </div>
          </div>
        </div>
        <el-button type="primary" :icon="Files" @click="downloadAllZip" v-if="results.length > 1">
          打包下载全部（ZIP）
        </el-button>
      </div>

      <!-- 对比弹窗 -->
      <el-dialog v-model="compareVisible" title="压缩前后对比" width="760px" append-to-body>
        <div v-if="compareCurrent" class="compare-box">
          <div class="compare-stage">
            <img :src="compareCurrent.origUrl" class="compare-img under" alt="原图" />
            <img
              :src="compareCurrent.compUrl"
              class="compare-img over"
              :style="{ opacity: fade / 100 }"
              alt="压缩后"
            />
            <span class="compare-label left">原图</span>
            <span class="compare-label right">压缩后 ({{ formatSize(compareCurrent.compressedSize) }})</span>
          </div>
          <el-slider v-model="fade" :min="0" :max="100" :step="1" show-input :show-input-controls="false" />
          <p class="compare-tip">拖动滑块在原图与压缩图之间淡入淡出对比。</p>
        </div>
      </el-dialog>
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
import {
  loadImage,
  createCanvas,
  canvasToBlob,
  fillWhiteBg,
  mimeToExt
} from '@/composables/useImageProcessor'
import { formatSize, stripExt } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()

const compressMode = ref('quality') // quality | target
const quality = ref(70)
const targetKB = ref(200)
const outputFormat = ref('auto') // auto | image/jpeg | image/png | image/webp
const nameTpl = ref('{name}-compressed')
const results = ref([])

// 对比弹窗
const compareVisible = ref(false)
const compareCurrent = ref(null)
const fade = ref(50)

// 文件列表变化时清空旧结果
watch(fileList, () => {
  revokeResults()
  results.value = []
})

function resolveMime(file) {
  if (outputFormat.value !== 'auto') return outputFormat.value
  const t = file.raw.type
  if (t === 'image/jpeg' || t === 'image/png' || t === 'image/webp') return t
  return 'image/png'
}

function buildName(file, mime) {
  const base = stripExt(file.name) || 'image'
  const name = nameTpl.value.replace(/\{name\}/g, base) || base
  return `${name}.${mimeToExt(mime)}`
}

/** 单图压缩，返回结果对象 */
async function compressOne(file) {
  const img = await loadImage(file.raw)
  const mime = resolveMime(file)
  const { canvas, ctx } = createCanvas(img.naturalWidth, img.naturalHeight, false)
  if (mime === 'image/jpeg') fillWhiteBg(ctx, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)

  let blob
  let usedQuality = null
  let achieved = null
  if (compressMode.value === 'quality') {
    blob = await canvasToBlob(canvas, mime, quality.value / 100)
  } else {
    const res = await compressToTarget(canvas, mime, targetKB.value * 1024)
    blob = res.blob
    usedQuality = res.quality
    achieved = res.achieved
  }

  const originalSize = file.size
  const compressedSize = blob.size
  const reduction = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
  return {
    name: buildName(file, mime),
    blob,
    originalSize,
    compressedSize,
    reduction,
    quality: usedQuality,
    achieved,
    origUrl: URL.createObjectURL(file.raw),
    compUrl: URL.createObjectURL(blob)
  }
}

/** 按目标体积二分查找最高质量（使体积 ≤ 目标） */
async function compressToTarget(canvas, mime, targetBytes) {
  // 最高质量即已达标 → 直接用
  const hiBlob = await canvasToBlob(canvas, mime, 1.0)
  if (hiBlob.size <= targetBytes) return { blob: hiBlob, quality: 1.0, achieved: true }

  let lo = 0.1
  let hi = 1.0
  let best = null
  let bestQ = null
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    const b = await canvasToBlob(canvas, mime, mid)
    if (b.size <= targetBytes) {
      best = b
      bestQ = mid
      lo = mid
    } else {
      hi = mid
    }
  }
  if (best) return { blob: best, quality: bestQ, achieved: true }
  // 即便最低质量仍超出目标
  const loBlob = await canvasToBlob(canvas, mime, 0.1)
  return { blob: loBlob, quality: 0.1, achieved: false }
}

async function compressAll() {
  if (!fileList.value.length) return
  revokeResults()
  results.value = []
  const out = []
  for (const file of fileList.value) {
    out.push(await compressOne(file))
  }
  results.value = out
  ElMessage.success(`压缩完成，共 ${out.length} 张`)
}

function downloadOne(r) {
  downloadBlob(r.blob, r.name)
}

async function downloadAllZip() {
  if (!results.value.length) return
  await downloadZip(
    results.value.map((r) => ({ blob: r.blob, name: r.name })),
    'compressed-images.zip'
  )
  ElMessage.success('已打包下载')
}

function openCompare(r) {
  compareCurrent.value = r
  fade.value = 50
  compareVisible.value = true
}

function revokeResults() {
  results.value.forEach((r) => {
    if (r.origUrl) URL.revokeObjectURL(r.origUrl)
    if (r.compUrl) URL.revokeObjectURL(r.compUrl)
  })
}

onUnmounted(() => {
  revokeResults()
})
</script>

<style scoped>
.img-compress { display: flex; flex-direction: column; gap: 20px; }
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
.result-actions { display: flex; gap: 6px; flex-shrink: 0; }

.compare-box { display: flex; flex-direction: column; gap: 12px; }
.compare-stage {
  position: relative;
  width: 100%;
  height: 420px;
  background: var(--color-bg, #f5f7fa);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.compare-img { position: absolute; max-width: 100%; max-height: 100%; object-fit: contain; }
.compare-img.over { transition: opacity 0.05s linear; }
.compare-label {
  position: absolute; top: 8px;
  font-size: 12px; color: #fff;
  background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 4px;
}
.compare-label.left { left: 8px; }
.compare-label.right { right: 8px; }
.compare-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; }
@media (max-width: 768px) {
  .compare-stage { height: 260px; }
  .result-actions { flex-direction: column; }
}
</style>
