<template>
  <span class="json-tree">
    <!-- 基本类型：直接渲染 -->
    <template v-if="isPrimitive">
      <span :class="['leaf', leafClass]">{{ leafText }}</span>
    </template>

    <!-- 对象 / 数组：可折叠 -->
    <template v-else>
      <span class="toggle" @click="toggle">
        <el-icon class="toggle-icon" :class="{ expanded }">
          <ArrowRight />
        </el-icon>
      </span>
      <span class="bracket open" @click="toggle">{{ openBracket }}</span>

      <!-- 折叠态：显示 {...} / [...] 并附数量提示 -->
      <span v-if="!expanded" class="collapsed-hint">
        {{ closeBracket }}<span v-if="countHint" class="count-hint">{{ countHint }}</span>
      </span>

      <!-- 展开态：递归渲染子节点 -->
      <template v-else>
        <span class="children">
          <span
            v-for="(item, idx) in entries"
            :key="idx"
            class="child"
            :style="{ paddingLeft: indentStr }"
          >
            <span v-if="isObject" class="key">"{{ item.key }}"</span>
            <span v-if="isObject" class="colon">: </span>
            <JsonTree
              :ref="(el) => setChildRef(el, idx)"
              :data="item.value"
              :indent-size="indentSize"
              :default-expand="defaultExpand"
            />
            <span v-if="idx < entries.length - 1" class="comma">,</span>
          </span>
        </span>
        <span class="bracket close" :style="{ paddingLeft: parentIndent }">{{ closeBracket }}</span>
      </template>
    </template>
  </span>
</template>

<script>
// 递归组件需显式声明 name，方可在模板中自引用 <JsonTree>
export default { name: 'JsonTree' }
</script>

<script setup>
import { ref, computed, watch, nextTick, provide, inject } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  data: { type: null, required: true },
  indentSize: { type: Number, default: 2 },
  defaultExpand: { type: Boolean, default: false }
})

// 当前节点深度（根节点为 0），由父组件通过 provide/inject 传递
const depth = inject('jsonTreeDepth', ref(0))
// 向子节点 provide 深度 + 1
provide('jsonTreeDepth', computed(() => depth.value + 1))

// 父级缩进（用于闭合括号回退一层）
const parentIndent = computed(() => ' '.repeat(Math.max(0, depth.value * props.indentSize)))
const indentStr = computed(() => ' '.repeat(props.indentSize))

// 折叠状态：对象/数组节点独立维护
const expanded = ref(props.defaultExpand)

const isObject = computed(() => isPlainObject(props.data))
const isArray = computed(() => Array.isArray(props.data))
const isPrimitive = computed(() => !isObject.value && !isArray.value)

const openBracket = computed(() => (isArray.value ? '[' : '{'))
const closeBracket = computed(() => (isArray.value ? ']' : '}'))

const entries = computed(() => {
  if (isObject.value) {
    return Object.keys(props.data).map((k) => ({ key: k, value: props.data[k] }))
  }
  if (isArray.value) {
    return props.data.map((v, i) => ({ key: String(i), value: v }))
  }
  return []
})

const countHint = computed(() => {
  const n = entries.value.length
  return n === 0 ? '' : `${n} 项`
})

const leafText = computed(() => {
  const v = props.data
  if (v === null) return 'null'
  if (typeof v === 'string') return `"${v}"`
  return String(v)
})

const leafClass = computed(() => {
  const v = props.data
  if (v === null) return 'leaf-null'
  if (typeof v === 'string') return 'leaf-string'
  if (typeof v === 'number') return 'leaf-number'
  if (typeof v === 'boolean') return 'leaf-boolean'
  return ''
})

function toggle() {
  expanded.value = !expanded.value
}

// 子组件实例收集，用于 setAll 递归
const childRefs = ref([])
function setChildRef(el, idx) {
  if (el) childRefs.value[idx] = el
}

// defaultExpand 变化时同步（用于父组件全部展开/收起时重置）
watch(
  () => props.defaultExpand,
  (val) => {
    expanded.value = val
  }
)

// 暴露递归设置全部节点展开状态的方法
function setAll(val) {
  expanded.value = val
  nextTick(() => {
    childRefs.value.forEach((child) => {
      if (child && typeof child.setAll === 'function') {
        child.setAll(val)
      }
    })
  })
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

defineExpose({ setAll, toggle })
</script>

<style scoped>
.json-tree {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  display: inline;
  white-space: pre-wrap;
  word-break: break-all;
}

.toggle {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
  margin-right: 2px;
}

.toggle-icon {
  font-size: 12px;
  color: #909399;
  transition: transform 0.15s ease;
  transform: rotate(0deg);
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.bracket {
  color: #303133;
  font-weight: 600;
}

.bracket.open,
.bracket.close {
  cursor: pointer;
}

.collapsed-hint {
  color: #c0c4cc;
  margin: 0 2px;
}

.count-hint {
  color: #909399;
  font-size: 11px;
  margin-left: 4px;
  background: #f4f4f5;
  border-radius: 3px;
  padding: 1px 6px;
}

.children {
  display: block;
}

.child {
  display: block;
}

.key {
  color: #409eff;
}

.colon {
  color: #303133;
}

.comma {
  color: #303133;
}

.leaf-string {
  color: #67c23a;
}

.leaf-number {
  color: #e6a23c;
}

.leaf-boolean {
  color: #f56c6c;
}

.leaf-null {
  color: #909399;
}
</style>
