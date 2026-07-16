<template>
  <ToolLayout title="二维码生成器" desc="免费在线生成二维码，支持自定义颜色、尺寸、容错级别，可下载高清PNG。">
    <div class="qr-generator">
      <!-- 左侧：输入与配置 -->
      <div class="qr-config">
        <el-form label-position="top" size="default">
          <!-- 输入内容 -->
          <el-form-item label="二维码内容">
            <el-input
              v-model="qrText"
              type="textarea"
              :rows="4"
              placeholder="输入文本或网址，自动生成二维码"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <!-- 尺寸 -->
          <el-form-item label="尺寸（像素）">
            <el-slider
              v-model="qrSize"
              :min="128"
              :max="1024"
              :step="32"
              show-input
              :show-input-controls="false"
            />
          </el-form-item>

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

          <!-- 容错级别 -->
          <el-form-item label="容错级别">
            <el-radio-group v-model="qrLevel">
              <el-radio-button value="L">L (7%)</el-radio-button>
              <el-radio-button value="M">M (15%)</el-radio-button>
              <el-radio-button value="Q">Q (25%)</el-radio-button>
              <el-radio-button value="H">H (30%)</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <!-- 下载按钮 -->
          <el-form-item>
            <el-button type="primary" :icon="Download" @click="downloadPng" :disabled="!qrText">
              下载 PNG
            </el-button>
            <el-button @click="reset" :disabled="!qrText">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧：预览 -->
      <div class="qr-preview">
        <div class="preview-box">
          <canvas ref="canvasRef"></canvas>
          <div v-if="!qrText" class="preview-empty">
            <el-icon :size="48"><Picture /></el-icon>
            <p>输入内容后自动生成二维码</p>
          </div>
        </div>
        <p class="preview-tip">提示：容错级别越高，二维码越复杂，抗污损能力越强。</p>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { Download, Picture } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import ToolLayout from '@/components/ToolLayout.vue'

// 二维码内容与样式配置
const qrText = ref('')
const qrSize = ref(256)
const qrFgColor = ref('#000000')
const qrBgColor = ref('#ffffff')
const qrLevel = ref('M')

const canvasRef = ref(null)

/** 生成二维码到 canvas */
async function renderQr() {
  if (!qrText.value) return
  await nextTick()
  if (!canvasRef.value) return

  await QRCode.toCanvas(canvasRef.value, qrText.value, {
    width: qrSize.value,
    margin: 2,
    errorCorrectionLevel: qrLevel.value,
    color: {
      dark: qrFgColor.value,
      light: qrBgColor.value
    }
  })
}

/** 下载 PNG */
async function downloadPng() {
  if (!qrText.value) return
  await renderQr()
  const canvas = canvasRef.value
  if (!canvas) return

  const link = document.createElement('a')
  link.download = `qrcode-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/** 重置 */
function reset() {
  qrText.value = ''
  qrSize.value = 256
  qrFgColor.value = '#000000'
  qrBgColor.value = '#ffffff'
  qrLevel.value = 'M'
}

// 任意配置变化时重新渲染
watch([qrText, qrSize, qrFgColor, qrBgColor, qrLevel], renderQr, {
  immediate: true
})

onMounted(() => {
  if (qrText.value) renderQr()
})
</script>

<style scoped>
.qr-generator {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
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
  color: #909399;
  font-family: monospace;
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
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
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
  color: #c0c4cc;
}

.preview-empty p {
  font-size: 13px;
}

.preview-tip {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
}

@media (max-width: 768px) {
  .qr-generator {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .color-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
