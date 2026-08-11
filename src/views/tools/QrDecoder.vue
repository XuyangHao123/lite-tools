<template>
  <ToolLayout
    title="二维码识别"
    desc="免费在线识别/解码图片中的二维码，支持一张图多个二维码识别、截图粘贴（Ctrl+V）、批量多图、结果结构化解析（WiFi/vCard），结果可打包导出，本地处理不上传。"
    fav-key="qr-decoder"
  >
    <div class="qr-decoder">
      <!-- 上传区 -->
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        :show-file-list="false"
        accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
        tip="拖拽或点击上传含二维码的图片，支持批量；也可直接 Ctrl+V 粘贴截图"
      />

      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="本工具仅支持二维码（QR Code），不支持条形码"
        description="多码识别采用滑窗扫描，大图或码多时可能较慢，请耐心等待。"
      />

      <!-- 操作栏 -->
      <div class="action-bar" v-if="results.length">
        <el-button type="primary" :icon="Download" @click="exportResults" :disabled="!hasAnyCode">
          导出结果 (ZIP)
        </el-button>
        <el-button :icon="Delete" @click="clearAll">清空全部</el-button>
      </div>

      <!-- 各图片结果 -->
      <div v-if="results.length" class="results-list">
        <div v-for="entry in results" :key="entry.uid" class="result-card">
          <div class="card-head">
            <img :src="entry.previewUrl" class="thumb" alt="预览" />
            <div class="card-meta">
              <span class="card-name">{{ entry.name }}</span>
              <span class="card-status" :class="entry.status">
                <template v-if="entry.status === 'processing'">识别中…</template>
                <template v-else-if="entry.status === 'error'">{{ entry.errorMsg || '识别失败' }}</template>
                <template v-else-if="entry.codes.length">识别到 {{ entry.codes.length }} 个二维码</template>
                <template v-else>未识别到二维码</template>
              </span>
            </div>
            <el-button link :icon="Delete" @click="removeEntry(entry)" />
          </div>

          <!-- 单图识别结果 -->
          <div v-if="entry.codes.length" class="codes-list">
            <div v-for="(code, idx) in entry.codes" :key="idx" class="code-item">
              <div class="code-head">
                <span class="code-badge">{{ idx + 1 }}</span>
                <el-tag v-if="code.parsed" size="small" type="success">{{ code.parsed.label }}</el-tag>
                <div class="code-actions">
                  <el-button size="small" :icon="CopyDocument" @click="copyCode(code.data)">复制</el-button>
                  <el-button v-if="code.parsed && code.parsed.type === 'url'" size="small" type="success" :icon="Link" @click="openUrl(code.data)">打开</el-button>
                </div>
              </div>
              <el-input :model-value="code.data" type="textarea" :rows="2" readonly class="code-text" />

              <!-- 结构化字段 -->
              <div v-if="code.parsed && code.parsed.fields && Object.keys(code.parsed.fields).length" class="struct-fields">
                <div v-for="(val, key) in code.parsed.fields" :key="key" class="struct-row">
                  <span class="struct-key">{{ key }}</span>
                  <span class="struct-val">{{ val || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-icon :size="48"><Picture /></el-icon>
        <p>上传含二维码的图片，或按 Ctrl+V 粘贴截图</p>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import { CopyDocument, Download, Delete, Link, Picture } from '@element-plus/icons-vue'
import jsQR from 'jsqr'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'
import { downloadZip } from '@/composables/useDownload'
import { loadImage, createCanvas } from '@/composables/useImageProcessor'

const fileList = ref([])
const uploaderRef = ref()
const results = ref([])
const processedUids = ref(new Set())

const hasAnyCode = computed(() => results.value.some((e) => e.codes.length))

function tick() {
  return new Promise((r) => setTimeout(r, 0))
}

/** 一张图滑窗扫描，识别多个二维码并去重 */
async function scanMulti(img) {
  const found = new Map()
  const maxDim = 1000
  let w = img.naturalWidth
  let h = img.naturalHeight
  if (Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const { canvas, ctx } = createCanvas(w, h)
  ctx.drawImage(img, 0, 0, w, h)

  let scanned = 0
  const tryRegion = (x, y, rw, rh) => {
    if (x < 0 || y < 0 || rw <= 0 || rh <= 0 || x + rw > w || y + rh > h) return
    try {
      const imgData = ctx.getImageData(x, y, rw, rh)
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'attemptBoth'
      })
      if (code && code.data) {
        found.set(code.data, code.data)
      }
    } catch (e) {
      /* 单区域失败忽略 */
    }
  }

  // 1. 整图扫描（适用于单大码）
  tryRegion(0, 0, w, h)
  await tick()

  // 2. 多尺度滑窗扫描（适用于多码）
  const sizes = []
  for (let s = Math.min(w, h); s >= 50; s = Math.floor(s * 0.7)) sizes.push(s)
  for (const size of sizes) {
    const step = Math.max(1, Math.floor(size * 0.4))
    for (let y = 0; y + size <= h; y += step) {
      for (let x = 0; x + size <= w; x += step) {
        tryRegion(x, y, size, size)
        scanned++
        if (scanned % 25 === 0) await tick()
      }
    }
    await tick()
    if (found.size >= 12) break // 安全上限
  }
  return [...found.values()]
}

/** 解析二维码内容为结构化信息 */
function parseContent(data) {
  const d = (data || '').trim()
  if (!d) return { type: 'text', label: '文本', fields: {} }

  // WiFi
  const m = d.match(/^WIFI:(.*)$/i)
  if (m) {
    return { type: 'wifi', label: 'WiFi', fields: parseWifi(m[1]) }
  }
  // vCard
  if (/^BEGIN:VCARD/i.test(d)) {
    return { type: 'vcard', label: 'vCard 名片', fields: parseVcard(d) }
  }
  // URL
  if (/^https?:\/\//i.test(d)) {
    return { type: 'url', label: '网址', url: d, fields: {} }
  }
  // Email
  if (/^mailto:/i.test(d)) {
    try {
      const u = new URL(d)
      return {
        type: 'email',
        label: '邮箱',
        fields: {
          地址: decodeURIComponent(u.pathname),
          主题: decodeURIComponent(u.searchParams.get('subject') || ''),
          正文: decodeURIComponent(u.searchParams.get('body') || '')
        }
      }
    } catch (e) {
      return { type: 'email', label: '邮箱', fields: {} }
    }
  }
  // SMS
  if (/^smsto:/i.test(d)) {
    const rest = d.slice(6)
    const idx = rest.indexOf(':')
    return {
      type: 'sms',
      label: '短信',
      fields: {
        号码: idx >= 0 ? rest.slice(0, idx) : rest,
        内容: idx >= 0 ? rest.slice(idx + 1) : ''
      }
    }
  }
  return { type: 'text', label: '文本', fields: {} }
}

function parseWifi(content) {
  const fields = {}
  content.split(';').forEach((seg) => {
    if (!seg) return
    const idx = seg.indexOf(':')
    if (idx < 0) return
    const k = seg.slice(0, idx).toUpperCase()
    const v = seg.slice(idx + 1).replace(/\\([\\;,:])/g, '$1')
    if (k === 'S') fields['SSID'] = v
    else if (k === 'P') fields['密码'] = v
    else if (k === 'T') fields['加密'] = v === 'nopass' ? '无密码' : v
    else if (k === 'H') fields['隐藏网络'] = v === 'true' ? '是' : '否'
  })
  return fields
}

function parseVcard(d) {
  const fields = {}
  d.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^(FN|TEL[^:]*|EMAIL[^:]*|ORG|URL):(.*)$/i)
    if (!m) return
    const key = m[1].toUpperCase()
    const val = m[2]
    if (key.startsWith('FN')) fields['姓名'] = val
    else if (key.startsWith('TEL')) fields['电话'] = val
    else if (key.startsWith('EMAIL')) fields['邮箱'] = val
    else if (key.startsWith('ORG')) fields['组织'] = val
    else if (key.startsWith('URL')) fields['网址'] = val
  })
  return fields
}

