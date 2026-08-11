<template>
  <ToolLayout
    title="二维码生成器"
    desc="免费在线生成二维码，支持自定义颜色、尺寸、容错级别、圆点点阵、Logo 嵌入、内容模板（WiFi/vCard/短信/邮箱）、批量生成，可导出 PNG/JPG/WebP/SVG 矢量图。"
    fav-key="qr-generator"
  >
    <div class="qr-generator">
      <!-- 左侧：输入与配置 -->
      <div class="qr-config">
        <el-form label-position="top" size="default">
          <!-- 内容模板 -->
          <el-form-item label="内容模板">
            <el-select v-model="template" style="width: 100%">
              <el-option label="纯文本" value="text" />
              <el-option label="网址 URL" value="url" />
              <el-option label="WiFi" value="wifi" />
              <el-option label="vCard 名片" value="vcard" />
              <el-option label="短信" value="sms" />
              <el-option label="邮箱" value="email" />
            </el-select>
          </el-form-item>

          <!-- 文本类输入 -->
          <el-form-item v-if="template === 'text' || template === 'url'" label="二维码内容">
            <el-input
              v-model="qrText"
              type="textarea"
              :rows="4"
              :placeholder="template === 'url' ? '输入网址，如 https://example.com' : '输入文本或网址，自动生成二维码'"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <!-- WiFi 表单 -->
          <template v-else-if="template === 'wifi'">
            <el-form-item label="网络名称 (SSID)">
              <el-input v-model="wifiSsid" placeholder="如 MyWiFi" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="wifiPwd" placeholder="WiFi 密码（无密码选下方加密方式为“无”）" show-password />
            </el-form-item>
            <div class="inline-row">
              <el-form-item label="加密方式" class="flex1">
                <el-select v-model="wifiEnc" style="width: 100%">
                  <el-option label="WPA/WPA2" value="WPA" />
                  <el-option label="WEP" value="WEP" />
                  <el-option label="无密码" value="nopass" />
                </el-select>
              </el-form-item>
              <el-form-item label="隐藏网络">
                <el-switch v-model="wifiHidden" />
              </el-form-item>
            </div>
          </template>

          <!-- vCard 表单 -->
          <template v-else-if="template === 'vcard'">
            <div class="inline-row">
              <el-form-item label="姓名" class="flex1">
                <el-input v-model="vcName" placeholder="如 张三" />
              </el-form-item>
              <el-form-item label="电话" class="flex1">
                <el-input v-model="vcPhone" placeholder="如 13800138000" />
              </el-form-item>
            </div>
            <div class="inline-row">
              <el-form-item label="邮箱" class="flex1">
                <el-input v-model="vcEmail" placeholder="如 name@example.com" />
              </el-form-item>
              <el-form-item label="网址" class="flex1">
                <el-input v-model="vcUrl" placeholder="如 https://example.com" />
              </el-form-item>
            </div>
            <el-form-item label="组织/公司">
              <el-input v-model="vcOrg" placeholder="如 某某公司" />
            </el-form-item>
          </template>

          <!-- 短信表单 -->
          <template v-else-if="template === 'sms'">
            <el-form-item label="手机号">
              <el-input v-model="smsNumber" placeholder="如 13800138000" />
            </el-form-item>
            <el-form-item label="短信内容">
              <el-input v-model="smsBody" type="textarea" :rows="3" placeholder="短信正文（可选）" />
            </el-form-item>
          </template>

          <!-- 邮箱表单 -->
          <template v-else-if="template === 'email'">
            <el-form-item label="邮箱地址">
              <el-input v-model="emailAddr" placeholder="如 name@example.com" />
            </el-form-item>
            <el-form-item label="主题">
              <el-input v-model="emailSubject" placeholder="邮件主题（可选）" />
            </el-form-item>
            <el-form-item label="正文">
              <el-input v-model="emailBody" type="textarea" :rows="3" placeholder="邮件正文（可选）" />
            </el-form-item>
          </template>

          <!-- 生成的预览内容（非文本模板展示最终字符串） -->
          <el-form-item v-if="template !== 'text' && template !== 'url'" label="生成的内容（将编码进二维码）">
            <el-input :model-value="content" type="textarea" :rows="2" readonly />
          </el-form-item>

          <!-- 批量生成 -->
          <el-form-item label="批量生成">
            <div class="batch-toggle">
              <el-switch v-model="batchMode" />
              <span class="batch-hint">开启后按下方每行内容生成多个二维码并打包下载</span>
            </div>
            <el-input
              v-if="batchMode"
              v-model="batchText"
              type="textarea"
              :rows="4"
              placeholder="每行一条内容，生成多个二维码打包为 ZIP"
            />
          </el-form-item>

          <!-- 尺寸与边距 -->
          <div class="inline-row">
            <el-form-item label="尺寸（像素）" class="flex1">
              <el-slider v-model="qrSize" :min="128" :max="1024" :step="32" show-input :show-input-controls="false" />
            </el-form-item>
            <el-form-item label="边距（模块）" class="flex1">
              <el-slider v-model="qrMargin" :min="0" :max="10" :step="1" show-input :show-input-controls="false" />
            </el-form-item>
          </div>

          <!-- 颜色 -->
          <div class="color-row">
            <el-form-item label="前景色" class="color-item">
              <el-color-picker v-model="qrFgColor" />
              <span class="color-value">{{ qrFgColor }}</span>
            </el-form-item>
            <el-form-item label="背景色" class="color-item">
              <el-color-picker v-model="qrBgColor" />
              <span class="color-value">{{ qrBgColor }}</span>
            </el-form-item>
          </div>

          <!-- 容错级别 + 点阵样式 -->
          <div class="inline-row">
            <el-form-item label="容错级别" class="flex1">
              <el-radio-group v-model="qrLevel" size="default">
                <el-radio-button value="L">L (7%)</el-radio-button>
                <el-radio-button value="M">M (15%)</el-radio-button>
                <el-radio-button value="Q">Q (25%)</el-radio-button>
                <el-radio-button value="H">H (30%)</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="点阵样式" class="flex1">
              <el-radio-group v-model="dotStyle">
                <el-radio-button value="square">方块</el-radio-button>
                <el-radio-button value="dot">圆点</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </div>

          <!-- Logo 嵌入 -->
          <el-form-item label="Logo 嵌入（居中，按容错级别自动留占位区）">
            <div class="logo-row">
              <el-upload
                :show-file-list="false"
                :auto-upload="false"
                accept="image/png,image/*"
                :on-change="onLogoChange"
              >
                <el-button :icon="UploadFilled">上传 Logo（建议 PNG 透明底）</el-button>
              </el-upload>
              <el-button v-if="logoImg" link type="danger" :icon="Delete" @click="removeLogo">移除</el-button>
              <span v-if="logoImg" class="logo-tip">占位区约 {{ Math.round(logoFrac * 100) }}%</span>
            </div>
          </el-form-item>

          <!-- 下载 -->
          <el-form-item label="导出">
            <div class="export-row">
              <el-select v-model="exportFmt" style="width: 140px">
                <el-option label="PNG 图片" value="png" />
                <el-option label="JPG 图片" value="jpg" />
                <el-option label="WebP 图片" value="webp" />
                <el-option label="SVG 矢量" value="svg" />
              </el-select>
              <el-button v-if="!batchMode" type="primary" :icon="Download" :loading="downloading" :disabled="!content" @click="downloadOne">
                下载
              </el-button>
              <el-button v-if="batchMode" type="primary" :icon="Files" :loading="downloading" :disabled="!firstBatchLine" @click="downloadBatch">
                批量打包下载 ({{ batchLines.length }} 个)
              </el-button>
              <el-button :icon="RefreshRight" @click="reset">重置</el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧：预览 -->
      <div class="qr-preview">
        <div class="preview-box">
          <canvas ref="canvasRef"></canvas>
          <div v-if="!previewContent" class="preview-empty">
            <el-icon :size="48"><Picture /></el-icon>
            <p>{{ batchMode ? '批量模式：输入内容后预览首条' : '输入内容后自动生成二维码' }}</p>
          </div>
        </div>
        <p class="preview-tip">提示：容错级别越高抗污损能力越强；嵌入 Logo 建议选择 Q 或 H 级别。</p>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Download, Picture, UploadFilled, Delete, Files, RefreshRight } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import ToolLayout from '@/components/ToolLayout.vue'
