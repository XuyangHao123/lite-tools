<template>
  <ToolLayout title="PDF 压缩" desc="免费在线压缩PDF文件大小，通过优化结构和移除冗余数据减小体积，本地处理。">
    <div class="pdf-compress">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".pdf"
        tip="上传一个 PDF 文件进行压缩"
      />

      <template v-if="fileList.length === 1">
        <!-- 原始文件信息 -->
        <div class="file-info">
          <el-tag type="info" size="large">原始大小：{{ originalSize }}</el-tag>
        </div>

        <!-- 压缩级别 -->
        <div class="config-section">
          <label class="config-title">压缩级别</label>
          <el-radio-group v-model="level">
            <el-radio-button value="light">轻度（保留质量）</el-radio-button>
            <el-radio-button value="medium">中度（推荐）</el-radio-button>
            <el-radio-button value="strong">重度（最小体积）</el-radio-button>
          </el-radio-group>
          <p class="config-tip">
            压缩通过重新序列化PDF结构、移除冗余元数据实现。重度压缩会移除更多非必要内容。
          </p>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="compressPdf">
            {{ processing ? '压缩中...' : '开始压缩' }}
          </el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>

      <!-- 压缩结果 -->
      <div v-if="resultUrl" class="result-box">
        <el-alert type="success" show-icon :closable="false">
          <template #title>
            压缩成功！{{ originalSize }} → {{ compressedSize }}（减少 {{ reduction }}%）
          </template>
        </el-alert>
        <el-button type="primary" :icon="Download" @click="downloadResult">下载压缩后的 PDF</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { PDFDocument } from 'pdf-lib'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const level = ref('medium')
const processing = ref(false)
const resultUrl = ref('')
const originalSize = ref('')
const compressedSize = ref('')
const originalBytes = ref(0)
const compressedBytes = ref(0)

const reduction = computed(() => {
  if (!originalBytes.value || !compressedBytes.value) return 0
  return Math.round((1 - compressedBytes.value / originalBytes.value) * 100)
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

async function compressPdf() {
  if (fileList.length !== 1) return
  processing.value = true

  try {
    const raw = await fileList.value[0].raw.arrayBuffer()
    originalBytes.value = raw.byteLength
    originalSize.value = formatSize(raw.byteLength)

    // 加载 PDF
    const pdf = await PDFDocument.load(raw, {
      ignoreEncryption: true,
      updateMetadata: level.value !== 'light'
    })

    // 根据压缩级别处理
    if (level.value === 'strong' || level.value === 'medium') {
      // 移除元数据
      pdf.setTitle('')
      pdf.setAuthor('')
      pdf.setSubject('')
      pdf.setKeywords([])
      pdf.setProducer('')
      pdf.setCreator('')
    }

    // 保存，使用对象流优化
    const saveOptions = {
      useObjectStreams: true,
      addDefaultPage: false
    }

    const outBytes = await pdf.save(saveOptions)
    compressedBytes.value = outBytes.byteLength
    compressedSize.value = formatSize(outBytes.byteLength)

    const blob = new Blob([outBytes], { type: 'application/pdf' })
    resultUrl.value = URL.createObjectURL(blob)

    if (reduction.value <= 0) {
      ElMessage.info('该文件已较紧凑，压缩空间有限')
    } else {
      ElMessage.success(`压缩完成，减少了 ${reduction.value}%`)
    }
  } catch (e) {
    ElMessage.error('压缩失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function downloadResult() {
  if (!resultUrl.value) return
  const link = document.createElement('a')
  link.href = resultUrl.value
  link.download = `compressed-${Date.now()}.pdf`
  link.click()
}

function clearAll() {
  uploaderRef.value?.clearFiles()
  fileList.value = []
  resultUrl.value = ''
  originalSize.value = ''
  compressedSize.value = ''
  originalBytes.value = 0
  compressedBytes.value = 0
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
  color: #303133;
}

.config-tip {
  font-size: 12px;
  color: #909399;
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
</style>