/** 处理单个文件 */
async function processEntry(file) {
  const raw = file.raw || file
  const uid = file.uid || `${file.name || 'file'}-${file.size || Date.now()}-${Math.random()}`
  if (processedUids.value.has(uid)) return
  processedUids.value.add(uid)

  const entry = reactive({
    uid,
    name: file.name || '截图.png',
    previewUrl: URL.createObjectURL(raw),
    codes: [],
    status: 'processing',
    errorMsg: ''
  })
  results.value.push(entry)

  try {
    const img = await loadImage(raw)
    const codes = await scanMulti(img)
    entry.codes = codes.map((data) => ({ data, parsed: parseContent(data) }))
    entry.status = 'done'
    if (codes.length) {
      ElMessage.success(`识别到 ${codes.length} 个二维码`)
    } else {
      ElMessage.warning('未识别到二维码，请确保图片清晰')
    }
  } catch (e) {
    entry.status = 'error'
    entry.errorMsg = e?.message || '识别失败'
    ElMessage.error('识别失败：' + entry.errorMsg)
  }
}

// 监听上传文件列表，处理新增文件
watch(
  fileList,
  (files) => {
    if (!files || !files.length) return
    for (const f of files) {
      processEntry(f)
    }
  },
  { deep: false }
)

/** 粘贴截图 */
function onPaste(e) {
  const items = e.clipboardData?.items || []
  let added = false
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        const uid = `paste-${Date.now()}-${Math.random()}`
        const wrapper = {
          uid,
          name: file.name || 'screenshot.png',
          size: file.size,
          raw: file
        }
        fileList.value = [...fileList.value, wrapper]
        added = true
      }
    }
  }
  if (added) {
    e.preventDefault()
    ElMessage.success('已粘贴截图')
  }
}

