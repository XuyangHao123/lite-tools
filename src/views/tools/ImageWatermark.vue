<template>
  <ToolLayout
    title="图片加水印"
    desc="免费在线给图片添加文字或图片水印，支持平铺、旋转、描边、阴影，批量处理本地不上传。"
    fav-key="image-watermark"
  >
    <div class="img-watermark">
      <FileUploader
        ref="uploaderRef"
        v-model="fileList"
        accept=".jpg,.jpeg,.png,.webp"
        tip="上传一张或多张图片添加水印（可批量）"
      />

      <template v-if="fileList.length >= 1">
        <!-- 水印类型 -->
        <div class="config-section">
          <label class="config-title">水印类型</label>
          <el-radio-group v-model="wmType">
            <el-radio-button value="text">文字水印</el-radio-button>
            <el-radio-button value="image">图片/Logo 水印</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 文字水印 -->
        <div v-if="wmType === 'text'" class="config-section">
          <label class="config-title">水印文字</label>
          <el-input v-model="text" placeholder="如：仅供 XX 使用" size="default" />

          <div class="config-row">
            <div class="config-section">
              <label class="config-title">字号</label>
              <el-input-number v-model="fontSize" :min="8" :max="400" :controls="false" size="default" />
            </div>
            <div class="config-section">
              <label class="config-title">颜色</label>
              <el-color-picker v-model="textColor" />
            </div>
            <div class="config-section">
              <label class="config-title">透明度</label>
              <el-slider v-model="opacity" :min="0" :max="100" :step="1" style="width: 160px" />
            </div>
            <div class="config-section">
              <label class="config-title">旋转</label>
              <el-slider v-model="rotate" :min="-90" :max="90" :step="1" style="width: 160px" />
            </div>
          </div>

          <div class="config-row">
            <el-checkbox v-model="stroke">描边（深色背景可读）</el-checkbox>
            <div v-if="stroke" class="inline">
              <el-color-picker v-model="strokeColor" />
              <el-input-number v-model="strokeWidth" :min="1" :max="20" :controls="false" size="small" />
              <span class="config-tip">px</span>
            </div>
            <el-checkbox v-model="shadow">阴影</el-checkbox>
          </div>
        </div>

        <!-- 图片水印 -->
        <div v-else class="config-section">
          <label class="config-title">水印图片（建议 PNG 透明底）</label>
          <FileUploader
            v-model="logoList"
            :show-file-list="false"
            accept=".png,.jpg,.jpeg,.webp"
            tip="上传一张图片作为水印"
          />
          <div class="config-row">
            <div class="config-section">
              <label class="config-title">大小（占短边 %）</label>
              <el-slider v-model="logoSizePct" :min="5" :max="100" :step="1" style="width: 200px" />
            </div>
            <div class="config-section">
              <label class="config-title">透明度</label>
              <el-slider v-model="opacity" :min="0" :max="100" :step="1" style="width: 160px" />
            </div>
            <div class="config-section">
              <label class="config-title">旋转</label>
              <el-slider v-model="rotate" :min="-90" :max="90" :step="1" style="width: 160px" />
            </div>
          </div>
        </div>

        <!-- 位置 / 平铺 -->
        <div class="config-section">
          <el-checkbox v-model="tile">平铺水印（覆盖整张图片）</el-checkbox>
          <div v-if="tile" class="config-row">
            <div class="config-section">
              <label class="config-title">平铺间距</label>
              <el-slider v-model="tileGap" :min="0" :max="300" :step="1" style="width: 220px" />
            </div>
          </div>
          <div v-else class="config-section">
            <label class="config-title">位置</label>
            <el-radio-group v-model="position">
              <el-radio-button value="lt">左上</el-radio-button>
              <el-radio-button value="ct">中上</el-radio-button>
              <el-radio-button value="rt">右上</el-radio-button>
              <el-radio-button value="lc">左中</el-radio-button>
              <el-radio-button value="cc">居中</el-radio-button>
              <el-radio-button value="rc">右中</el-radio-button>
              <el-radio-button value="lb">左下</el-radio-button>
              <el-radio-button value="cb">中下</el-radio-button>
              <el-radio-button value="rb">右下</el-radio-button>
            </el-radio-group>
            <div class="config-section">
              <label class="config-title">边距</label>
              <el-slider v-model="margin" :min="0" :max="300" :step="1" style="width: 220px" />
            </div>
          </div>
        </div>

        <!-- 输出格式 -->
        <div class="config-section">
          <label class="config-title">输出格式</label>
          <el-radio-group v-model="outFormat">
            <el-radio-button value="image/png">PNG</el-radio-button>
            <el-radio-button value="image/jpeg">JPG</el-radio-button>
            <el-radio-button value="image/webp">WebP</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 文件名模板 -->
        <div class="config-section">
          <label class="config-title">文件名模板</label>
          <el-input v-model="nameTpl" size="default" style="max-width: 320px">
            <template #prepend>命名</template>
          </el-input>
          <p class="config-tip">用 <code>{name}</code> 代表原文件名（不含扩展名）。</p>
        </div>

        <!-- 预览 -->
        <div class="config-section">
          <label class="config-title">预览（参考图）</label>
          <div class="preview-stage">
            <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" />
            <span v-else class="preview-empty">参数变化时自动刷新预览…</span>
          </div>
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" :loading="processing" @click="run(processAll, '加水印')">
            {{ processing ? '处理中...' : `处理 ${fileList.length} 张并下载` }}
          </el-button>
          <el-button size="large" @click="clearAll(() => { previewUrl = '' })">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { useToolState } from '@/composables/useToolState'