import { downloadBlob, downloadZip } from '@/composables/useDownload'
import { canvasToBlob, createCanvas } from '@/composables/useImageProcessor'

// ===== 内容与模板 =====
const template = ref('text')
const qrText = ref('')

// WiFi
const wifiSsid = ref('')
const wifiPwd = ref('')
const wifiEnc = ref('WPA')
const wifiHidden = ref(false)
function escapeWifi(v) {
  return String(v || '').replace(/([\\;,:])/g, '\\$1')
}
function buildWifi() {
  if (!wifiSsid.value) return ''
  const enc = wifiEnc.value === 'nopass' ? 'nopass' : wifiEnc.value
  let s = `WIFI:T:${enc};S:${escapeWifi(wifiSsid.value)};`
  if (enc !== 'nopass') s += `P:${escapeWifi(wifiPwd.value)};`
  if (wifiHidden.value) s += `H:true;`
  s += ';'
  return s
}

// vCard
const vcName = ref('')
const vcPhone = ref('')
const vcEmail = ref('')
const vcOrg = ref('')
const vcUrl = ref('')
function buildVcard() {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  if (vcName.value) lines.push(`N:${vcName.value};;;;`, `FN:${vcName.value}`)
  if (vcPhone.value) lines.push(`TEL;TYPE=CELL:${vcPhone.value}`)
  if (vcEmail.value) lines.push(`EMAIL:${vcEmail.value}`)
  if (vcOrg.value) lines.push(`ORG:${vcOrg.value}`)
  if (vcUrl.value) lines.push(`URL:${vcUrl.value}`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

// SMS
const smsNumber = ref('')
const smsBody = ref('')
function buildSms() {
  if (!smsNumber.value) return ''
  return `SMSTO:${smsNumber.value}:${smsBody.value || ''}`
}

// Email
const emailAddr = ref('')
const emailSubject = ref('')
const emailBody = ref('')
function buildEmail() {
  if (!emailAddr.value) return ''
  const params = []
  if (emailSubject.value) params.push(`subject=${encodeURIComponent(emailSubject.value)}`)
  if (emailBody.value) params.push(`body=${encodeURIComponent(emailBody.value)}`)
  let s = `mailto:${emailAddr.value}`
  if (params.length) s += '?' + params.join('&')
  return s
}

// 最终要编码的内容（单条）
const content = computed(() => {
  switch (template.value) {
    case 'url': return qrText.value
    case 'wifi': return buildWifi()
    case 'vcard': return buildVcard()
    case 'sms': return buildSms()
    case 'email': return buildEmail()
    case 'text':
    default: return qrText.value
  }
})

// ===== 批量 =====
const batchMode = ref(false)
const batchText = ref('')
const batchLines = computed(() =>
  batchText.value.split('\n').map((l) => l.trim()).filter(Boolean)
)
const firstBatchLine = computed(() => batchLines.value[0] || '')

// 批量模式预览首条，否则预览单条内容
const previewContent = computed(() => (batchMode.value ? firstBatchLine.value : content.value))

// ===== 样式配置 =====
const qrSize = ref(256)
const qrMargin = ref(2)
const qrFgColor = ref('#000000')
const qrBgColor = ref('#ffffff')
const qrLevel = ref('M')
const dotStyle = ref('square')

// Logo
const logoImg = ref(null)
const logoDataUrl = ref('')
// 根据容错级别自动确定 Logo 占比（约 15%-25%）
const logoFrac = computed(() => {
  if (!logoImg.value) return 0
  const map = { L: 0.15, M: 0.18, Q: 0.22, H: 0.25 }
  return map[qrLevel.value] ?? 0.18
})

const exportFmt = ref('png')
const downloading = ref(false)
const canvasRef = ref(null)

/** 获取二维码模块矩阵 */
function getMatrix(text) {
  return QRCode.create(text, { errorCorrectionLevel: qrLevel.value }).modules
}

/** 将二维码绘制到 canvas（支持方块/圆点、Logo） */
function drawQrCanvas(canvas, matrix) {
  const size = qrSize.value
  const margin = qrMargin.value
  const N = matrix.size
  const total = N + margin * 2
  const ms = size / total
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  // 背景
  ctx.fillStyle = qrBgColor.value
  ctx.fillRect(0, 0, size, size)
  // 模块
  ctx.fillStyle = qrFgColor.value
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!matrix.get(r, c)) continue
      const x = (c + margin) * ms
      const y = (r + margin) * ms
      if (dotStyle.value === 'dot') {
        ctx.beginPath()
        ctx.arc(x + ms / 2, y + ms / 2, (ms / 2) * 0.92, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, ms, ms)
      }
    }
  }
  // Logo 居中
  if (logoImg.value) {
    const ls = size * logoFrac.value
    const lx = (size - ls) / 2
    const ly = (size - ls) / 2
    ctx.fillStyle = qrBgColor.value
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, (ls / 2) * 1.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.drawImage(logoImg.value, lx, ly, ls, ls)
  }
}

