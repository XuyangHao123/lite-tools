<template>
  <ToolLayout
    title="PDF 旋转"
    desc="免费在线旋转PDF页面，支持统一角度或逐页设置，旋转前缩略图预览，本地处理不上传服务器。"
    fav-key="pdf-rotate"
  >
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

        <!-- 模式切换 -->
        <el-radio-group v-model="mode">
          <el-radio-button value="uniform">统一角度</el-radio-button>
          <el-radio-button value="perpage">逐页设置</el-radio-button>
        </el-radio-group>

        <!-- 统一角度配置 -->
        <template v-if="mode === 'uniform'">
          <div class="config-section">
            <label class="config-title">旋转角度</label>
            <el-radio-group v-model="angle">
              <el-radio-button :value="90">向右 90°</el-radio-button>
              <el-radio-button :value="180">180°</el-radio-button>
              <el-radio-button :value="270">向左 90°</el-radio-button>
            </el-radio-group>
          </div>

          <div class="config-section">
            <label class="config-title">旋转范围</label>
            <el-radio-group v-model="scope">
              <el-radio-button value="all">所有页面</el-radio-button>
              <el-radio-button value="range">指定页面</el-radio-button>
            </el-radio-group>
          </div>

          <div v-if="scope === 'range'" class="config-section">
            <label class="config-title">页码范围</label>
            <el-input v-model="pageRange" placeholder="如 1-3,5,7-9" size="large" />
            <p class="config-tip">用逗号分隔，支持范围（如 1-3,5）</p>
          </div>
        </template>

        <!-- 缩略图预览（统一模式 + 逐页模式共用） -->
        <div v-if="thumbnails.length" class="thumb-section">
          <div class="config-title">页面预览</div>
          <div class="thumb-grid">
            <div v-for="(thumb, i) in thumbnails" :key="i" class="thumb-card">
              <div class="thumb-wrap">
                <img :src="thumb" :alt="`第${i + 1}页`" />
                <span
                  class="rot-badge"
                  :class="{ dim: !shouldRotate(i) }"
                  :style="{ transform: `rotate(${badgeAngle(i)}deg)` }"
                  :title="`${badgeAngle(i)}°`"
                >
                  <el-icon><RefreshRight /></el-icon>
                </span>
              </div>
              <span class="page-no">第 {{ i + 1 }} 页</span>
              <el-select
                v-if="mode === 'perpage'"
                v-model="perPageAngles[i]"
                size="small"
                class="per-select"
              >
                <el-option :value="0" label="不旋转" />
                <el-option :value="90" label="右 90°" />
                <el-option :value="180" label="180°" />
                <el-option :value="270" label="左 90°" />
              </el-select>
              <span v-else class="uniform-angle">{{ badgeAngle(i) === 0 ? '不旋转' : badgeAngle(i) + '°' }}</span>
            </div>
          </div>
        </div>

        <!-- 输出文件名 -->
        <div class="config-section">
          <label class="config-title">输出文件名</label>
          <el-input v-model="outputName" placeholder="留空则自动 rotated-时间戳.pdf" size="default">
            <template #append>.pdf</template>
          </el-input>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="rotatePdf">
            {{ processing ? '旋转中...' : '旋转并下载' }}
          </el-button>
          <el-button size="large" @click="onClear">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { RefreshRight } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob } from '@/composables/useDownload'
import { loadPdfLib, loadPdfjs, usePdfPageCount, parsePageRange } from '@/composables/usePdfEngine'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()
const { totalPages, read } = usePdfPageCount()

const mode = ref('uniform') // uniform | perpage
const angle = ref(90)
const scope = ref('all')
const pageRange = ref('')
const perPageAngles = ref([]) // 每页要旋转的角度，默认 90
const thumbnails = ref([]) // dataURL
const outputName = ref('')

watch(fileList, async (files) => {
  thumbnails.value = []
  perPageAngles.value = []
  pageRange.value = ''
  if (!files.length) {
    totalPages.value = 0
    return
  }
  await read(files[0])
  // 异步渲染缩略图（不阻塞主流程）
  renderThumbnails(files[0])
})

async function renderThumbnails(file) {
  try {
    const pdfjs = await loadPdfjs()
    const buf = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise
    const arr = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 0.25 })
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = Math.ceil(vp.width)
      canvas.height = Math.ceil(vp.height)
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      arr.push(canvas.toDataURL('image/jpeg', 0.5))
      // 同步初始化逐页角度（默认 90）
      perPageAngles.value[i - 1] = 90
    }
    try {
      await doc.destroy()
    } catch {
      /* ignore */
    }
    thumbnails.value = arr
  } catch (e) {
    // 缩略图为可选增强，失败不阻断
    console.warn('缩略图渲染失败', e)
  }
}

/** 当前页是否会被旋转（用于徽标置灰） */
function shouldRotate(i) {
  if (mode.value === 'perpage') return (perPageAngles.value[i] ?? 90) !== 0
  if (scope.value === 'all') return angle.value !== 0
  const nums = parsePageRange(pageRange.value, totalPages.value)
  return nums.includes(i + 1) && angle.value !== 0
}

function badgeAngle(i) {
  if (mode.value === 'perpage') return perPageAngles.value[i] ?? 90
  if (scope.value === 'all') return angle.value
  const nums = parsePageRange(pageRange.value, totalPages.value)
  return nums.includes(i + 1) ? angle.value : 0
}

function finalName() {
  const n = outputName.value.trim().replace(/\.pdf$/i, '')
  return (n || `rotated-${Date.now()}`) + '.pdf'
}

async function rotatePdf() {
  if (fileList.value.length !== 1) return
  await run(async () => {
    const { PDFDocument, degrees } = await loadPdfLib()
    const bytes = await fileList.value[0].raw.arrayBuffer()
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const pages = pdf.getPages()
    const total = pages.length

    if (mode.value === 'uniform') {
      let indices
      if (scope.value === 'all') {
        indices = pages.map((_, i) => i)
      } else {
        const nums = parsePageRange(pageRange.value, total)
        if (!nums.length) throw new Error('请输入有效的页码范围')
        indices = nums.map((p) => p - 1)
      }
      const deg = angle.value
      for (const idx of indices) {
        const cur = pages[idx].getRotation().angle
        pages[idx].setRotation(degrees((cur + deg) % 360))
      }
    } else {
      for (let i = 0; i < total; i++) {
        const a = perPageAngles.value[i] ?? 90
        if (a === 0) continue
        const cur = pages[i].getRotation().angle
        pages[i].setRotation(degrees((cur + a) % 360))
      }
    }

    const out = await pdf.save()
    const blob = new Blob([out], { type: 'application/pdf' })
    downloadBlob(blob, finalName())
    ElMessage.success('旋转完成，已开始下载')
  }, '旋转')
}

function onClear() {
  clearAll(() => {
    thumbnails.value = []
    perPageAngles.value = []
    totalPages.value = 0
    pageRange.value = ''
    outputName.value = ''
    mode.value = 'uniform'
    angle.value = 90
    scope.value = 'all'
  })
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
  color: var(--color-text-primary);
}

.config-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}

.thumb-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thumb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.thumb-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.thumb-wrap {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.thumb-wrap img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.rot-badge {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: #fff;
  border-radius: 50%;
  font-size: 13px;
  transition: transform 0.2s;
}

.rot-badge.dim {
  background: var(--color-text-placeholder);
}

.page-no {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.per-select {
  width: 110px;
}

.uniform-angle {
  font-size: 12px;
  color: var(--color-text-regular);
}

.action-bar {
  display: flex;
  gap: 12px;
}
</style>
