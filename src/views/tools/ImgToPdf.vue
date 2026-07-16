<template>
  <ToolLayout title="图片转 PDF" desc="免费在线将图片(JPG/PNG)转换为PDF文件，支持多图合并、页面方向设置，本地处理。">
    <div class="img-to-pdf">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
        tip="支持 JPG、PNG、GIF、BMP、WebP 格式，可多选"
      />

      <template v-if="fileList.length >= 1">
        <!-- 页面设置 -->
        <div class="config-section">
          <label class="config-title">页面方向</label>
          <el-radio-group v-model="orientation">
            <el-radio-button value="portrait">纵向</el-radio-button>
            <el-radio-button value="landscape">横向</el-radio-button>
            <el-radio-button value="auto">自适应（按图片比例）</el-radio-button>
          </el-radio-group>
        </div>

        <div class="config-section">
          <label class="config-title">页面大小</label>
          <el-select v-model="pageSize" size="default" style="width: 200px">
            <el-option label="A4 (210×297mm)" value="A4" />
            <el-option label="A3 (297×420mm)" value="A3" />
            <el-option label="Letter (216×279mm)" value="Letter" />
            <el-option label="自适应图片大小" value="auto" />
          </el-select>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="convertToPdf">
            {{ processing ? '转换中...' : `转换 ${fileList.length} 张图片` }}
          </el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>

      <!-- 下载结果 -->
      <div v-if="resultUrl" class="result-box">
        <el-alert title="转换成功！" type="success" show-icon :closable="false" />
        <el-button type="primary" :icon="Download" @click="downloadResult">下载 PDF</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { PDFDocument } from 'pdf-lib'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const orientation = ref('auto')
const pageSize = ref('A4')
const processing = ref(false)
const resultUrl = ref('')

// 页面尺寸（单位：点，1mm ≈ 2.8346 点）
const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  Letter: { width: 612, height: 792 }
}

async function convertToPdf() {
  if (fileList.length === 0) return
  processing.value = true

  try {
    const pdfDoc = await PDFDocument.create()

    for (const file of fileList.value) {
      const imgBytes = await file.raw.arrayBuffer()
      let img
      const isPng = file.name.toLowerCase().endsWith('.png')
      if (isPng) {
        img = await pdfDoc.embedPng(imgBytes)
      } else {
        img = await pdfDoc.embedJpg(imgBytes)
      }

      // 确定页面尺寸
      let pageWidth, pageHeight
      if (pageSize.value === 'auto') {
        pageWidth = img.width
        pageHeight = img.height
      } else {
        const size = PAGE_SIZES[pageSize.value]
        if (orientation.value === 'landscape') {
          pageWidth = size.height
          pageHeight = size.width
        } else if (orientation.value === 'portrait') {
          pageWidth = size.width
          pageHeight = size.height
        } else {
          // auto: 按图片比例选择方向
          if (img.width > img.height) {
            pageWidth = size.height
            pageHeight = size.width
          } else {
            pageWidth = size.width
            pageHeight = size.height
          }
        }
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight])

      // 计算图片缩放，保持比例，留 20px 边距
      const margin = 20
      const maxWidth = pageWidth - margin * 2
      const maxHeight = pageHeight - margin * 2
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height)
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale

      // 居中
      const x = (pageWidth - drawWidth) / 2
      const y = (pageHeight - drawHeight) / 2
      page.drawImage(img, { x, y, width: drawWidth, height: drawHeight })
    }

    const outBytes = await pdfDoc.save()
    const blob = new Blob([outBytes], { type: 'application/pdf' })
    resultUrl.value = URL.createObjectURL(blob)
    ElMessage.success('转换成功')
  } catch (e) {
    ElMessage.error('转换失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function downloadResult() {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = `images-to-pdf-${Date.now()}.pdf`
  link.click()
}

function clearAll() {
  uploaderRef.value?.clearFiles()
  fileList.value = []
  resultUrl.value = ''
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
  color: #303133;
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
</style>