/** 生成 SVG 字符串（矢量，支持方块/圆点、Logo） */
function generateSvg(matrix) {
  const size = qrSize.value
  const margin = qrMargin.value
  const N = matrix.size
  const total = N + margin * 2
  const ms = size / total
  const fg = qrFgColor.value
  const bg = qrBgColor.value
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`]
  parts.push(`<rect width="${size}" height="${size}" fill="${bg}"/>`)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!matrix.get(r, c)) continue
      const x = (c + margin) * ms
      const y = (r + margin) * ms
      if (dotStyle.value === 'dot') {
        parts.push(`<circle cx="${(x + ms / 2).toFixed(2)}" cy="${(y + ms / 2).toFixed(2)}" r="${(ms / 2 * 0.92).toFixed(2)}" fill="${fg}"/>`)
      } else {
        parts.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${ms.toFixed(2)}" height="${ms.toFixed(2)}" fill="${fg}"/>`)
      }
    }
  }
  if (logoDataUrl.value) {
    const ls = size * logoFrac.value
    const lx = (size - ls) / 2
    const ly = (size - ls) / 2
    parts.push(`<circle cx="${size / 2}" cy="${size / 2}" r="${(ls / 2 * 1.15).toFixed(2)}" fill="${bg}"/>`)
    parts.push(`<image href="${logoDataUrl.value}" xlink:href="${logoDataUrl.value}" x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" width="${ls.toFixed(2)}" height="${ls.toFixed(2)}"/>`)
  }
  parts.push('</svg>')
  return parts.join('')
}

