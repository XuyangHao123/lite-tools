<template>
  <div class="file-uploader">
    <el-upload
      ref="uploadRef"
      drag
      multiple
      :auto-upload="false"
      :accept="accept"
      :on-change="handleChange"
      :on-remove="handleRemove"
      :file-list="fileList"
      :show-file-list="showFileList"
      class="upload-dragger"
    >
      <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        拖拽文件到此处，或 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">{{ tip }}</div>
      </template>
    </el-upload>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'

const props = defineProps({
  accept: { type: String, default: '.pdf' },
  tip: { type: String, default: '仅支持 PDF 文件' },
  showFileList: { type: Boolean, default: true },
  modelValue: { type: Array, default: () => [] } // v-model 绑定文件列表
})

const emit = defineEmits(['update:modelValue'])

const uploadRef = ref()
const fileList = ref([...props.modelValue])

// 同步外部变化
watch(() => props.modelValue, (val) => {
  fileList.value = [...val]
})

function handleChange(file, files) {
  fileList.value = files
  emit('update:modelValue', files)
}

function handleRemove(file, files) {
  fileList.value = files
  emit('update:modelValue', files)
}

/** 清空文件列表（父组件可调用） */
function clearFiles() {
  uploadRef.value?.clearFiles()
  fileList.value = []
  emit('update:modelValue', [])
}

defineExpose({ clearFiles })
</script>

<style scoped>
.upload-dragger {
  width: 100%;
}

.upload-dragger :deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 20px;
}

.upload-dragger :deep(.el-upload__tip) {
  color: #909399;
  font-size: 13px;
}
</style>
