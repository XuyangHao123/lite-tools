<template>
  <ToolLayout
    title="PDF 合并"
    desc="免费在线合并多个PDF文件为一个，支持拖拽排序、页码范围与书签，本地处理不上传服务器。"
    fav-key="pdf-merge"
  >
    <div class="pdf-merge">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".pdf"
        :sortable="true"
        tip="支持多个 PDF 文件，拖拽列表可调整合并顺序（至少 2 个）"
      />

      <!-- 每个文件的页码范围（可选） -->
      <div v-if="fileList.length" class="config-section">
        <div class="config-title">页码范围（可选）</div>
        <p class="config-tip">为每个文件指定要合并的页，留空=全部。如 1-3,5 表示第 1~3 页与第 5 页。</p>
        <div class="range-list">
          <div
            v-for="(file, i) in fileList"
            :key="file.uid || file.name + i"
            class="range-row"
          >
            <span class="range-idx">{{ i + 1 }}</span>
            <span class="range-name">{{ file.name }}</span>
            <el-input
              :model-value="rangeMap[file.uid] || ''"
              @update:model-value="(v) => (rangeMap[file.uid] = v)"
              placeholder="留空=全部，如 1-3,5"
              size="small"
              class="range-input"
            />
          </div>
        </div>
      </div>

      <!-- 高级选项 -->
      <div v-if="fileList.length" class="options">
        <el-checkbox v-model="insertBlankFirst">在首页插入空白页</el-checkbox>
        <el-checkbox v-model="generateOutline">生成书签/大纲（每个文件名为书签）</el-checkbox>
      </div>

      <!-- 输出文件名 -->
      <div v-if="fileList.length" class="config-section">
        <label class="config-title">输出文件名</label>
        <el-input
          v-model="outputName"
          placeholder="留空则自动 merged-时间戳.pdf"
          size="default"
        >
          <template #append>.pdf</template>
        </el-input>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar" v-if="fileList.length >= 2">
        <el-button type="primary" size="large" :loading="processing" @click="mergePdfs">
          {{ processing ? '合并中...' : `合并 ${fileList.length} 个文件` }}
        </el-button>
        <el-button size="large" @click="onClear">清空</el-button>
      </div>
      <div v-else-if="fileList.length === 1" class="hint">
        <el-icon><InfoFilled /></el-icon>
        请至少上传 2 个 PDF 文件
      </div>

      <!-- 下载结果 -->
      <div v-if="resultBlob" class="result-box">
        <el-alert title="合并成功！" type="success" show-icon :closable="false" />
        <el-button type="primary" :icon="Download" @click="downloadResult">
          下载合并后的 PDF
        </el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Download, InfoFilled } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob } from '@/composables/useDownload'
import { loadPdfLib, parsePageRange } from '@/composables/usePdfEngine'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()

const rangeMap = reactive({}) // file.uid -> 页码范围字符串
const insertBlankFirst = ref(false)
const generateOutline = ref(false)
const outputName = ref('')
const resultBlob = ref(null)

function finalName() {
  const n = outputName.value.trim().replace(/\.pdf$/i, '')
  return (n || `merged-${Date.now()}`) + '.pdf'
}

async function mergePdfs() {
  if (fileList.value.length < 2) {
    ElMessage.warning('请至少上传 2 个 PDF 文件')
    return
  }
  resultBlob.value = null
  await run(async () => {
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber, PDFHexString } =
      await loadPdfLib()
    const mergedPdf = await PDFDocument.create()
    const outlineItems = [] // { title, pageRef }

    for (let i = 0; i < fileList.value.length; i++) {
      const file = fileList.value[i]
      const bytes = await file.raw.arrayBuffer()
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const total = src.getPageCount()

      const rangeStr = rangeMap[file.uid] ? String(rangeMap[file.uid]).trim() : ''
      let indices
      if (!rangeStr) {
        indices = src.getPageIndices()
      } else {
        const pages = parsePageRange(rangeStr, total)
        if (!pages.length) throw new Error(`文件 ${i + 1}「${file.name}」的页码范围无效`)
        indices = pages.map((p) => p - 1)
      }
      const copied = await mergedPdf.copyPages(src, indices)
      copied.forEach((p) => mergedPdf.addPage(p))
      if (copied.length) {
        outlineItems.push({ title: file.name, pageRef: copied[0].ref })
      }
    }

    // 在首页插入空白页（尺寸跟随第一个内容页）
    if (insertBlankFirst.value) {
      const first = mergedPdf.getPage(0)
      const size = first ? first.getSize() : { width: 595.28, height: 841.89 }
      mergedPdf.insertPage(0, [size.width, size.height])
    }

    // 生成书签/大纲（pdf-lib 1.17 无 setOutline，手动写入 Outlines 字典）
    // 低层 API 失败不应阻断已成功的合并，故 best-effort
    if (generateOutline.value && outlineItems.length) {
      try {
        buildBookmarks(mergedPdf, outlineItems, {
          PDFName,
          PDFDict,
          PDFArray,
          PDFNumber,
          PDFHexString
        })
      } catch (e) {
        console.warn('书签生成失败', e)
        ElMessage.warning('书签生成失败，已输出不含书签的 PDF')
      }
    }

    const out = await mergedPdf.save()
    resultBlob.value = new Blob([out], { type: 'application/pdf' })
    ElMessage.success('合并成功')
  }, '合并')
}

/** 手动构建 PDF 大纲（Outlines）字典并挂到 catalog */
function buildBookmarks(doc, items, { PDFName, PDFDict, PDFArray, PDFNumber, PDFHexString }) {
  const ctx = doc.context
  const root = PDFDict.withContext(ctx)
  const rootRef = ctx.register(root)
  const refs = []

  items.forEach((it) => {
    const d = PDFDict.withContext(ctx)
    d.set(PDFName.of('Title'), PDFHexString.fromText(it.title))
    d.set(PDFName.of('Parent'), rootRef)
    const dest = PDFArray.withContext(ctx)
    dest.push(it.pageRef)
    dest.push(PDFName.of('Fit'))
    d.set(PDFName.of('Dest'), dest)
    refs.push(ctx.register(d))
  })

  // 兄弟节点前后链接
  refs.forEach((r, i) => {
    const d = ctx.lookup(r)
    if (i > 0) d.set(PDFName.of('Prev'), refs[i - 1])
    if (i < refs.length - 1) d.set(PDFName.of('Next'), refs[i + 1])
  })

  root.set(PDFName.of('First'), refs[0])
  root.set(PDFName.of('Last'), refs[refs.length - 1])
  root.set(PDFName.of('Count'), PDFNumber.of(refs.length))
  doc.catalog.set(PDFName.of('Outlines'), rootRef)
}

function downloadResult() {
  if (resultBlob.value) downloadBlob(resultBlob.value, finalName())
}

function onClear() {
  clearAll(() => {
    Object.keys(rangeMap).forEach((k) => delete rangeMap[k])
    resultBlob.value = null
    outputName.value = ''
    insertBlankFirst.value = false
    generateOutline.value = false
  })
}
</script>

<style scoped>
.pdf-merge {
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
  color: var(--color-text-primary);
}

.config-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}

.range-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.range-idx {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.range-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.range-input {
  width: 200px;
  flex-shrink: 0;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
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

@media (max-width: 768px) {
  .range-row {
    flex-wrap: wrap;
  }

  .range-input {
    width: 100%;
  }

  .options {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
