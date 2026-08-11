<template>
  <ToolLayout
    title="图片转 PDF"
    desc="免费在线将图片(JPG/PNG/GIF/BMP/WebP)转换为PDF，支持拖拽排序、多图/页、页面设置与元数据，本地处理不上传。"
    fav-key="img-to-pdf"
  >
    <div class="img-to-pdf">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
        :sortable="true"
        tip="支持 JPG/PNG/GIF/BMP/WebP，可多选，拖拽列表调整顺序"
      />

      <template v-if="fileList.length >= 1">
        <!-- 页面方向 -->
        <div class="config-section">
          <label class="config-title">页面方向</label>
          <el-radio-group v-model="orientation">
            <el-radio-button value="portrait">纵向</el-radio-button>
            <el-radio-button value="landscape">横向</el-radio-button>
            <el-radio-button value="auto">自适应（按图片比例）</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 页面大小 -->
        <div class="config-section">
          <label class="config-title">页面大小</label>
          <el-select v-model="pageSize" size="default" class="page-size-select">
            <el-option label="A4 (210×297mm)" value="A4" />
            <el-option label="A3 (297×420mm)" value="A3" />
            <el-option label="Letter (216×279mm)" value="Letter" />
            <el-option label="自适应图片大小" value="auto" />
          </el-select>
          <p v-if="pageSize !== 'auto'" class="config-tip">
            「自适应」仅在每页 1 图时生效；多图/页时按 A4 布局。
          </p>
        </div>

        <!-- 边距 -->
        <div class="config-section">
          <label class="config-title">页面边距（{{ margin }} px）</label>
          <el-slider v-model="margin" :min="0" :max="50" :step="1" show-input :show-input-controls="false" />
        </div>

        <!-- 每页图片数 -->
        <div class="config-section">
          <label class="config-title">每页图片数</label>
          <el-radio-group v-model="imagesPerPage">
            <el-radio-button :value="1">每页 1 图</el-radio-button>
            <el-radio-button :value="2">每页 2 图</el-radio-button>
            <el-radio-button :value="4">每页 4 图</el-radio-button>
          </el-radio-group>
        </div>

        <!-- PDF 元数据 -->
        <div class="config-section">
          <label class="config-title">PDF 元数据（可选）</label>
          <div class="meta-row">
            <el-input v-model="metaTitle" placeholder="标题（留空则不设置）" size="default" />
            <el-input v-model="metaAuthor" placeholder="作者（留空则不设置）" size="default" />
          </div>
        </div>

        <!-- 输出文件名 -->
        <div class="config-section">
          <label class="config-title">输出文件名</label>
          <el-input v-model="outputName" placeholder="留空则自动 images-to-pdf-时间戳.pdf" size="default">
            <template #append>.pdf</template>
          </el-input>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="convertToPdf">
            {{ processing ? '转换中...' : `转换 ${fileList.length} 张图片` }}
          </el-button>
          <el-button size="large" @click="onClear">清空</el-button>
        </div>
      </template>

      <!-- 结果 -->
      <div v-if="resultBlob" class="result-box">
        <el-alert title="转换成功！" type="success" show-icon :closable="false" />
        <el-button type="primary" :icon="Download" @click="downloadResult">下载 PDF</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { Download } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob } from '@/composables/useDownload'
import { loadPdfLib } from '@/composables/usePdfEngine'
import { loadImage, canvasToBlob } from '@/composables/useImageProcessor'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()

const orientation = ref('auto')
const pageSize = ref('A4')
const margin = ref(20)
const imagesPerPage = ref(1)
const metaTitle = ref('')
const metaAuthor = ref('')
const outputName = ref('')
const resultBlob = ref(null)

// 页面尺寸（单位：点，1mm ≈ 2.8346 点）
const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  Letter: { width: 612, height: 792 }
}

function finalName() {
  const n = outputName.value.trim().replace(/\.pdf$/i, '')
  return (n || `images-to-pdf-${Date.now()}`) + '.pdf'
}

