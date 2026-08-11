<template>
  <ToolLayout
    title="PDF 转图片"
    desc="免费在线将PDF每页转换为PNG/JPG/WebP图片，支持页码范围、清晰度与质量调节，批量打包下载，本地处理不上传。"
    fav-key="pdf-to-image"
  >
    <div class="pdf-to-img">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".pdf"
        tip="上传一个 PDF 文件，每页将转为图片"
      />

      <template v-if="fileList.length === 1">
        <div class="page-info">
          <el-tag type="info" size="large">共 {{ totalPages }} 页</el-tag>
        </div>

        <!-- 输出格式 -->
        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="format">
            <el-radio-button value="png">PNG（无损）</el-radio-button>
            <el-radio-button value="jpg">JPG（更小）</el-radio-button>
            <el-radio-button value="webp">WebP（更小）</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 清晰度 -->
        <div class="config-section">
          <label class="config-title">清晰度（缩放倍数）</label>
          <el-radio-group v-model="scale">
            <el-radio-button :value="1">标准 (1x)</el-radio-button>
            <el-radio-button :value="2">高清 (2x)</el-radio-button>
            <el-radio-button :value="3">超清 (3x)</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 质量（JPG/WebP） -->
        <div v-if="format !== 'png'" class="config-section">
          <label class="config-title">压缩质量（{{ format.toUpperCase() }}）</label>
          <el-slider v-model="quality" :min="10" :max="100" :step="5" show-input :show-input-controls="false" />
          <p class="config-tip">数值越低体积越小，建议 70-95。PNG 为无损格式，不适用此项。</p>
        </div>

        <!-- 页码范围 -->
        <div class="config-section">
          <label class="config-title">页码范围（可选）</label>
          <el-input v-model="pageRange" placeholder="留空=全部，如 1-3,5,7-9" size="default" />
          <p class="config-tip">只转换指定页，用逗号分隔，支持范围。</p>
        </div>

        <!-- 文件名前缀 -->
        <div class="config-section">
          <label class="config-title">文件名前缀</label>
          <el-input v-model="namePrefix" :placeholder="`留空则使用原文件名`" size="default" />
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="convert">
            {{ processing ? `转换中... ${progress}` : '开始转换' }}
          </el-button>
          <el-button size="large" @click="onClear">清空</el-button>
        </div>
      </template>

      <!-- 结果 -->
      <div v-if="results.length" class="result-box">
        <el-alert :title="`转换成功！共生成 ${results.length} 个文件`" type="success" show-icon :closable="false" />
        <div class="result-grid">
          <div v-for="(r, i) in results" :key="i" class="result-item">
            <img :src="r.url" :alt="r.name" class="result-thumb" />
            <span class="result-name">{{ r.name }}</span>
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
import { Download, Files } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob, downloadZip } from '@/composables/useDownload'
import { loadPdfjs, usePdfPageCount, parsePageRange } from '@/composables/usePdfEngine'
import { canvasToBlob } from '@/composables/useImageProcessor'
import { stripExt } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()
const { totalPages, read } = usePdfPageCount()

const format = ref('png') // png | jpg | webp
const scale = ref(2)
const quality = ref(85) // 10-100
const pageRange = ref('')
const namePrefix = ref('')
const results = ref([]) // [{ blob, url, name }]
const progress = ref('')

watch(fileList, async (files) => {
  results.value = []
  pageRange.value = ''
  if (!files.length) {
    totalPages.value = 0
    return
  }
  await read(files[0])
})

async function convert() {
  if (fileList.value.length !== 1) return
  results.value = []
  await run(async () => {
    const pdfjs = await loadPdfjs()
    const buf = await fileList.value[0].raw.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise
    const total = doc.numPages

    // 确定要转换的页
    let pages
    const rangeStr = pageRange.value.trim()
    if (rangeStr) {
      pages = parsePageRange(rangeStr, total)
      if (!pages.length) throw new Error('请输入有效的页码范围')
    } else {
      pages = []
      for (let i = 1; i <= total; i++) pages.push(i)
    }

    const mime = format.value === 'png' ? 'image/png' : format.value === 'jpg' ? 'image/jpeg' : 'image/webp'
    const ext = format.value
    const q = format.value === 'png' ? undefined : quality.value / 100
    const base = namePrefix.value.trim() || stripExt(fileList.value[0].name) || 'page'

    for (const pn of pages) {
      progress.value = `(${pn}/${total})`
      const page = await doc.getPage(pn)
      const vp = page.getViewport({ scale: scale.value })
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = Math.ceil(vp.width)
      canvas.height = Math.ceil(vp.height)
      // 非透明格式填白底
      if (format.value !== 'png') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      const blob = await canvasToBlob(canvas, mime, q)
      results.value.push({
        blob,
        url: URL.createObjectURL(blob),
        name: `${base}-page-${pn}.${ext}`
      })
    }
    try {
      await doc.destroy()
    } catch {
      /* ignore */
    }
    ElMessage.success('转换完成')
    progress.value = ''
  }, '转换')
}

function downloadOne(r) {
  downloadBlob(r.blob, r.name)
}

async function downloadAllZip() {
  if (!results.value.length) return
  const base = namePrefix.value.trim() || stripExt(fileList.value[0].name) || 'pages'
  await downloadZip(
    results.value.map((r) => ({ blob: r.blob, name: r.name })),
    `${base}.zip`
  )
}

function onClear() {
  clearAll(() => {
    results.value.forEach((r) => r.url && URL.revokeObjectURL(r.url))
    results.value = []
    totalPages.value = 0
    pageRange.value = ''
    namePrefix.value = ''
  })
}

onUnmounted(() => {
  results.value.forEach((r) => r.url && URL.revokeObjectURL(r.url))
})
</script>

<style scoped>
.pdf-to-img {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-info {
  display: flex;
  gap: 8px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.config-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}

.action-bar {
  display: flex;
  gap: 12px;
}

.result-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.result-thumb {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.result-name {
  font-size: 12px;
  color: var(--color-text-regular);
  font-family: monospace;
  text-align: center;
  word-break: break-all;
}

@media (max-width: 768px) {
  .config-section :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
  }

  .config-section :deep(.el-radio-button) {
    flex: 1;
    min-width: 90px;
  }
}
</style>
