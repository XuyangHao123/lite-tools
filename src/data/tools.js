/**
 * 工具元数据
 * 每新增一个工具，在此数组追加一项即可自动出现在首页和路由中。
 * 字段说明：
 *  - key:       唯一标识，同时作为路由 path
 *  - name:      工具名称（中文）
 *  - desc:      简短描述（用于首页卡片 + SEO description）
 *  - keywords:  关键词（用于 SEO）
 *  - icon:      Element Plus 图标名（首页卡片用）
 *  - component: 路由懒加载的组件路径
 *  - category:  工具分类（用于首页分组展示）
 */
export const tools = [
  // ===== PDF 工具 =====
  {
    key: 'pdf-merge',
    name: 'PDF 合并',
    desc: '免费在线合并多个PDF文件为一个，支持拖拽排序，本地处理不上传服务器。',
    keywords: 'PDF合并,合并PDF,在线合并PDF,免费PDF工具',
    icon: 'Plus',
    category: 'PDF工具',
    component: () => import('@/views/tools/PdfMerge.vue')
  },
  {
    key: 'pdf-split',
    name: 'PDF 拆分',
    desc: '免费在线拆分PDF文件，支持按页码范围提取、每页拆分、按间隔拆分，本地处理。',
    keywords: 'PDF拆分,拆分PDF,PDF分割,在线PDF工具',
    icon: 'Minus',
    category: 'PDF工具',
    component: () => import('@/views/tools/PdfSplit.vue')
  },
  {
    key: 'pdf-compress',
    name: 'PDF 压缩',
    desc: '免费在线压缩PDF文件大小，通过优化结构移除冗余数据减小体积，本地处理。',
    keywords: 'PDF压缩,压缩PDF,PDF减小体积,在线PDF工具',
    icon: 'Compress',
    category: 'PDF工具',
    component: () => import('@/views/tools/PdfCompress.vue')
  },
  {
    key: 'pdf-rotate',
    name: 'PDF 旋转',
    desc: '免费在线旋转PDF页面，支持90/180/270度旋转，所有页面或指定页面，本地处理。',
    keywords: 'PDF旋转,旋转PDF,旋转页面,在线PDF工具',
    icon: 'RefreshRight',
    category: 'PDF工具',
    component: () => import('@/views/tools/PdfRotate.vue')
  },
  {
    key: 'pdf-to-image',
    name: 'PDF 转图片',
    desc: '免费在线将PDF每页转换为JPG/PNG/SVG矢量图，支持选择分辨率，矢量图可无损缩放，本地处理不上传。',
    keywords: 'PDF转图片,PDF转JPG,PDF转PNG,PDF转SVG,PDF转矢量图,在线PDF工具',
    icon: 'Picture',
    category: 'PDF工具',
    component: () => import('@/views/tools/PdfToImage.vue')
  },
  {
    key: 'pdf-to-vector',
    name: 'PDF 转矢量图',
    desc: '免费在线将PDF转换为SVG/DXF/EPS矢量图格式，矢量内容可无损缩放、可编辑，适合CAD/印刷/设计，本地处理。',
    keywords: 'PDF转矢量图,PDF转SVG,PDF转DXF,PDF转EPS,PDF转CAD,在线PDF工具',
    icon: 'Aim',
    category: 'PDF工具',
    component: () => import('@/views/tools/PdfToVector.vue')
  },
  {
    key: 'img-to-pdf',
    name: '图片转 PDF',
    desc: '免费在线将图片(JPG/PNG)转换为PDF文件，支持多图合并、页面方向设置，本地处理。',
    keywords: '图片转PDF,JPG转PDF,PNG转PDF,在线PDF工具',
    icon: 'Document',
    category: 'PDF工具',
    component: () => import('@/views/tools/ImgToPdf.vue')
  },
  // ===== 生成器工具 =====
  {
    key: 'qr-generator',
    name: '二维码生成器',
    desc: '免费在线生成二维码，支持自定义颜色、尺寸、容错级别，可下载高清PNG。',
    keywords: '二维码生成器,QR码,在线生成二维码,免费二维码',
    icon: 'Grid',
    category: '生成器',
    component: () => import('@/views/tools/QrGenerator.vue')
  },
  {
    key: 'password-generator',
    name: '密码生成器',
    desc: '免费在线生成随机密码，支持自定义长度和字符类型，使用加密安全随机数，本地生成不上传。',
    keywords: '密码生成器,随机密码,强密码生成,密码工具',
    icon: 'Lock',
    category: '生成器',
    component: () => import('@/views/tools/PasswordGenerator.vue')
  },
  // ===== 文本工具 =====
  {
    key: 'base64',
    name: 'Base64 编解码',
    desc: '免费在线 Base64 编码与解码工具，支持文本双向转换和中文（UTF-8），本地运行安全可靠。',
    keywords: 'Base64,编码,解码,Base64转换,在线工具',
    icon: 'Key',
    category: '文本工具',
    component: () => import('@/views/tools/Base64Tool.vue')
  },
  {
    key: 'json-formatter',
    name: 'JSON 格式化',
    desc: '免费在线 JSON 格式化、压缩、校验工具，支持错误提示和缩进设置，开发者必备。',
    keywords: 'JSON格式化,JSON压缩,JSON校验,JSON美化,在线工具',
    icon: 'Document',
    category: '文本工具',
    component: () => import('@/views/tools/JsonFormatter.vue')
  },
  // ===== 计算器工具 =====
  {
    key: 'unit-converter',
    name: '单位换算',
    desc: '免费在线单位换算工具，支持长度、重量、温度、面积等多种单位互转，快速准确。',
    keywords: '单位换算,长度换算,重量换算,温度换算,面积换算,在线工具',
    icon: 'ScaleToOriginal',
    category: '计算器',
    component: () => import('@/views/tools/UnitConverter.vue')
  },
  {
    key: 'bmi-calculator',
    name: 'BMI 计算器',
    desc: '免费在线 BMI 身体质量指数计算器，输入身高体重即可计算，附中国标准健康范围参考。',
    keywords: 'BMI计算器,身体质量指数,体重计算,健康工具',
    icon: 'FirstAidKit',
    category: '计算器',
    component: () => import('@/views/tools/BmiCalculator.vue')
  }
]

/** 根据 key 获取工具信息 */
export function getTool(key) {
  return tools.find((t) => t.key === key)
}

/** 获取所有分类（按出现顺序） */
export function getCategories() {
  const cats = []
  for (const t of tools) {
    if (!cats.includes(t.category)) cats.push(t.category)
  }
  return cats
}