/** 渲染预览 */
async function renderQr() {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas) return
  const text = previewContent.value
  if (!text) return
  try {
    const matrix = getMatrix(text)
    drawQrCanvas(canvas, matrix)
  } catch (e) {
    // 内容过长等异常，静默处理
  }
}

/** 为单条内容生成 Blob（按当前导出格式） */
async function makeBlob(text) {
  const matrix = getMatrix(text)
  if (exportFmt.value === 'svg') {
    const svg = generateSvg(matrix)
    return new Blob([svg], { type: 'image/svg+xml' })
  }
  const { canvas } = createCanvas(qrSize.value, qrSize.value)
  drawQrCanvas(canvas, matrix)
  const mime = exportFmt.value === 'jpg' ? 'image/jpeg' : exportFmt.value === 'webp' ? 'image/webp' : 'image/png'
  return canvasToBlob(canvas, mime, 0.92)
}

function extOf(fmt) {
  return { png: 'png', jpg: 'jpg', webp: 'webp', svg: 'svg' }[fmt] || 'png'
}

/** 下载单条 */
async function downloadOne() {
  if (!content.value) return
  downloading.value = true
  try {
    const blob = await makeBlob(content.value)
    const name = `qrcode-${Date.now()}.${extOf(exportFmt.value)}`
    downloadBlob(blob, name)
  } catch (e) {
    ElMessage.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    downloading.value = false
  }
}