async function copyCode(text) {
  if (!text) return
  const ok = await copyText(text)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败')
}

function openUrl(url) {
  window.open(url, '_blank')
}

function removeEntry(entry) {
  const idx = results.value.findIndex((e) => e.uid === entry.uid)
  if (idx >= 0) results.value.splice(idx, 1)
}

function clearAll() {
  results.value = []
  processedUids.value = new Set()
  fileList.value = []
  uploaderRef.value?.clearFiles()
}

/** 导出全部结果为 ZIP（每图一个 txt） */
async function exportResults() {
  if (!results.value.length) return
  try {
    const items = []
    for (const entry of results.value) {
      const lines = entry.codes.length
        ? entry.codes.map((c, i) => `[${i + 1}] ${c.data}`).join('\n\n')
        : '（未识别到二维码）'
      const text = `# ${entry.name}\n# 识别到 ${entry.codes.length} 个二维码\n\n${lines}\n`
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const name = (entry.name || 'result').replace(/\.[^.]+$/, '') + '.txt'
      items.push({ blob, name })
    }
    await downloadZip(items, `qr-results-${Date.now()}.zip`)
    ElMessage.success('已导出')
  } catch (e) {
    ElMessage.error('导出失败：' + (e?.message || '未知错误'))
  }
}

onMounted(() => {
  window.addEventListener('paste', onPaste)
})
onUnmounted(() => {
  window.removeEventListener('paste', onPaste)
})
</script>

<style scoped>
.qr-decoder {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.action-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.result-card {
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  padding: 16px;
  background: var(--color-surface, #fff);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--radius, 6px);
  border: 1px solid var(--color-border, #ebeef5);
  flex-shrink: 0;
}
.card-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-status {
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
}
.card-status.processing {
  color: var(--color-primary, #409eff);
}
.card-status.error {
  color: #f56c6c;
}
.codes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.code-item {
  background: var(--color-bg, #f5f7fa);
  border-radius: var(--radius, 6px);
  padding: 12px;
}
.code-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.code-badge {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-light, #ecf5ff);
  color: var(--color-primary, #409eff);
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}
.code-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.code-text :deep(.el-textarea__inner) {
  font-family: ui-monospace, 'Courier New', monospace;
  font-size: 13px;
}
.struct-fields {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px dashed var(--color-border, #ebeef5);
  padding-top: 8px;
}
.struct-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}
.struct-key {
  width: 80px;
  flex-shrink: 0;
  color: var(--color-text-secondary, #909399);
}
.struct-val {
  flex: 1;
  color: var(--color-text-primary, #303133);
  word-break: break-all;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
  color: var(--color-text-placeholder, #c0c4cc);
}
.empty-state p {
  font-size: 13px;
}
</style>
