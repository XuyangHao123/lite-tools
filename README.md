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

> 部署前需修改以下文件中的域名占位符 `your-username`：
> - `public/robots.txt`
> - `public/sitemap.xml`

## 新增工具

1. 在 `src/views/tools/` 下创建新组件
2. 在 `src/data/tools.js` 的 `tools` 数组追加一项
3. 在 `public/sitemap.xml` 追加对应 `<url>`

路由和首页卡片会自动生成。

## 已有工具

- ✅ 二维码生成器（`/qr-generator`）

## 规划中工具

- 密码生成器
- Base64 编解码
- JSON 格式化
- 单位换算
- BMI 计算器
- 头像生成器

## 变现方式

- 广告位（国内广告联盟，流量达标后接入）
- 部分高级功能付费解锁（批量处理、高清导出等）
