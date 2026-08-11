/**
 * PDF 引擎统一封装
 * - pdf-lib / pdfjs 均懒加载，避免在首页预加载（修复 vite manualChunks 静态依赖问题）
 * - pdfjs workerSrc 只在此设置一次
 * - 统一处理加密 PDF（ignoreEncryption）
 * - 统一 parseRange 页码解析
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

let pdfjsPromise = null
let pdfLibPromise = null

/** 懒加载 pdf-lib（用于合并/拆分/旋转/压缩/图片转PDF 的写操作） */
export function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import('pdf-lib').then((m) => {
      const { PDFDocument } = m
      return { PDFDocument, ...m }
    })
  }
  return pdfLibPromise
}

/** 懒加载 pdfjs（用于渲染/转图片/转矢量，并设置 workerSrc） */
export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })()
  }
  return pdfjsPromise
}

/**
 * 读取 PDF 总页数（统一 4 处 watch 逻辑）
 * @param {File} file
 * @returns {Promise<number>}
 */
export async function getPdfPageCount(file) {
  const buf = await file.arrayBuffer()
  // 优先用 pdfjs（更宽容，能读加密/损坏文件并给出页数）
  try {
    const pdfjs = await loadPdfjs()
    const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise
    const n = doc.numPages
    doc.destroy()
    return n
  } catch (e) {
    // 降级 pdf-lib
    const { PDFDocument } = await loadPdfLib()
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
    return doc.getPageCount()
  }
}

/**
 * 解析页码范围字符串，如 "1-3,5,7-9" → [1,2,3,5,7,8,9]
 * @param {string} str
 * @param {number} max 最大页码
 * @returns {number[]}
 */
export function parsePageRange(str, max) {
  if (!str) return []
  const set = new Set()
  for (const part of str.split(',')) {
    const s = part.trim()
    if (!s) continue
    const dash = s.split('-')
    if (dash.length === 2) {
      let a = parseInt(dash[0], 10)
      let b = parseInt(dash[1], 10)
      if (isNaN(a) || isNaN(b)) throw new Error(`页码格式错误：${s}`)
      if (a > b) [a, b] = [b, a]
      for (let i = a; i <= b; i++) {
        if (i >= 1 && i <= max) set.add(i)
      }
    } else {
      const n = parseInt(s, 10)
      if (isNaN(n)) throw new Error(`页码格式错误：${s}`)
      if (n >= 1 && n <= max) set.add(n)
      else throw new Error(`页码超出范围：${n}（共 ${max} 页）`)
    }
  }
  return [...set].sort((a, b) => a - b)
}

/** 用法示例的响应式页数读取（带错误提示） */
export function usePdfPageCount() {
  const totalPages = ref(0)
  async function read(file) {
    if (!file) {
      totalPages.value = 0
      return
    }
    try {
      totalPages.value = await getPdfPageCount(file)
    } catch (e) {
      totalPages.value = 0
      ElMessage.error('无法读取 PDF 文件')
    }
  }
  return { totalPages, read }
}
