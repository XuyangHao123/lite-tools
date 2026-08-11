<template>
  <ToolLayout
    title="PDF 转矢量图"
    desc="免费在线将PDF转换为SVG/DXF/EPS矢量图格式，可无损缩放、可编辑，适合CAD/印刷/设计，本地处理。"
    fav-key="pdf-to-vector"
  >
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

        <!-- 精度档位（DXF/EPS） -->
        <div v-if="format !== 'svg'" class="config-section">
          <label class="config-title">曲线精度</label>
          <el-radio-group v-model="precision">
            <el-radio-button value="low">低（8 段/曲线）</el-radio-button>
            <el-radio-button value="medium">中（16 段/曲线）</el-radio-button>
            <el-radio-button value="high">高（32 段/曲线）</el-radio-button>
          </el-radio-group>
          <p class="config-tip">
            贝塞尔曲线（C/Q）按所选段数采样为直线段。段数越高越精确，文件也越大。
          </p>
        </div>

        <!-- 文件名前缀 -->
        <div class="config-section">
          <label class="config-title">文件名前缀</label>
          <el-input v-model="namePrefix" placeholder="留空则使用原文件名" size="default" />
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
            <div class="vector-thumb">
              <el-icon :size="32"><Document /></el-icon>
              <span class="format-badge">{{ r.format.toUpperCase() }}</span>
            </div>
            <span class="result-name">{{ r.name }}</span>
            <el-button size="small" :icon="Download" @click="downloadOne(r)">下载</el-button>
          </div>
        </div>
        <el-button type="primary" :icon="Files" @click="downloadAllZip" v-if="results.length > 1">
          打包下载全部（ZIP）
        </el-button>
      </div>

      <!-- 说明 -->
      <div class="notice">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            矢量图说明：本工具提取 PDF 中的矢量路径（线条、形状、文字轮廓）。
            对矢量内容为主的 PDF（图表、CAD、插画）效果最佳；扫描件/照片类 PDF 建议用「PDF 转图片」。
            DXF/EPS 为有损转换，曲线被近似为直线段。
          </template>
        </el-alert>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { Download, Document, InfoFilled, Files } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob, downloadZip } from '@/composables/useDownload'
import { loadPdfjs, usePdfPageCount } from '@/composables/usePdfEngine'
import { renderPageToSvg, svgToDxf, svgToEps } from '@/utils/vectorConverter'
import { stripExt } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()
const { totalPages, read } = usePdfPageCount()

const format = ref('svg')
const precision = ref('medium')
const namePrefix = ref('')
const results = ref([]) // [{ blob, url, name, format }]
const progress = ref('')

const segments = computed(() =>
  precision.value === 'low' ? 8 : precision.value === 'medium' ? 16 : 32
)

watch(fileList, async (files) => {
  results.value = []
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
    const base = namePrefix.value.trim() || stripExt(fileList.value[0].name) || 'page'
    const seg = segments.value

    for (let i = 1; i <= doc.numPages; i++) {
      progress.value = `(${i}/${doc.numPages})`
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 1 })
      const svgString = await renderPageToSvg(page)

      let content = ''
      let mimeType = ''
      if (format.value === 'svg') {
        content = svgString
        mimeType = 'image/svg+xml'
      } else if (format.value === 'dxf') {
        content = svgToDxf(svgString, vp.width, vp.height, seg)
        mimeType = 'application/dxf'
      } else {
        content = svgToEps(svgString, vp.width, vp.height, seg)
        mimeType = 'application/postscript'
      }

      const blob = new Blob([content], { type: mimeType })
      results.value.push({
        blob,
        url: URL.createObjectURL(blob),
        name: `${base}-page-${i}.${format.value}`,
        format: format.value
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
  const base = namePrefix.value.trim() || stripExt(fileList.value[0].name) || 'vector'
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
    namePrefix.value = ''
  })
}

onUnmounted(() => {
  results.value.forEach((r) => r.url && URL.revokeObjectURL(r.url))
})
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
  color: var(--color-text-primary);
}

.config-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}

.format-desc {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg);
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

.vector-thumb {
  width: 100%;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 4px;
}

.format-badge {
  font-size: 14px;
  font-weight: 700;
}

.result-name {
  font-size: 12px;
  color: var(--color-text-regular);
  font-family: monospace;
  text-align: center;
  word-break: break-all;
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
