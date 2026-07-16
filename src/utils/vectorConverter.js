/**
 * 矢量图格式转换器
 * 将 canvas2svg 生成的 SVG 转换为其他矢量格式
 * 支持：SVG / DXF / EPS
 * 所有转换纯前端实现，无需后端
 */
import C2S from 'canvas2svg'

/**
 * 将 PDF 页面渲染为 SVG 字符串
 * @param {Object} page - pdfjs 页面对象
 * @returns {Promise<string>} SVG 字符串
 */
export async function renderPageToSvg(page) {
  const viewport = page.getViewport({ scale: 1 })
  const width = Math.ceil(viewport.width)
  const height = Math.ceil(viewport.height)

  const c2s = new C2S({ width, height })
  await page.render({ canvasContext: c2s, viewport }).promise

  let svgString = c2s.getSerializedSvg()
  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  return svgString
}

/**
 * 将 SVG 字符串转换为 DXF 格式
 * DXF 是 CAD 绘图交换格式，纯文本
 * 解析 SVG 中的 path/line/rect/polyline 等元素，转为 DXF 实体
 * @param {string} svgString - SVG 字符串
 * @param {number} width - 页面宽度
 * @param {number} height - 页面高度
 * @returns {string} DXF 文本
 */
export function svgToDxf(svgString, width, height) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svg = doc.documentElement

  const entities = []

  // DXF 坐标系原点在左下角，SVG 在左上角，需要翻转 Y 轴
  const flipY = (y) => height - y

  // 解析 <path> 的 d 属性，提取 moveTo/lineTo
  const paths = svg.querySelectorAll('path')
  paths.forEach((path) => {
    const d = path.getAttribute('d')
    if (!d) return
    const points = parsePathCommands(d)
    if (points.length < 2) return

    // 转为 DXF LWPOLYLINE 实体
    const vertices = points.map((p) => `${p.x.toFixed(2)},${flipY(p.y).toFixed(2)}`)
    entities.push(makeLwpolyline(vertices))
  })

  // 解析 <line>
  const lines = svg.querySelectorAll('line')
  lines.forEach((line) => {
    const x1 = parseFloat(line.getAttribute('x1')) || 0
    const y1 = parseFloat(line.getAttribute('y1')) || 0
    const x2 = parseFloat(line.getAttribute('x2')) || 0
    const y2 = parseFloat(line.getAttribute('y2')) || 0
    entities.push(makeLine(x1, flipY(y1), x2, flipY(y2)))
  })

  // 解析 <rect>
  const rects = svg.querySelectorAll('rect')
  rects.forEach((rect) => {
    const x = parseFloat(rect.getAttribute('x')) || 0
    const y = parseFloat(rect.getAttribute('y')) || 0
    const w = parseFloat(rect.getAttribute('width')) || 0
    const h = parseFloat(rect.getAttribute('height')) || 0
    // 矩形转为四条线
    entities.push(makeLine(x, flipY(y), x + w, flipY(y)))
    entities.push(makeLine(x + w, flipY(y), x + w, flipY(y + h)))
    entities.push(makeLine(x + w, flipY(y + h), x, flipY(y + h)))
    entities.push(makeLine(x, flipY(y + h), x, flipY(y)))
  })

  // 解析 <polyline> / <polygon>
  const polys = svg.querySelectorAll('polyline, polygon')
  polys.forEach((poly) => {
    const points = poly.getAttribute('points')
    if (!points) return
    const coords = points.trim().split(/\s+|,/).map(parseFloat)
    const vertices = []
    for (let i = 0; i < coords.length - 1; i += 2) {
      vertices.push(`${coords[i].toFixed(2)},${flipY(coords[i + 1]).toFixed(2)}`)
    }
    if (vertices.length >= 2) {
      entities.push(makeLwpolyline(vertices))
    }
  })

  return buildDxf(entities, width, height)
}

/**
 * 解析 SVG path 的 d 属性，提取所有点坐标
 * 支持 M/m (moveTo), L/l (lineTo), H/h, V/v, Z/z
 */
function parsePathCommands(d) {
  const points = []
  const regex = /([MLHVZmlhvz])\s*([\d\s.,eE+-]*)/g
  let match
  let lastX = 0
  let lastY = 0
  let cmd = ''

  while ((match = regex.exec(d)) !== null) {
    const command = match[1]
    const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(parseFloat)

    switch (command) {
      case 'M':
      case 'L':
        for (let i = 0; i < args.length - 1; i += 2) {
          lastX = args[i]
          lastY = args[i + 1]
          points.push({ x: lastX, y: lastY })
        }
        cmd = command
        break
      case 'm':
      case 'l':
        for (let i = 0; i < args.length - 1; i += 2) {
          lastX += args[i]
          lastY += args[i + 1]
          points.push({ x: lastX, y: lastY })
        }
        cmd = command
        break
      case 'H':
        lastX = args[0]
        points.push({ x: lastX, y: lastY })
        break
      case 'h':
        lastX += args[0]
        points.push({ x: lastX, y: lastY })
        break
      case 'V':
        lastY = args[0]
        points.push({ x: lastX, y: lastY })
        break
      case 'v':
        lastY += args[0]
        points.push({ x: lastX, y: lastY })
        break
      case 'Z':
      case 'z':
        // 闭合路径，不添加新点
        break
    }
  }
  return points
}

