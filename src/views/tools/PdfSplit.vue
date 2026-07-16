<template>
  <ToolLayout title="PDF 拆分" desc="免费在线拆分PDF文件，支持按页码范围提取，本地处理不上传服务器。">
    <div class="pdf-split">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".pdf"
        tip="上传一个 PDF 文件进行拆分"
      />

      <template v-if="fileList.length === 1">
        <!-- 页码信息 -->
        <div class="page-info">
          <el-tag type="info" size="large">共 {{ totalPages }} 页</el-tag>
        </div>

        <!-- 拆分模式 -->
        <el-radio-group v-model="splitMode" class="split-mode">
          <el-radio-button value="range">按页码范围提取</el-radio-button>
          <el-radio-button value="each">每页拆分为单独文件</el-radio-button>
          <el-radio-button value="interval">每隔N页拆分</el-radio-button>
        </el-radio-group>

        <!-- 按页码范围 -->
        <div v-if="splitMode === 'range'" class="config-row">
          <el-input
            v-model="pageRange"
            placeholder="如 1-3,5,7-9（从第1页开始）"
            size="large"
          />
          <p class="config-tip">输入页码范围，用逗号分隔。如 1-3,5,7-9 表示提取1-3页、第5页、7-9页。</p>
        </div>

        <!-- 每隔N页 -->
        <div v-if="splitMode === 'interval'" class="config-row">
          <el-input-number v-model="interval" :min="1" :max="100" size="large" />
          <span class="config-label">页 / 文件</span>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="splitPdf">
            {{ processing ? '拆分中...' : '开始拆分' }}
          </el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>

      <!-- 下载结果 -->
      <div v-if="results.length" class="result-box">
        <el-alert title="拆分成功！" type="success" show-icon :closable="false" />
        <div class="result-list">
          <div v-for="(r, i) in results" :key="i" class="result-item">
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
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { PDFDocument } from 'pdf-lib'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const totalPages = ref(0)
const splitMode = ref('range')
const pageRange = ref('')
const interval = ref(1)
const processing = ref(false)
const results = ref([]) // [{name, url}]

// 文件变化时读取页数
watch(fileList, async (files) => {
  results.value = []
  if (files.length === 0) {
    totalPages.value = 0
    return
  }
  try {
    const bytes = await files[0].raw.arrayBuffer()
    const pdf = await PDFDocument.load(bytes)
    totalPages.value = pdf.getPageCount()
  } catch {
    totalPages.value = 0
    ElMessage.error('无法读取 PDF 文件')
  }
})

/** 解析页码范围字符串，如 "1-3,5,7-9" → [1,2,3,5,7,8,9] */
function parseRange(str, max) {
  const pages = []
  const parts = str.split(',').map((s) => s.trim())
  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map((n) => parseInt(n.trim()))
      if (isNaN(a) || isNaN(b) || a < 1 || b > max || a > b) continue
      for (let i = a; i <= b; i++) pages.push(i)
    } else {
      const n = parseInt(part)
      if (!isNaN(n) && n >= 1 && n <= max) pages.push(n)
    }
  }
  return [...new Set(pages)].sort((a, b) => a - b)
}

async function splitPdf() {
  if (fileList.length !== 1) return
  processing.value = true
  results.value = []

  try {
    const bytes = await fileList.value[0].raw.arrayBuffer()
    const srcPdf = await PDFDocument.load(bytes)
    const total = srcPdf.getPageCount()

    let splitConfigs = [] // [{name, pages: [0-based indices]}]

    if (splitMode.value === 'range') {
      const pages = parseRange(pageRange.value, total)
      if (pages.length === 0) {
        ElMessage.warning('请输入有效的页码范围')
        processing.value = false
        return
      }
      splitConfigs.push({ name: `pages-${pages[0]}-${pages[pages.length - 1]}.pdf`, pages: pages.map((p) => p - 1) })
    } else if (splitMode.value === 'each') {
      for (let i = 0; i < total; i++) {
        splitConfigs.push({ name: `page-${i + 1}.pdf`, pages: [i] })
      }
    } else if (splitMode.value === 'interval') {
      const step = interval.value
      for (let i = 0; i < total; i += step) {
        const end = Math.min(i + step, total)
        const pages = []
        for (let j = i; j < end; j++) pages.push(j)
        splitConfigs.push({ name: `pages-${i + 1}-${end}.pdf`, pages })
      }
    }

    for (const config of splitConfigs) {
      const newPdf = await PDFDocument.create()
      const copied = await newPdf.copyPages(srcPdf, config.pages)
      copied.forEach((p) => newPdf.addPage(p))
      const outBytes = await newPdf.save()
      const blob = new Blob([outBytes], { type: 'application/pdf' })
      results.value.push({ name: config.name, url: URL.createObjectURL(blob) })
    }

    ElMessage.success(`拆分完成，共生成 ${results.value.length} 个文件`)
  } catch (e) {
    ElMessage.error('拆分失败：' + e.message)
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
  results.value.forEach((r, i) => {
    setTimeout(() => downloadOne(r), i * 300)
  })
}

function clearAll() {
  uploaderRef.value?.clearFiles()
  fileList.value = []
  results.value = []
  totalPages.value = 0
  pageRange.value = ''
}
</script>

<style scoped>
.pdf-split {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-info {
  display: flex;
  gap: 8px;
}

.split-mode {
  flex-wrap: wrap;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-label {
  font-size: 14px;
  color: #606266;
}

.config-tip {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 0;
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

.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.result-name {
  font-size: 14px;
  color: #303133;
  font-family: monospace;
}

@media (max-width: 768px) {
  .split-mode :deep(.el-radio-button__inner) {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
