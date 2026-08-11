<template>
  <ToolLayout
    title="PDF 拆分"
    desc="免费在线拆分PDF文件，支持按页码范围提取、每页拆分、按间隔拆分，批量打包下载，本地处理不上传服务器。"
    fav-key="pdf-split"
  >
    <div class="pdf-split">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".pdf"
        tip="上传一个 PDF 文件进行拆分"
      />

      <template v-if="fileList.length === 1">
        <div class="page-info">
          <el-tag type="info" size="large">共 {{ totalPages }} 页</el-tag>
        </div>

        <!-- 拆分模式 -->
        <el-radio-group v-model="splitMode" class="split-mode">
          <el-radio-button value="range">按页码范围拆分</el-radio-button>
          <el-radio-button value="each">每页拆分为单独文件</el-radio-button>
          <el-radio-button value="interval">每隔N页拆分</el-radio-button>
        </el-radio-group>

        <!-- 按页码范围 -->
        <div v-if="splitMode === 'range'" class="config-section">
          <label class="config-title">页码范围</label>
          <el-input
            v-model="pageRange"
            placeholder="如 1-3,5,7-9（每段一个文件）"
            size="large"
          />
          <p class="config-tip">
            用逗号分隔，每个逗号分隔段产生一个文件。如 1-3,5,7-9 产生 3 个文件：
            [1~3 页合并]、[第 5 页]、[7~9 页合并]。
          </p>
        </div>

        <!-- 每隔N页 -->
        <div v-if="splitMode === 'interval'" class="config-row">
          <el-input-number v-model="interval" :min="1" :max="100" size="large" />
          <span class="config-label">页 / 文件</span>
        </div>

        <!-- 文件名前缀 -->
        <div class="config-section">
          <label class="config-title">文件名前缀</label>
          <el-input
            v-model="namePrefix"
            :placeholder="`留空则使用原文件名（如 ${defaultPrefix}）`"
            size="default"
          />
          <p class="config-tip">输出文件名形如「前缀-pages-1-3.pdf」「前缀-page-5.pdf」</p>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="splitPdf">
            {{ processing ? '拆分中...' : '开始拆分' }}
          </el-button>
          <el-button size="large" @click="onClear">清空</el-button>
        </div>
      </template>

      <!-- 结果 -->
      <div v-if="results.length" class="result-box">
        <el-alert
          :title="`拆分成功！共生成 ${results.length} 个文件`"
          type="success"
          show-icon
          :closable="false"
        />
        <div class="result-list">
          <div v-for="(r, i) in results" :key="i" class="result-item">
            <span class="result-name">{{ r.name }}</span>
            <el-button size="small" :icon="Download" @click="downloadOne(r)">下载</el-button>
          </div>
        </div>
        <el-button type="primary" :icon="Files" @click="downloadAllZip" v-if="results.length > 1">
          打包下载全部（ZIP）
        </el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Download, Files } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob, downloadZip } from '@/composables/useDownload'
import { loadPdfLib, usePdfPageCount, parsePageRange } from '@/composables/usePdfEngine'
import { stripExt } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()
const { totalPages, read } = usePdfPageCount()

const splitMode = ref('range')
const pageRange = ref('')
const interval = ref(1)
const namePrefix = ref('')
const results = ref([]) // [{ blob, name }]

const defaultPrefix = computed(() =>
  fileList.value.length ? stripExt(fileList.value[0].name) || 'split' : 'split'
)

watch(fileList, async (files) => {
  results.value = []
  if (!files.length) {
    totalPages.value = 0
    return
  }
  await read(files[0])
})

function realPrefix() {
  const p = namePrefix.value.trim()
  return p || defaultPrefix.value
}

async function splitPdf() {
  if (fileList.value.length !== 1) return
  results.value = []
  await run(async () => {
    const { PDFDocument } = await loadPdfLib()
    const bytes = await fileList.value[0].raw.arrayBuffer()
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const total = src.getPageCount()
    const base = realPrefix()

    const configs = [] // [{ name, indices:[0-based] }]

    if (splitMode.value === 'range') {
      const segs = pageRange.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (!segs.length) throw new Error('请输入有效的页码范围')
      for (const seg of segs) {
        const pages = parsePageRange(seg, total)
        if (!pages.length) throw new Error(`范围段「${seg}」无效`)
        configs.push({
          name: `${base}-pages-${pages[0]}-${pages[pages.length - 1]}.pdf`,
          indices: pages.map((p) => p - 1)
        })
      }
    } else if (splitMode.value === 'each') {
      for (let i = 0; i < total; i++) {
        configs.push({ name: `${base}-page-${i + 1}.pdf`, indices: [i] })
      }
    } else {
      const step = Math.max(1, interval.value)
      for (let i = 0; i < total; i += step) {
        const end = Math.min(i + step, total)
        const indices = []
        for (let j = i; j < end; j++) indices.push(j)
        configs.push({ name: `${base}-pages-${i + 1}-${end}.pdf`, indices })
      }
    }

    for (const c of configs) {
      const np = await PDFDocument.create()
      const copied = await np.copyPages(src, c.indices)
      copied.forEach((p) => np.addPage(p))
      const out = await np.save()
      results.value.push({ blob: new Blob([out], { type: 'application/pdf' }), name: c.name })
    }

    ElMessage.success(`拆分完成，共生成 ${results.value.length} 个文件`)
  }, '拆分')
}

function downloadOne(r) {
  downloadBlob(r.blob, r.name)
}

async function downloadAllZip() {
  if (!results.value.length) return
  await downloadZip(
    results.value.map((r) => ({ blob: r.blob, name: r.name })),
    `${realPrefix()}.zip`
  )
}

function onClear() {
  clearAll(() => {
    results.value = []
    totalPages.value = 0
    pageRange.value = ''
    namePrefix.value = ''
  })
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

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-label {
  font-size: 14px;
  color: var(--color-text-regular);
}

.config-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
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
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.result-name {
  font-size: 13px;
  color: var(--color-text-primary);
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

@media (max-width: 768px) {
  .split-mode :deep(.el-radio-button__inner) {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
