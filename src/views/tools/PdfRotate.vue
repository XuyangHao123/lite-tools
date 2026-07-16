<template>
  <ToolLayout title="PDF 旋转" desc="免费在线旋转PDF页面，支持90/180/270度旋转，所有页面或指定页面，本地处理。">
    <div class="pdf-rotate">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".pdf"
        tip="上传一个 PDF 文件进行旋转"
      />

      <template v-if="fileList.length === 1">
        <div class="page-info">
          <el-tag type="info" size="large">共 {{ totalPages }} 页</el-tag>
        </div>

        <!-- 旋转角度 -->
        <div class="config-section">
          <label class="config-title">旋转角度</label>
          <el-radio-group v-model="angle">
            <el-radio-button :value="90">向右 90°</el-radio-button>
            <el-radio-button :value="180">180°</el-radio-button>
            <el-radio-button :value="270">向左 90°</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 旋转范围 -->
        <div class="config-section">
          <label class="config-title">旋转范围</label>
          <el-radio-group v-model="scope">
            <el-radio-button value="all">所有页面</el-radio-button>
            <el-radio-button value="range">指定页面</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 页码范围 -->
        <div v-if="scope === 'range'" class="config-row">
          <el-input
            v-model="pageRange"
            placeholder="如 1-3,5,7-9"
            size="large"
          />
          <p class="config-tip">输入要旋转的页码，用逗号分隔，支持范围（如 1-3,5）</p>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="rotatePdf">
            {{ processing ? '旋转中...' : '旋转并下载' }}
          </el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { degrees } from 'pdf-lib'
import { PDFDocument } from 'pdf-lib'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const totalPages = ref(0)
const angle = ref(90)
const scope = ref('all')
const pageRange = ref('')
const processing = ref(false)

watch(fileList, async (files) => {
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

function parseRange(str, max) {
  const pages = []
  for (const part of str.split(',').map((s) => s.trim())) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map((n) => parseInt(n.trim()))
      if (!isNaN(a) && !isNaN(b) && a >= 1 && b <= max && a <= b) {
        for (let i = a; i <= b; i++) pages.push(i)
      }
    } else {
      const n = parseInt(part)
      if (!isNaN(n) && n >= 1 && n <= max) pages.push(n)
    }
  }
  return [...new Set(pages)].sort((a, b) => a - b)
}

async function rotatePdf() {
  if (fileList.length !== 1) return
  processing.value = true

  try {
    const bytes = await fileList.value[0].raw.arrayBuffer()
    const pdf = await PDFDocument.load(bytes)
    const total = pdf.getPageCount()
    const pages = pdf.getPages()

    let targetIndices = []
    if (scope.value === 'all') {
      targetIndices = pages.map((_, i) => i)
    } else {
      const pageNums = parseRange(pageRange.value, total)
      if (pageNums.length === 0) {
        ElMessage.warning('请输入有效的页码范围')
        processing.value = false
        return
      }
      targetIndices = pageNums.map((p) => p - 1)
    }

    for (const idx of targetIndices) {
      const page = pages[idx]
      const currentRotation = page.getRotation().angle
      page.setRotation(degrees((currentRotation + angle.value) % 360))
    }

    const outBytes = await pdf.save()
    const blob = new Blob([outBytes], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rotated-${Date.now()}.pdf`
    link.click()
    ElMessage.success('旋转完成，已开始下载')
  } catch (e) {
    ElMessage.error('旋转失败：' + e.message)
  } finally {
    processing.value = false
  }
}

function clearAll() {
  uploaderRef.value?.clearFiles()
  fileList.value = []
  totalPages.value = 0
  pageRange.value = ''
}
</script>

<style scoped>
.pdf-rotate {
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
  color: #303133;
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
</style>
