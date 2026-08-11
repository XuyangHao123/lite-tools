<template>
  <ToolLayout
    title="PDF 压缩"
    desc="免费在线压缩PDF文件大小，轻度清理元数据，中度/强度栅格化重压，本地处理不上传服务器。"
    fav-key="pdf-compress"
  >
    <div class="pdf-compress">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".pdf"
        tip="上传一个 PDF 文件进行压缩"
      />

      <template v-if="fileList.length === 1">
        <div class="file-info">
          <el-tag type="info" size="large">共 {{ totalPages }} 页</el-tag>
          <el-tag v-if="originalBytes" type="info" size="large">原始大小：{{ originalSize }}</el-tag>
        </div>

        <!-- 压缩级别 -->
        <div class="config-section">
          <label class="config-title">压缩级别</label>
          <el-radio-group v-model="level">
            <el-radio-button value="light">轻度（清理元数据，无损）</el-radio-button>
            <el-radio-button value="medium">中度（栅格化，有损）</el-radio-button>
            <el-radio-button value="strong">强度（更强压缩，有损）</el-radio-button>
          </el-radio-group>
          <p class="config-tip">
            轻度仅清理元数据并优化对象流（无损，对已压缩文件效果有限）；
            中度/强度会将每页栅格化为 JPEG 重新嵌入，适合扫描件，
            <strong>文字型 PDF 可能变模糊</strong>。
          </p>
        </div>

        <!-- 灰度（仅强度） -->
        <div class="config-section" v-if="level === 'strong'">
          <el-checkbox v-model="grayscale">转换为灰度（进一步减小体积）</el-checkbox>
        </div>

        <!-- 输出文件名 -->
        <div class="config-section">
          <label class="config-title">输出文件名</label>
          <el-input
            v-model="outputName"
            placeholder="留空则自动 compressed-时间戳.pdf"
            size="default"
          >
            <template #append>.pdf</template>
          </el-input>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="compressPdf">
            {{ processing ? `压缩中... ${progress}` : '开始压缩' }}
          </el-button>
          <el-button size="large" @click="onClear">清空</el-button>
        </div>
      </template>

      <!-- 结果 -->
      <div v-if="resultBlob" class="result-box">
        <el-alert type="success" show-icon :closable="false">
          <template #title>
            压缩成功！{{ originalSize }} → {{ compressedSize }}（{{ reductionText }}）
          </template>
        </el-alert>
        <el-button type="primary" :icon="Download" @click="downloadResult">下载压缩后的 PDF</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Download } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob } from '@/composables/useDownload'
import { loadPdfLib, loadPdfjs, usePdfPageCount } from '@/composables/usePdfEngine'
import { canvasToBlob } from '@/composables/useImageProcessor'
import { formatSize } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()
const { totalPages, read } = usePdfPageCount()

const level = ref('medium')
const grayscale = ref(false)
const outputName = ref('')
const resultBlob = ref(null)
const originalBytes = ref(0)
const compressedBytes = ref(0)
const progress = ref('')

const originalSize = computed(() => formatSize(originalBytes.value))
const compressedSize = computed(() => formatSize(compressedBytes.value))
const reduction = computed(() => {
  if (!originalBytes.value || !compressedBytes.value) return 0
  return Math.round((1 - compressedBytes.value / originalBytes.value) * 100)
})
const reductionText = computed(() =>
  reduction.value > 0 ? `减少 ${reduction.value}%` : '体积未减小（矢量型 PDF 栅格化后可能增大）'
)

watch(fileList, async (files) => {
  resultBlob.value = null
  originalBytes.value = 0
  compressedBytes.value = 0
  progress.value = ''
  if (!files.length) {
    totalPages.value = 0
    return
  }
  await read(files[0])
})

function finalName() {
  const n = outputName.value.trim().replace(/\.pdf$/i, '')
  return (n || `compressed-${Date.now()}`) + '.pdf'
}

async function compressPdf() {
  if (fileList.value.length !== 1) return
  resultBlob.value = null
  originalBytes.value = 0
  compressedBytes.value = 0
  await run(async () => {
    const file = fileList.value[0]
    const raw = await file.raw.arrayBuffer()
    originalBytes.value = raw.byteLength

    let out
    if (level.value === 'light') {
      // 轻度：清理元数据 + 对象流优化（无损）
      const { PDFDocument } = await loadPdfLib()
      const pdf = await PDFDocument.load(raw, { ignoreEncryption: true, updateMetadata: false })
      try {
        pdf.setTitle('')
        pdf.setAuthor('')
        pdf.setSubject('')
        pdf.setKeywords([])
        pdf.setProducer('')
        pdf.setCreator('')
      } catch {
        /* 部分加密文件元数据不可改，忽略 */
      }
      out = await pdf.save({ useObjectStreams: true, addDefaultPage: false })
    } else {
      // 中度/强度：栅格化每页为 JPEG 重新嵌入
      const scale = level.value === 'medium' ? 1.5 : 1.0
      const quality = level.value === 'medium' ? 0.6 : 0.4
      const useGray = level.value === 'strong' && grayscale.value

      const pdfjs = await loadPdfjs()
      const { PDFDocument } = await loadPdfLib()
      const src = await pdfjs.getDocument({ data: raw.slice(0), isEvalSupported: false }).promise
      const outPdf = await PDFDocument.create()

      for (let i = 1; i <= src.numPages; i++) {
        progress.value = `(${i}/${src.numPages})`
        const page = await src.getPage(i)
        const vp = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = Math.ceil(vp.width)
        canvas.height = Math.ceil(vp.height)
        if (useGray) ctx.filter = 'grayscale(1)'
        await page.render({ canvasContext: ctx, viewport: vp }).promise
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
        const jpgBytes = new Uint8Array(await blob.arrayBuffer())
        const img = await outPdf.embedJpg(jpgBytes)
        // 原页面尺寸（scale=1 等效）
        const w = vp.width / scale
        const h = vp.height / scale
        const p = outPdf.addPage([w, h])
        p.drawImage(img, { x: 0, y: 0, width: w, height: h })
      }
      try {
        await src.destroy()
      } catch {
        /* ignore */
      }
      out = await outPdf.save()
    }

    compressedBytes.value = out.byteLength
    resultBlob.value = new Blob([out], { type: 'application/pdf' })
    if (reduction.value > 0) {
      ElMessage.success(`压缩完成，减少 ${reduction.value}%`)
    } else {
      ElMessage.info('该文件已较紧凑，压缩空间有限（矢量型 PDF 栅格化后可能增大）')
    }
    progress.value = ''
  }, '压缩')
}

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, finalName())
}

function onClear() {
  clearAll(() => {
    resultBlob.value = null
    originalBytes.value = 0
    compressedBytes.value = 0
    totalPages.value = 0
    progress.value = ''
    outputName.value = ''
  })
}
</script>

<style scoped>
.pdf-compress {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.file-info {
  display: flex;
  flex-wrap: wrap;
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
  line-height: 1.6;
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

@media (max-width: 768px) {
  .config-section :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
  }

  .config-section :deep(.el-radio-button) {
    flex: 1;
    min-width: 100px;
  }
}
</style>
