<template>
  <ToolLayout title="PDF 合并" desc="免费在线合并多个PDF文件为一个，支持拖拽排序，本地处理不上传服务器。">
    <div class="pdf-merge">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".pdf"
        tip="支持多个 PDF 文件，按列表顺序合并"
      />

      <!-- 文件排序提示 -->
      <div v-if="fileList.length > 1" class="order-hint">
        <el-icon><InfoFilled /></el-icon>
        文件将按上方列表顺序合并，可拖拽调整顺序（点击删除按钮移除）
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar" v-if="fileList.length >= 2">
        <el-button type="primary" size="large" :loading="processing" @click="mergePdfs">
          {{ processing ? '合并中...' : `合并 ${fileList.length} 个文件` }}
        </el-button>
        <el-button size="large" @click="clearAll">清空</el-button>
      </div>

      <!-- 下载结果 -->
      <div v-if="resultUrl" class="result-box">
        <el-alert title="合并成功！" type="success" show-icon :closable="false" />
        <el-button type="primary" :icon="Download" @click="downloadResult" class="download-btn">
          下载合并后的 PDF
        </el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, InfoFilled } from '@element-plus/icons-vue'
import { PDFDocument } from 'pdf-lib'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const processing = ref(false)
const resultUrl = ref('')
const uploaderRef = ref()

async function mergePdfs() {
  if (fileList.length < 2) {
    ElMessage.warning('请至少上传 2 个 PDF 文件')
    return
  }

  processing.value = true
  try {
    const mergedPdf = await PDFDocument.create()

    for (const file of fileList.value) {
      const bytes = await file.raw.arrayBuffer()
      const pdf = await PDFDocument.load(bytes)
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      pages.forEach((page) => mergedPdf.addPage(page))
    }

    const mergedBytes = await mergedPdf.save()
    const blob = new Blob([mergedBytes], { type: 'application/pdf' })
    resultUrl.value = URL.createObjectURL(blob)
    ElMessage.success('合并成功')
  } catch (e) {
    ElMessage.error('合并失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function downloadResult() {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = `merged-${Date.now()}.pdf`
  link.click()
}

function clearAll() {
  uploaderRef.value?.clearFiles()
  fileList.value = []
  resultUrl.value = ''
}
</script>

<style scoped>
.pdf-merge {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
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

.download-btn {
  align-self: flex-start;
}
</style>
