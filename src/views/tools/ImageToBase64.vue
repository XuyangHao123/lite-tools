<template>
  <ToolLayout
    title="图片转 Base64"
    desc="免费在线将图片与 Base64 互转，支持批量、Data URL / CSS / img 标签输出，本地处理。"
    fav-key="image-to-base64"
  >
    <div class="img-to-base64">
      <!-- 模式 -->
      <div class="action-bar">
        <el-radio-group v-model="mode">
          <el-radio-button value="encode">图片转 Base64</el-radio-button>
          <el-radio-button value="decode">Base64 转图片</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 编码 -->
      <template v-if="mode === 'encode'">
        <FileUploader
          ref="uploaderRef"
          v-model="fileList"
          :show-file-list="false"
          accept=".jpg,.jpeg,.png,.webp,.gif,.bmp"
          tip="支持 JPG/PNG/WebP/GIF/BMP，可多选批量转换"
        />

        <template v-if="results.length">
          <div class="output-mode-bar">
            <span class="config-title">输出格式：</span>
            <el-radio-group v-model="outputMode" size="small">
              <el-radio-button value="raw">纯 Base64</el-radio-button>
              <el-radio-button value="dataUrl">Data URL</el-radio-button>
              <el-radio-button value="css">CSS background</el-radio-button>
              <el-radio-button value="img">&lt;img&gt; 标签</el-radio-button>
            </el-radio-group>
          </div>

          <div class="result-list">
            <div v-for="(r, i) in results" :key="i" class="result-item">
              <img :src="r.dataUrl" class="result-thumb" :alt="r.name" />
              <div class="result-info">
                <span class="result-name">{{ r.name }}</span>
                <div class="info-tags">
                  <el-tag size="small" type="info">大小：{{ formatSize(r.size) }}</el-tag>
                  <el-tag size="small" type="info">Base64 长度：{{ formatNumber(r.length) }}</el-tag>
                </div>
                <el-input :model-value="codeFor(r)" type="textarea" :rows="3" readonly class="code-box" />
              </div>
              <el-button size="small" :icon="CopyDocument" @click="copy(codeFor(r))">复制</el-button>
            </div>
          </div>
        </template>
      </template>

      <!-- 解码 -->
      <template v-else>
        <div class="decode-section">
          <div class="panel-header">
            <span class="config-title">粘贴 Base64 字符串</span>
            <el-button size="small" type="primary" @click="onDecode">解析</el-button>
          </div>
          <el-input
            v-model="rawInput"
            type="textarea"
            :rows="8"
            placeholder="粘贴 Data URL 或纯 Base64 字符串，点击解析"
          />
          <p class="config-tip">支持带 <code>data:image/...;base64,</code> 前缀的 Data URL，也支持纯 Base64（自动识别图片格式）。</p>
        </div>

        <div v-if="decodeError" class="error-msg">
          <el-alert :title="decodeError" type="error" show-icon :closable="false" />
        </div>

        <div v-if="decoded.url" class="decode-result">
          <div class="info-tags">
            <el-tag size="small" type="info">类型：{{ decoded.mime }}</el-tag>
            <el-tag size="small" type="info">大小：{{ formatSize(decoded.size) }}</el-tag>
          </div>
          <div class="preview-section">
            <label class="config-title">图片预览</label>
            <img :src="decoded.url" class="preview-img" alt="解码预览" />
          </div>
          <div class="download-row">
            <el-input v-model="decoded.name" size="default" style="max-width: 280px">
              <template #prepend>文件名</template>
            </el-input>
            <el-button type="primary" :icon="Download" @click="downloadDecoded">下载图片</el-button>
          </div>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { CopyDocument, Download } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { formatSize, formatNumber, copyText, stripExt } from '@/utils/format'
import { downloadBlob } from '@/composables/useDownload'
import { mimeToExt } from '@/composables/useImageProcessor'

const { fileList, uploaderRef, clearAll } = useToolState()

const mode = ref('encode')
const results = ref([])
const outputMode = ref('dataUrl')

// 解码
const rawInput = ref('')
const decodeError = ref('')
const decoded = ref({ url: '', mime: '', size: 0, name: 'decoded.png' })

watch(fileList, async (files) => {
  results.value = []
  if (!files.length) return
  const out = []
  for (const file of files) {
    const dataUrl = await readAsDataUrl(file.raw)
    out.push({
      name: file.name,
      size: file.size,
      dataUrl,
      length: dataUrl.length
    })
  }
  results.value = out
}, { deep: true })

function readAsDataUrl(raw) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(raw)
  })
}

function codeFor(r) {
  const d = r.dataUrl
  if (outputMode.value === 'raw') return d.split(',')[1] || ''
  if (outputMode.value === 'css') return `background-image: url('${d}');`
  if (outputMode.value === 'img') return `<img src="${d}" alt="${stripExt(r.name) || 'image'}">`
  return d
}

async function copy(text) {
  const ok = await copyText(text)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败')
}

// ===== 解码 =====
function detectMime(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp'
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp'
  return 'image/png'
}

function onDecode() {
  decodeError.value = ''
  if (!rawInput.value.trim()) {
    decodeError.value = '请输入 Base64 字符串'
    return
  }
  try {
    let s = rawInput.value.trim()
    let mime = null
    const m = s.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/s)
    if (m) {
      mime = m[1]
      s = m[2]
    }
    s = s.replace(/\s+/g, '')
    const pad = s.length % 4
    if (pad) s += '='.repeat(4 - pad)
    const bin = atob(s)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    if (!mime) mime = detectMime(bytes)
    const blob = new Blob([bytes], { type: mime })
    if (decoded.value.url) URL.revokeObjectURL(decoded.value.url)
    decoded.value = {
      url: URL.createObjectURL(blob),
      mime,
      size: blob.size,
      name: 'decoded.' + mimeToExt(mime)
    }
    ElMessage.success('解析成功')
  } catch (e) {
    decodeError.value = '解析失败：不是有效的 Base64 图片数据'
  }
}

function downloadDecoded() {
  fetch(decoded.value.url)
    .then((r) => r.blob())
    .then((blob) => {
      downloadBlob(blob, decoded.value.name || 'decoded.png')
    })
    .catch(() => ElMessage.error('下载失败'))
}

onUnmounted(() => {
  if (decoded.value.url) URL.revokeObjectURL(decoded.value.url)
})
</script>

<style scoped>
.img-to-base64 { display: flex; flex-direction: column; gap: 20px; }
.action-bar { display: flex; gap: 12px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.config-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; }
.config-tip code { background: var(--color-primary-light, #ecf5ff); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
.output-mode-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.result-list { display: flex; flex-direction: column; gap: 10px; }
.result-item {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px;
  background: var(--color-bg, #f5f7fa);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 8px;
}
.result-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
.result-info { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.result-name { font-size: 13px; color: var(--color-text-primary, #303133); word-break: break-all; }
.info-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.code-box :deep(.el-textarea__inner) { font-family: monospace; font-size: 12px; }

.decode-section { display: flex; flex-direction: column; gap: 8px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.error-msg { margin-top: 4px; }
.decode-result { display: flex; flex-direction: column; gap: 12px; }
.preview-section { display: flex; flex-direction: column; gap: 8px; }
.preview-img { max-width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid var(--color-border, #ebeef5); }
.download-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
</style>