import { downloadBlob, downloadZip } from '@/composables/useDownload'
import { loadImage, createCanvas, canvasToBlob, mimeToExt } from '@/composables/useImageProcessor'
import { stripExt } from '@/utils/format'

const { fileList, uploaderRef, processing, run, clearAll } = useToolState()

const wmType = ref('text')
// 文字
const text = ref('水印')
const fontSize = ref(32)
const textColor = ref('#ffffff')
const opacity = ref(50)
const rotate = ref(-30)
const stroke = ref(false)
const strokeColor = ref('#000000')
const strokeWidth = ref(2)
const shadow = ref(false)
// 图片
const logoList = ref([])
let logoImg = null
const logoSizePct = ref(20)
// 通用
const tile = ref(false)
const tileGap = ref(80)
const position = ref('rb')
const margin = ref(20)
const outFormat = ref('image/png')
const nameTpl = ref('{name}-watermarked')

const previewUrl = ref('')
let previewTimer = null
let refImg = null

watch(logoList, async (files) => {
  logoImg = null
  if (!files.length) return
  try {
    logoImg = await loadImage(files[0].raw)
    schedulePreview()
  } catch (e) {
    ElMessage.error('水印图片加载失败：' + (e.message || e))
  }
})

watch(fileList, async (files) => {
  refImg = null
  previewUrl.value = ''
  if (!files.length) return
  try {
    refImg = await loadImage(files[0].raw)
    schedulePreview()
  } catch (e) {
    ElMessage.error('图片加载失败：' + (e.message || e))
  }
})

watch(
  [wmType, text, fontSize, textColor, opacity, rotate, stroke, strokeColor, strokeWidth, shadow,
   logoSizePct, tile, tileGap, position, margin, outFormat, logoList],
  () => schedulePreview(),
  { deep: true }
)

function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    generatePreview().catch(() => {})
  }, 200)
}

async function generatePreview() {
  if (!refImg) return
  if (wmType.value === 'image' && !logoImg) {
    previewUrl.value = ''
    return
  }
  try {
    const canvas = await drawWatermark(refImg)
    previewUrl.value = canvas.toDataURL(outFormat.value, 0.92)
  } catch (e) {
    /* 预览失败忽略 */
  }
}

/** 计算单水印盒子在画布中的左上角坐标 */
function boxPos(pos, w, h, tw, th, m) {
  switch (pos) {
    case 'lt': return { x: m, y: m }
    case 'ct': return { x: (w - tw) / 2, y: m }
    case 'rt': return { x: w - tw - m, y: m }
    case 'lc': return { x: m, y: (h - th) / 2 }
    case 'cc': return { x: (w - tw) / 2, y: (h - th) / 2 }
    case 'rc': return { x: w - tw - m, y: (h - th) / 2 }
    case 'lb': return { x: m, y: h - th - m }
    case 'cb': return { x: (w - tw) / 2, y: h - th - m }
    case 'rb': return { x: w - tw - m, y: h - th - m }
    default: return { x: m, y: m }
  }
}

