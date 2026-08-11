/**
 * 工具通用状态外壳（消除 12 处重复的 fileList/uploaderRef/processing + try/catch 样板）
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * @param {object} opts
 * @param {boolean} opts.multi 是否多文件（默认 true）
 */
export function useToolState(opts = {}) {
  const fileList = ref([])
  const uploaderRef = ref()
  const processing = ref(false)

  /**
   * 包装一个异步任务：自动管理 processing、错误提示
   * @param {Function} task
   * @param {string} actionName 操作名称（如「合并」「压缩」），用于错误提示
   */
  async function run(task, actionName = '操作') {
    processing.value = true
    try {
      await task()
    } catch (e) {
      console.error(e)
      ElMessage.error(`${actionName}失败：${e?.message || e}`)
    } finally {
      processing.value = false
    }
  }

  /** 清空文件列表，可附加额外清理逻辑 */
  function clearAll(extra) {
    uploaderRef.value?.clearFiles?.()
    fileList.value = []
    if (typeof extra === 'function') extra()
  }

  return { fileList, uploaderRef, processing, run, clearAll }
}