/** 批量打包下载 */
async function downloadBatch() {
  const lines = batchLines.value
  if (!lines.length) return
  downloading.value = true
  try {
    const items = []
    const seen = new Map()
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i]
      const blob = await makeBlob(text)
      // 处理重名
      let name = `qr-${String(i + 1).padStart(3, '0')}.${extOf(exportFmt.value)}`
      items.push({ blob, name })
      seen.set(text, (seen.get(text) || 0) + 1)
    }
    await downloadZip(items, `qrcodes-batch-${Date.now()}.zip`)
    ElMessage.success(`已打包 ${items.length} 个二维码`)
  } catch (e) {
    ElMessage.error('批量生成失败：' + (e?.message || '未知错误'))
  } finally {
    downloading.value = false
  }
}

/** Logo 上传 */
function onLogoChange(file) {
  const raw = file?.raw || file
  if (!raw) return
  const reader = new FileReader()
  reader.onload = () => {
    logoDataUrl.value = reader.result
    const img = new Image()
    img.onload = () => {
      logoImg.value = img
      renderQr()
    }
    img.onerror = () => ElMessage.error('Logo 图片加载失败')
    img.src = reader.result
  }
  reader.onerror = () => ElMessage.error('Logo 读取失败')
  reader.readAsDataURL(raw)
}

function removeLogo() {
  logoImg.value = null
  logoDataUrl.value = ''
  renderQr()
}

/** 重置 */
function reset() {
  qrText.value = ''
  template.value = 'text'
  qrSize.value = 256
  qrMargin.value = 2
  qrFgColor.value = '#000000'
  qrBgColor.value = '#ffffff'
  qrLevel.value = 'M'
  dotStyle.value = 'square'
  batchMode.value = false
  batchText.value = ''
  exportFmt.value = 'png'
  removeLogo()
  wifiSsid.value = wifiPwd.value = ''
  wifiEnc.value = 'WPA'
  wifiHidden.value = false
  vcName.value = vcPhone.value = vcEmail.value = vcOrg.value = vcUrl.value = ''
  smsNumber.value = smsBody.value = ''
  emailAddr.value = emailSubject.value = emailBody.value = ''
}

// 配置变化时重新渲染
watch(
  [previewContent, qrSize, qrMargin, qrFgColor, qrBgColor, qrLevel, dotStyle, logoImg],
  renderQr,
  { immediate: true }
)

onMounted(() => {
  if (previewContent.value) renderQr()
})
</script>

<style scoped>
.qr-generator {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

.inline-row {
  display: flex;
  gap: 24px;
}
.inline-row .flex1 {
  flex: 1;
}

.color-row {
  display: flex;
  gap: 24px;
}
.color-item {
  flex: 1;
}
.color-value {
  margin-left: 8px;
  font-size: 13px;
  color: var(--color-text-secondary, #909399);
  font-family: ui-monospace, 'Courier New', monospace;
}

.batch-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.batch-hint {
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.logo-tip {
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
}

.export-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.qr-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-box {
  position: relative;
  width: 100%;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px dashed var(--color-border, #dcdfe6);
  border-radius: var(--radius, 8px);
  padding: 24px;
}

.preview-box canvas {
  max-width: 100%;
  height: auto;
  display: block;
}

.preview-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-text-placeholder, #c0c4cc);
}

.preview-empty p {
  font-size: 13px;
}

.preview-tip {
  font-size: 12px;
  color: var(--color-text-placeholder, #c0c4cc);
  text-align: center;
}

@media (max-width: 768px) {
  .qr-generator {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .color-row,
  .inline-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