/** 在给定图上绘制水印，返回 canvas */
async function drawWatermark(img) {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const { canvas, ctx } = createCanvas(w, h, outFormat.value === 'image/jpeg')
  ctx.drawImage(img, 0, 0)

  const alpha = opacity.value / 100
  const rot = (rotate.value * Math.PI) / 180

  if (wmType.value === 'text') {
    if (!text.value) return canvas
    ctx.font = `${fontSize.value}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = alpha
    ctx.fillStyle = textColor.value
    if (shadow.value) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
    }
    if (stroke.value) {
      ctx.strokeStyle = strokeColor.value
      ctx.lineWidth = strokeWidth.value
    }
    const m = ctx.measureText(text.value)
    const tw = m.width
    const th = fontSize.value

    if (tile.value) {
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(rot)
      ctx.translate(-w / 2, -h / 2)
      ctx.textAlign = 'left'
      const stepX = tw + tileGap.value
      const stepY = th + tileGap.value
      for (let y = -h; y < 2 * h; y += stepY) {
        for (let x = -w; x < 2 * w; x += stepX) {
          if (stroke.value) ctx.strokeText(text.value, x, y)
          ctx.fillText(text.value, x, y)
        }
      }
      ctx.restore()
    } else {
      const { x, y } = boxPos(position.value, w, h, tw, th, margin.value)
      ctx.save()
      ctx.translate(x + tw / 2, y + th / 2)
      ctx.rotate(rot)
      if (stroke.value) ctx.strokeText(text.value, 0, 0)
      ctx.fillText(text.value, 0, 0)
      ctx.restore()
    }
    ctx.globalAlpha = 1
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  } else {
    // 图片水印
    if (!logoImg) return canvas
    const short = Math.min(w, h)
    const lw = Math.max(1, Math.round((short * logoSizePct.value) / 100))
    const lh = Math.max(1, Math.round(lw * (logoImg.naturalHeight / logoImg.naturalWidth)))
    if (tile.value) {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(w / 2, h / 2)
      ctx.rotate(rot)
      ctx.translate(-w / 2, -h / 2)
      const stepX = lw + tileGap.value
      const stepY = lh + tileGap.value
      for (let y = -h; y < 2 * h; y += stepY) {
        for (let x = -w; x < 2 * w; x += stepX) {
          ctx.drawImage(logoImg, x, y, lw, lh)
        }
      }
      ctx.restore()
    } else {
      const { x, y } = boxPos(position.value, w, h, lw, lh, margin.value)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x + lw / 2, y + lh / 2)
      ctx.rotate(rot)
      ctx.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }
  return canvas
}

function buildName(file) {
  const base = stripExt(file.name) || 'image'
  return (nameTpl.value.replace(/\{name\}/g, base) || base) + '.' + mimeToExt(outFormat.value)
}

async function processAll() {
  if (!fileList.value.length) return
  if (wmType.value === 'text' && !text.value) {
    ElMessage.warning('请输入水印文字')
    return
  }
  if (wmType.value === 'image' && !logoImg) {
    ElMessage.warning('请上传水印图片')
    return
  }
  const items = []
  for (const f of fileList.value) {
    const img = await loadImage(f.raw)
    const canvas = await drawWatermark(img)
    const blob = await canvasToBlob(canvas, outFormat.value, 0.92)
    items.push({ blob, name: buildName(f) })
  }
  if (items.length === 1) {
    downloadBlob(items[0].blob, items[0].name)
  } else {
    await downloadZip(items, 'watermarked-images.zip')
  }
  ElMessage.success(`处理完成，共 ${items.length} 张`)
}

onUnmounted(() => {
  if (previewTimer) clearTimeout(previewTimer)
})
</script>

<style scoped>
.img-watermark { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.config-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; }
.config-tip code { background: var(--color-primary-light, #ecf5ff); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
.config-row { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
.inline { display: flex; align-items: center; gap: 8px; }
.action-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.preview-stage {
  min-height: 160px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg, #f5f7fa);
  border: 1px dashed var(--color-border, #ebeef5);
  border-radius: 8px; padding: 12px;
}
.preview-img { max-width: 100%; max-height: 360px; border-radius: 6px; }
.preview-empty { font-size: 12px; color: var(--color-text-secondary, #909399); }
@media (max-width: 768px) { .config-row { flex-direction: column; gap: 16px; } }
</style>
