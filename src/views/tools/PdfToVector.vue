<template>
  <ToolLayout title="PDF 转矢量图" desc="免费在线将PDF转换为SVG/DXF/EPS矢量图格式，矢量内容可无损缩放、可编辑，适合CAD/印刷/设计，本地处理。">
    <div class="pdf-to-vector">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".pdf"
        tip="上传一个 PDF 文件，每页将转为矢量图"
      />

      <template v-if="fileList.length === 1">
        <div class="page-info">
          <el-tag type="info" size="large">共 {{ totalPages }} 页</el-tag>
        </div>

        <!-- 输出格式 -->
        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="format">
            <el-radio-button value="svg">SVG（通用矢量）</el-radio-button>
            <el-radio-button value="dxf">DXF（CAD格式）</el-radio-button>
            <el-radio-button value="eps">EPS（印刷格式）</el-radio-button>
          </el-radio-group>

          <!-- 格式说明 -->
          <div class="format-desc">
            <el-icon><InfoFilled /></el-icon>
            <span v-if="format === 'svg'">
              SVG：最通用的矢量格式，浏览器可直接打开，适合网页和设计软件
            </span>
            <span v-else-if="format === 'dxf'">
              DXF：CAD 绘图交换格式，可在 AutoCAD / LibreCAD 中编辑，适合工程图纸
            </span>
            <span v-else>
              EPS：封装 PostScript，印刷行业标准，可在 Illustrator 中编辑
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="convert">
            {{ processing ? `转换中... ${progress}` : '开始转换' }}
          </el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>

      <!-- 结果 -->
      <div v-if="results.length" class="result-box">
        <el-alert :title="`转换成功！共生成 ${results.length} 个文件`" type="success" show-icon :closable="false" />
        <div class="result-grid">
          <div v-for="(r, i) in results" :key="i" class="result-item">
            <div class="vector-thumb">
              <el-icon :size="32"><Document /></el-icon>
              <span class="format-badge">{{ r.format.toUpperCase() }}</span>
            </div>
            <span class="result-name">{{ r.name }}</span>
            <el-button size="small" :icon="Download" @click="downloadOne(r)">下载</el-button>
          </div>
        </div>
        <el-button type="primary" @click="downloadAll" v-if="results.length > 1">全部下载</el-button>
      </div>

      <!-- 说明 -->
      <div class="notice">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            矢量图说明：本工具提取 PDF 中的矢量路径（线条、形状、文字轮廓）。
            对于矢量内容为主的 PDF（图表、CAD、插画）效果最佳；
            扫描件/照片类 PDF 转换后可能只包含边框，建议使用「PDF 转图片」功能。
          </template>
        </el-alert>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Document, InfoFilled } from '@element-plus/icons-vue'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { renderPageToSvg, svgToDxf, svgToEps } from '@/utils/vectorConverter'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const fileList = ref([])
const uploaderRef = ref()
const totalPages = ref(0)
const format = ref('svg')
const processing = ref(false)
const progress = ref('')
const results = ref([])

watch(fileList, async (files) => {
  results.value = []
  if (files.length === 0) {
    totalPages.value = 0
    return
  }
  try {
    const raw = await files[0].raw.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: raw }).promise
    totalPages.value = pdf.numPages
  } catch {
    totalPages.value = 0
    ElMessage.error('无法读取 PDF 文件')
  }
})

async function convert() {
  if (fileList.length !== 1) return
  processing.value = true
  results.value = []

  try {
    const raw = await fileList.value[0].raw.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: raw }).promise

    for (let i = 1; i <= pdf.numPages; i++) {
      progress.value = `(${i}/${pdf.numPages})`
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1 })
      const width = viewport.width
      const height = viewport.height

      // 先渲染为 SVG（所有格式的中间产物）
      const svgString = await renderPageToSvg(page)

      let content = ''
      let mimeType = ''
      let ext = format.value

      if (format.value === 'svg') {
        content = svgString
        mimeType = 'image/svg+xml'
      } else if (format.value === 'dxf') {
        content = svgToDxf(svgString, width, height)
        mimeType = 'application/dxf'
      } else if (format.value === 'eps') {
        content = svgToEps(svgString, width, height)
        mimeType = 'application/postscript'
      }

      const blob = new Blob([content], { type: mimeType })
      results.value.push({
        name: `page-${i}.${ext}`,
        url: URL.createObjectURL(blob),
        format: ext
      })
    }

    ElMessage.success('转换完成')
  } catch (e) {
    console.error(e)
    ElMessage.error('转换失败：' + (e.message || '未知错误'))
  } finally {
    processing.value = false
    progress.value = ''
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
    setTimeout(() => downloadOne(r), i * 500)
  })
}

function clearAll() {
  uploaderRef.value?.clearFiles()
  fileList.value = []
  results.value = []
  totalPages.value = 0
}
</script>

<style scoped>
.pdf-to-vector {
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

.format-desc {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 4px;
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

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.vector-thumb {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
}

.format-badge {
  font-size: 14px;
  font-weight: 700;
}

.result-name {
  font-size: 12px;
  color: #606266;
  font-family: monospace;
}

.notice {
  margin-top: 8px;
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
