<template>
  <ToolLayout title="图片加水印" desc="免费在线给图片添加文字水印，支持自定义文字、位置、颜色、透明度，本地处理不上传。">
    <div class="img-watermark">
      <FileUploader ref="uploaderRef" v-model="fileList" :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" tip="上传一张图片添加水印" />

      <template v-if="fileList.length === 1">
        <!-- 水印设置 -->
        <div class="config-section">
          <label class="config-title">水印文字</label>
          <el-input v-model="watermarkText" placeholder="如：仅供XX使用" size="large" />
        </div>

        <div class="config-section">
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
        </div>

        <div class="config-row">
          <div class="config-section">
            <label class="config-title">字号</label>
            <el-input-number v-model="fontSize" :min="8" :max="200" :controls="false" size="default" />
          </div>
          <div class="config-section">
            <label class="config-title">颜色</label>
            <el-color-picker v-model="color" />
          </div>
          <div class="config-section">
            <label class="config-title">透明度</label>
            <el-slider v-model="opacity" :min="0" :max="100" :step="5" style="width:150px" />
          </div>
          <div class="config-section">
            <label class="config-title">旋转</label>
            <el-slider v-model="rotate" :min="-90" :max="90" :step="5" style="width:150px" />
          </div>
        </div>

        <div class="config-section">
          <el-checkbox v-model="tile">平铺水印（覆盖整张图片）</el-checkbox>
        </div>

        <div class="action-bar">
          <el-button type="primary" size="large" @click="addWatermark">生成并下载</el-button>
          <el-button size="large" @click="clearAll">清空</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const watermarkText = ref('水印')
const position = ref('rb')
const fontSize = ref(32)
const color = ref('#ffffff')
const opacity = ref(50)
const rotate = ref(-30)
const tile = ref(false)

function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(raw)
  })
}

async function addWatermark() {
  if (fileList.length !== 1) return
  if (!watermarkText.value) { ElMessage.warning('请输入水印文字'); return }

  try {
    const img = await loadImage(fileList.value[0].raw)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    ctx.font = `${fontSize.value}px sans-serif`
    ctx.fillStyle = color.value
    ctx.globalAlpha = opacity.value / 100
    ctx.textBaseline = 'middle'

    const text = watermarkText.value
    const metrics = ctx.measureText(text)
    const tw = metrics.width
    const th = fontSize.value
    const margin = 20

    if (tile.value) {
      // 平铺水印
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(rotate.value * Math.PI / 180)
      ctx.translate(-canvas.width / 2, -canvas.height / 2)
      const spacing = tw + 80
      for (let y = -canvas.height; y < canvas.height * 2; y += spacing) {
        for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
          ctx.fillText(text, x, y)
        }
      }
      ctx.restore()
    } else {
      // 单个水印
      ctx.save()
      let x, y
      const w = canvas.width, h = canvas.height
      switch (position.value) {
        case 'lt': x = margin; y = margin + th/2; break
        case 'ct': x = (w - tw) / 2; y = margin + th/2; break
        case 'rt': x = w - tw - margin; y = margin + th/2; break
        case 'lc': x = margin; y = h / 2; break
        case 'cc': x = (w - tw) / 2; y = h / 2; break
        case 'rc': x = w - tw - margin; y = h / 2; break
        case 'lb': x = margin; y = h - margin - th/2; break
        case 'cb': x = (w - tw) / 2; y = h - margin - th/2; break
        case 'rb': x = w - tw - margin; y = h - margin - th/2; break
      }
      ctx.translate(x + tw/2, y)
      ctx.rotate(rotate.value * Math.PI / 180)
      ctx.textAlign = 'center'
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }

    const dataUrl = canvas.toDataURL('image/png')
    const blob = await (await fetch(dataUrl)).blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `watermarked-${Date.now()}.png`
    link.click()
    ElMessage.success('水印添加成功')
  } catch (e) {
    ElMessage.error('处理失败：' + e.message)
  }
}

function clearAll() { uploaderRef.value?.clearFiles(); fileList.value = [] }
</script>

<style scoped>
.img-watermark { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.config-row { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
.action-bar { display: flex; gap: 12px; }
@media (max-width: 768px) { .config-row { flex-direction: column; gap: 16px; } }
</style>