async function convertToPdf() {
  if (!fileList.value.length) return
  resultBlob.value = null
  await run(async () => {
    const { PDFDocument } = await loadPdfLib()
    const pdfDoc = await PDFDocument.create()

    if (metaTitle.value.trim()) pdfDoc.setTitle(metaTitle.value.trim())
    if (metaAuthor.value.trim()) pdfDoc.setAuthor(metaAuthor.value.trim())

    // 1) 格式归一化：所有图片先画到 canvas 并导出 JPEG，
    //    解决 GIF/BMP/WebP 直接 embedJpg 失败的问题（透明区域填白）
    const normalized = [] // [{ bytes, w, h }]
    for (const file of fileList.value) {
      const img = await loadImage(file.raw)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.85)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      normalized.push({ bytes, w: img.naturalWidth, h: img.naturalHeight })
    }

    // 2) 预嵌入为 PDFImage（含 width/height）
    const embedded = []
    for (const im of normalized) {
      embedded.push(await pdfDoc.embedJpg(im.bytes))
    }

    const m = margin.value
    const perPage = imagesPerPage.value

    if (perPage === 1) {
      for (const im of embedded) {
        let pw, ph
        if (pageSize.value === 'auto') {
          pw = im.width + m * 2
          ph = im.height + m * 2
        } else {
          const s = PAGE_SIZES[pageSize.value]
          if (orientation.value === 'landscape') {
            pw = s.height; ph = s.width
          } else if (orientation.value === 'portrait') {
            pw = s.width; ph = s.height
          } else {
            // auto: 按图片比例选择方向
            if (im.width > im.height) { pw = s.height; ph = s.width }
            else { pw = s.width; ph = s.height }
          }
        }
        const page = pdfDoc.addPage([pw, ph])
        const maxW = pw - m * 2
        const maxH = ph - m * 2
        const sc = Math.min(maxW / im.width, maxH / im.height)
        const dw = im.width * sc
        const dh = im.height * sc
        page.drawImage(im, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh })
      }
    } else {
      // 多图/页：网格布局
      const cols = perPage === 4 ? 2 : orientation.value === 'portrait' ? 1 : 2
      const rows = perPage === 4 ? 2 : orientation.value === 'portrait' ? 2 : 1
      const s = PAGE_SIZES[pageSize.value === 'auto' ? 'A4' : pageSize.value]
      let pw, ph
      if (orientation.value === 'landscape') {
        pw = s.height; ph = s.width
      } else {
        // portrait 与 auto（多图时按纵向 A4）
        pw = s.width; ph = s.height
      }
      const cellW = (pw - m * (cols + 1)) / cols
      const cellH = (ph - m * (rows + 1)) / rows

      for (let i = 0; i < embedded.length; i += perPage) {
        const page = pdfDoc.addPage([pw, ph])
        for (let j = 0; j < perPage && i + j < embedded.length; j++) {
          const im = embedded[i + j]
          const col = j % cols
          const row = Math.floor(j / cols)
          const sc = Math.min(cellW / im.width, cellH / im.height)
          const dw = im.width * sc
          const dh = im.height * sc
          const centerX = m + col * (cellW + m) + cellW / 2
          const centerFromTop = m + row * (cellH + m) + cellH / 2
          const x = centerX - dw / 2
          const y = ph - centerFromTop - dh / 2
          page.drawImage(im, { x, y, width: dw, height: dh })
        }
      }
    }

    const out = await pdfDoc.save()
    resultBlob.value = new Blob([out], { type: 'application/pdf' })
    ElMessage.success('转换成功')
  }, '转换')
}

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, finalName())
}

function onClear() {
  clearAll(() => {
    resultBlob.value = null
    outputName.value = ''
    metaTitle.value = ''
    metaAuthor.value = ''
  })
}
</script>

<style scoped>
.img-to-pdf {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.page-size-select {
  width: 240px;
}

.meta-row {
  display: flex;
  gap: 12px;
}

.meta-row .el-input {
  flex: 1;
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
  .page-size-select {
    width: 100%;
  }

  .meta-row {
    flex-direction: column;
  }

  .config-section :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
  }

  .config-section :deep(.el-radio-button) {
    flex: 1;
    min-width: 80px;
  }
}
</style>
