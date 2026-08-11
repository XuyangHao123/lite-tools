# Lite工具站

面向国内中文用户的免费在线工具集合，纯前端实现，数据不上传服务器。

## 技术栈

- Vue 3 + Vite
- Element Plus（UI 组件库）
- qrcode.js（二维码生成）
- Vue Router（路由 + SEO meta 动态设置）
- GitHub Pages（免费托管）
- GitHub Actions（自动部署）

## 本地开发

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 http://localhost:5173/lite-tools/
npm run build    # 构建生产版本到 dist/
npm run preview  # 预览构建产物
```

## 部署到 GitHub Pages

1. 在 GitHub 创建名为 `lite-tools` 的仓库
2. 将代码推送到 main 分支
3. GitHub Actions 会自动构建并部署
4. 在仓库 Settings → Pages 中确认 Source 为 "GitHub Actions"
5. 访问 `https://XuyangHao123.github.io/lite-tools/`

> 域名已在 `public/robots.txt`、`public/sitemap.xml`、`index.html`、`public/manifest.webmanifest` 中写死为 `xuyanghao123`。若 fork 本项目自用，请全局替换为新用户名。

## 新增工具

1. 在 `src/views/tools/` 下创建新组件
2. 在 `src/data/tools.js` 的 `tools` 数组追加一项
3. 运行 `node scripts/gen-sitemap.mjs`（或手动在 `public/sitemap.xml` 追加 `<url>`）

路由、首页卡片、sitemap 会自动同步（前两者来自 `tools.js`，sitemap 见上）。

## 已有工具（33 个）

- **PDF 工具**：合并 / 拆分 / 压缩 / 旋转 / 转图片 / 转矢量图 / 图片转 PDF
- **图片工具**：压缩 / 格式转换 / 裁剪缩放 / 颜色选择器 / 加水印 / 拼接 / 转 Base64
- **文本工具**：字数统计 / Base64 / URL 编解码 / JSON 格式化 / 正则测试 / 文本对比 / 代码压缩 / 汉字转拼音 / 进制转换 / CSS 渐变
- **生成器**：二维码生成 / 密码生成 / UUID 生成 / 二维码识别
- **计算器**：单位换算 / BMI / 房贷 / 时间戳 / 日期计算

## 站点特性

- 全站搜索 + 最近使用 + 收藏夹（localStorage）
- 深色模式（跟随系统 + 手动切换）
- PWA 可安装（manifest）
- SEO：每页动态 title/description/keywords、OG、canonical、sitemap、JSON-LD 预留
- 性能：路由懒加载 + 重库（pdf-lib/pdfjs）按需懒加载，首页不预加载 PDF 库

## 变现方式

- 广告位（国内广告联盟，流量达标后接入）
- 部分高级功能付费解锁（批量处理、高清导出等）
