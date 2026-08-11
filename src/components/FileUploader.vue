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
      :show-file-list="!sortable"
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

    <!-- 可拖拽排序的文件列表（sortable=true 时显示） -->
    <div v-if="sortable && fileList.length" class="sortable-list">
      <div
        v-for="(file, index) in fileList"
        :key="file.uid || file.name + index"
        class="sortable-item"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent="onDragOver(index)"
        @dragleave="onDragLeave"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <el-icon class="drag-handle"><Rank /></el-icon>
        <span class="file-name">{{ file.name }}</span>
        <span class="file-size">{{ formatSize(file.size) }}</span>
        <el-icon class="remove-btn" @click="removeAt(index)"><Close /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { UploadFilled, Rank, Close } from '@element-plus/icons-vue'
import { formatSize } from '@/utils/format'

const props = defineProps({
  accept: { type: String, default: '.pdf' },
  tip: { type: String, default: '仅支持 PDF 文件' },
  showFileList: { type: Boolean, default: true },
  sortable: { type: Boolean, default: false }, // 开启可拖拽排序
  modelValue: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'reorder'])

const uploadRef = ref()
const fileList = ref([...props.modelValue])

watch(
  () => props.modelValue,
  (val) => {
    fileList.value = [...val]
  }
)

function handleChange(file, files) {
  fileList.value = files
  emit('update:modelValue', files)
}

function handleRemove(file, files) {
  fileList.value = files
  emit('update:modelValue', files)
}

function clearFiles() {
  uploadRef.value?.clearFiles()
  fileList.value = []
  emit('update:modelValue', [])
}

// ===== 拖拽排序（原生 HTML5） =====
let dragIndex = -1

function onDragStart(index) {
  dragIndex = index
  // 视觉反馈
}

function onDragOver(index) {
  if (dragIndex === index) return
  const arr = [...fileList.value]
  const [moved] = arr.splice(dragIndex, 1)
  arr.splice(index, 0, moved)
  dragIndex = index
  fileList.value = arr
  emit('update:modelValue', arr)
  emit('reorder', arr)
}

function onDragLeave() {
  // 由 dragover 处理
}

function onDrop() {
  dragIndex = -1
}

function onDragEnd() {
  dragIndex = -1
}

function removeAt(index) {
  const arr = [...fileList.value]
  arr.splice(index, 1)
  fileList.value = arr
  emit('update:modelValue', arr)
  emit('reorder', arr)
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
  color: var(--color-text-secondary, #909399);
  font-size: 13px;
}

.sortable-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sortable-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 6px;
  cursor: grab;
  user-select: none;
}

.sortable-item:active {
  cursor: grabbing;
}

.drag-handle {
  color: var(--color-text-secondary, #909399);
  font-size: 16px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  color: var(--color-text-primary, #303133);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: var(--color-text-secondary, #909399);
  font-size: 12px;
  flex-shrink: 0;
}

.remove-btn {
  color: var(--color-text-placeholder, #c0c4cc);
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}

.remove-btn:hover {
  color: #f56c6c;
}
</style>
