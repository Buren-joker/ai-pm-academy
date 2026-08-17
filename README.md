# AI 产品经理学堂 🧭

从「工小智」智能客服到 AI 产品经理的转型学习网站。

- **零依赖**:纯 HTML/CSS/JS,双击 `index.html` 即可本地打开
- **实时资讯**:「AI 资讯台」模块通过公共代理实时聚合 8 个信息源(量子位、少数派、InfoQ、爱范儿、雷锋网、OpenAI、Google AI、Hacker News),缓存 45 分钟
- **进度追踪**:学习进度自动保存在浏览器 localStorage

## 内容结构(7 个模块 / 34 节课)

| 模块 | 内容 |
|---|---|
| 🗺️ 入门与学习路线图 | 转型定位、三阶段计划、工小智能力迁移地图 |
| 🧠 AI 核心概念 | LLM、Prompt、RAG、Agent、微调、多模态、评测、成本 |
| 🎨 AI 产品设计 | 对话体验、人机协同、智能客服方法论、指标体系、从 0 到 1 |
| 🏙️ 行业格局与商业化 | 国内外格局、场景地图、金融 AI、商业模式 |
| 💼 求职准备 | 简历重写、工小智案例复盘、面试 30 问、外企英文专题、谈薪 |
| 📚 学习资源 | 书单、课程、信息源、动手实践清单 |
| 🚀 前沿与热点 | 追踪方法论、DeepSeek Harness 拆解、新闻转谈资 |
| 📡 AI 资讯台(实时) | 8 个信息源实时聚合 |

## 本地打开

双击 `index.html`,或:

```sh
cd ai-pm-academy && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 部署到 GitHub Pages(免费)

1. 在 github.com 新建一个 **Public** 仓库(如 `ai-pm-academy`)
2. 推送代码:

```sh
git remote add origin https://github.com/<你的用户名>/ai-pm-academy.git
git push -u origin main
```

3. 仓库 **Settings → Pages → Source 选 Deploy from a branch → main / root**,保存
4. 几分钟后访问 `https://<你的用户名>.github.io/ai-pm-academy/`

也可以使用 Vercel / Netlify:把本目录拖进去即可,零配置。

## 内容更新

内容全部是 `js/content-*.js` 里的结构化数据,改完推送即可生效:

- 更新课程:`js/content-roadmap.js` 等 5 个文件,按现有格式追加 lesson / blocks
- 更新资讯源:编辑 `js/app.js` 里的 `NEWS_FEEDS` 数组
- 支持的内容块:`h2 h3 p ul ol table callout code quiz quote`
  (callout 类型:`tip warn case term exam`)

## 目录结构

```
ai-pm-academy/
├── index.html          # 页面骨架
├── css/style.css       # 样式
├── js/
│   ├── app.js          # 路由/导航/进度/搜索/资讯台
│   ├── content-roadmap.js
│   ├── content-concepts.js
│   ├── content-design.js
│   ├── content-career.js
│   └── content-frontier.js
└── deploy.sh           # 一键部署脚本
```
