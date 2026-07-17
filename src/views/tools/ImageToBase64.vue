<template>
  <ToolLayout title="图片转 Base64" desc="免费在线将图片转换为Base64编码，支持JPG/PNG/WebP，可直接用于HTML/CSS，本地处理。">
    <div class="img-to-base64">
      <FileUploader ref="uploaderRef" v-model="fileList" :show-file-list="false" accept=".jpg,.jpeg,.png,.webp,.gif,.bmp" tip="上传图片自动转为 Base64 编码" />

      <template v-if="result">
        <!-- 图片信息 -->
        <div class="info-row">
          <el-tag type="info">文件名：{{ fileList[0]?.name }}</el-tag>
          <el-tag type="info">大小：{{ formatSize(result.size) }}</el-tag>
          <el-tag type="info">Base64长度：{{ result.length }}</el-tag>
        </div>

        <!-- 预览 -->
        <div class="preview-section">
          <label class="config-title">图片预览</label>
          <img :src="result.dataUrl" class="preview-img" alt="预览" />
        </div>

        <!-- Base64 代码 -->
        <div class="code-section">
          <div class="code-header">
            <label class="config-title">Base64 编码</label>
            <el-radio-group v-model="outputMode" size="small">
              <el-radio-button value="raw">纯Base64</el-radio-button>
              <el-radio-button value="dataUrl">Data URL</el-radio-button>
              <el-radio-button value="css">CSS background</el-radio-button>
            </el-radio-group>
          </div>
          <el-input :model-value="outputCode" type="textarea" :rows="6" readonly />
          <el-button type="primary" :icon="CopyDocument" @click="copyCode" style="margin-top:8px">复制</el-button>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import FileUploader from '@/components/FileUploader.vue'
import ToolLayout from '@/components/ToolLayout.vue'

const fileList = ref([])
const uploaderRef = ref()
const result = ref(null)
const outputMode = ref('dataUrl')

watch(fileList, async (files) => {
  if (files.length === 0) { result.value = null; return }
  const file = files[0]
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result
    result.value = {
      dataUrl,
      size: file.size,
      length: dataUrl.length
    }
  }
  reader.readAsDataURL(file.raw)
})

const outputCode = computed(() => {
  if (!result.value) return ''
  const dataUrl = result.value.dataUrl
  if (outputMode.value === 'raw') return dataUrl.split(',')[1] || ''
  if (outputMode.value === 'css') return `background-image: url('${dataUrl}');`
  return dataUrl
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

async function copyCode() {
  if (!outputCode.value) return
  try { await navigator.clipboard.writeText(outputCode.value); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.img-to-base64 { display: flex; flex-direction: column; gap: 20px; }
.info-row { display: flex; gap: 8px; flex-wrap: wrap; }
.preview-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.preview-img { max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #ebeef5; }
.code-section { display: flex; flex-direction: column; gap: 8px; }
.code-header { display: flex; align-items: center; justify-content: space-between; }
</style>