/** 生成 DXF LWPOLYLINE 实体 */
function makeLwpolyline(vertices) {
  let entity = '0\nLWPOLYLINE\n'
  entity += '8\n0\n'           // 图层
  entity += '90\n' + vertices.length + '\n'  // 顶点数
  entity += '70\n0\n'          // 标志（0=开放）
  for (const v of vertices) {
    const [x, y] = v.split(',')
    entity += `10\n${x}\n20\n${y}\n`
  }
  return entity
}

/** 生成 DXF LINE 实体 */
function makeLine(x1, y1, x2, y2) {
  return `0\nLINE\n8\n0\n10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n`
}

/** 构建完整 DXF 文件 */
function buildDxf(entities, width, height) {
  const header = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1014\n9\n$INSBASE\n10\n0.0\n20\n0.0\n30\n0.0\n0\nENDSEC\n`
  const entitiesSection = `0\nSECTION\n2\nENTITIES\n${entities.join('')}0\nENDSEC\n`
  const tables = `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n1\n0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n`
  const eof = '0\nEOF\n'
  return header + tables + entitiesSection + eof
}

/**
 * 将 SVG 字符串转换为 EPS (Encapsulated PostScript) 格式
 * EPS 是印刷行业标准矢量格式，纯文本
 * @param {string} svgString - SVG 字符串
 * @param {number} width - 页面宽度
 * @param {number} height - 页面高度
 * @returns {string} EPS 文本
 */
export function svgToEps(svgString, width, height) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')
  const svg = doc.documentElement

  // EPS 坐标系原点在左下角，需要翻转 Y 轴
  const flipY = (y) => height - y

  let body = ''

  // 解析 path
  svg.querySelectorAll('path').forEach((path) => {
    const d = path.getAttribute('d')
    if (!d) return
    const points = parsePathCommands(d)
    if (points.length < 2) return
    body += 'newpath\n'
    body += `${points[0].x.toFixed(2)} ${flipY(points[0].y).toFixed(2)} moveto\n`
    for (let i = 1; i < points.length; i++) {
      body += `${points[i].x.toFixed(2)} ${flipY(points[i].y).toFixed(2)} lineto\n`
    }
    body += 'stroke\n'
  })

  // 解析 line
  svg.querySelectorAll('line').forEach((line) => {
    const x1 = parseFloat(line.getAttribute('x1')) || 0
    const y1 = parseFloat(line.getAttribute('y1')) || 0
    const x2 = parseFloat(line.getAttribute('x2')) || 0
    const y2 = parseFloat(line.getAttribute('y2')) || 0
    body += 'newpath\n'
    body += `${x1.toFixed(2)} ${flipY(y1).toFixed(2)} moveto\n`
    body += `${x2.toFixed(2)} ${flipY(y2).toFixed(2)} lineto\n`
    body += 'stroke\n'
  })

  // 解析 rect
  svg.querySelectorAll('rect').forEach((rect) => {
    const x = parseFloat(rect.getAttribute('x')) || 0
    const y = parseFloat(rect.getAttribute('y')) || 0
    const w = parseFloat(rect.getAttribute('width')) || 0
    const h = parseFloat(rect.getAttribute('height')) || 0
    body += 'newpath\n'
    body += `${x.toFixed(2)} ${flipY(y).toFixed(2)} moveto\n`
    body += `${(x + w).toFixed(2)} ${flipY(y).toFixed(2)} lineto\n`
    body += `${(x + w).toFixed(2)} ${flipY(y + h).toFixed(2)} lineto\n`
    body += `${x.toFixed(2)} ${flipY(y + h).toFixed(2)} lineto\n`
    body += 'closepath\nstroke\n'
  })

  // 解析 polyline / polygon
  svg.querySelectorAll('polyline, polygon').forEach((poly) => {
    const points = poly.getAttribute('points')
    if (!points) return
    const coords = points.trim().split(/\s+|,/).map(parseFloat)
    if (coords.length < 4) return
    body += 'newpath\n'
    body += `${coords[0].toFixed(2)} ${flipY(coords[1]).toFixed(2)} moveto\n`
    for (let i = 2; i < coords.length - 1; i += 2) {
      body += `${coords[i].toFixed(2)} ${flipY(coords[i + 1]).toFixed(2)} lineto\n`
    }
    if (poly.tagName.toLowerCase() === 'polygon') {
      body += 'closepath\n'
    }
    body += 'stroke\n'
  })

  // 构建 EPS 文件
  const header = `%!PS-Adobe-3.0 EPSF-3.0\n`
    + `%%BoundingBox: 0 0 ${Math.ceil(width)} ${Math.ceil(height)}\n`
    + `%%HiResBoundingBox: 0 0 ${width.toFixed(2)} ${height.toFixed(2)}\n`
    + `%%Creator: Lite工具站\n`
    + `%%Title: PDF to EPS\n`
    + `%%Pages: 1\n`
    + `%%EndComments\n`
    + `%%Page: 1 1\n`
    + `1 setlinewidth\n`
    + `0 setgray\n`

  const footer = '\nshowpage\n%%EOF\n'

  return header + body + footer
}
