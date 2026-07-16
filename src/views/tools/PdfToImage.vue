<template>
  <ToolLayout title="PDF 转图片" desc="免费在线将PDF每页转换为JPG/PNG/SVG矢量图，支持选择分辨率，本地处理不上传。">
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
            <el-radio-button value="svg">SVG（矢量图）</el-radio-button>
          </el-radio-group>
          <p v-if="format === 'svg'" class="config-tip svg-tip">
            ⚡ SVG 为矢量格式，可无损缩放、可编辑，适合图表/矢量插画类 PDF。
            含大量光栅图片的 PDF 转 SVG 后体积可能较大。
          </p>
        </div>

        <!-- 分辨率（SVG 模式隐藏，矢量图无需分辨率） -->
        <div v-if="format !== 'svg'" class="config-section">
          <label class="config-title">清晰度（缩放倍数）</label>
          <el-radio-group v-model="scale">
            <el-radio-button :value="1">标准 (1x)</el-radio-button>
            <el-radio-button :value="2">高清 (2x)</el-radio-button>
            <el-radio-button :value="3">超清 (3x)</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="convertToImages">
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
            <img v-if="r.type === 'image'" :src="r.url" :alt="r.name" class="result-thumb" />
            <div v-else class="svg-thumb">
              <el-icon :size="32"><Document /></el-icon>
              <span>SVG</span>
            </div>
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
import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Document } from '@element-plus/icons-vue'
import * as pdfjsLib from 'pdfjs-dist'
import C2S from 'canvas2svg'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

// 配置 pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const fileList = ref([])
const uploaderRef = ref()
const totalPages = ref(0)
const format = ref('png')
const scale = ref(2)
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

/**
 * 将 PDF 页面渲染为 SVG 矢量图
 * 原理：用 canvas2svg 创建模拟 canvas 上下文，
 * 让 pdfjs 渲染到该上下文，所有绘制操作被转为 SVG 路径
 */
async function renderPageToSvg(page) {
  const viewport = page.getViewport({ scale: 1 })
  const width = viewport.width
  const height = viewport.height

  // canvas2svg 模拟 canvas，收集绘制指令生成 SVG
  const c2s = new C2S({
    width: Math.ceil(width),
    height: Math.ceil(height)
  })

  await page.render({
    canvasContext: c2s,
    viewport
  }).promise

  // 获取生成的 SVG 字符串
  let svgString = c2s.getSerializedSvg()

  // 补全 xmlns 属性（canvas2svg 有时不带）
  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  return svgString
}

/** 渲染为光栅图（PNG/JPG） */
async function renderPageToCanvas(page, renderScale) {
  const viewport = page.getViewport({ scale: renderScale })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

async function convertToImages() {
  if (fileList.length !== 1) return
  processing.value = true
  results.value = []

  try {
    const raw = await fileList.value[0].raw.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: raw }).promise

    for (let i = 1; i <= pdf.numPages; i++) {
      progress.value = `(${i}/${pdf.numPages})`
      const page = await pdf.getPage(i)

      if (format.value === 'svg') {
        // 矢量 SVG 输出
        const svgString = await renderPageToSvg(page)
        const blob = new Blob([svgString], { type: 'image/svg+xml' })
        results.value.push({
          name: `page-${i}.svg`,
          url: URL.createObjectURL(blob),
          type: 'svg'
        })
      } else {
        // 光栅图输出
        const canvas = await renderPageToCanvas(page, scale.value)
        const mimeType = format.value === 'png' ? 'image/png' : 'image/jpeg'
        const quality = format.value === 'jpg' ? 0.92 : 1
        const dataUrl = canvas.toDataURL(mimeType, quality)
        results.value.push({
          name: `page-${i}.${format.value}`,
          url: dataUrl,
          type: 'image'
        })
      }
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

onUnmounted(() => {
  results.value = []
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
  color: #303133;
}

.config-tip {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.svg-tip {
  color: #e6a23c;
  background: #fdf6ec;
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

.result-thumb {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.svg-thumb {
  width: 100%;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
}

.result-name {
  font-size: 12px;
  color: #606266;
  font-family: monospace;
}
</style>
