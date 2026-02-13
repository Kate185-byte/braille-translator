# 中文盲文翻译工具

一个基于 Web 的中文盲文识别与翻译工具，结合 OCR 图像识别、本地盲文解析引擎和 DeepSeek 大语言模型，实现盲文到中文的智能翻译。

## 功能概览

- **盲文图片 OCR 识别** — 上传盲文图片，自动检测点位、分割字符并翻译为中文（准确度持续改进中）
- **Unicode 盲文输入翻译** — 直接输入 Unicode 盲文字符，本地即可完成拼音解析与汉字转换，无需联网
- **DeepSeek AI 智能翻译** — 接入大语言模型，对拼音进行语义消歧，显著提升翻译准确率
- **AI 辅助功能** — 拼写改进建议、文字转盲文解释、内容含义解释
- **可调节 OCR 参数** — 支持调整灵敏度、最小/最大点面积等参数以适配不同图片质量

## 项目结构

```
盲文翻译/
├── backend/
│   ├── server.js          # Express 后端服务，提供 DeepSeek API 代理
│   ├── package.json       # 后端依赖
│   ├── .env.example       # 环境变量模板
│   └── .env               # 环境变量配置（需自行填写 API Key）
├── braille-core.js        # 盲文核心引擎：拼音 ↔ 盲文点位 ↔ 汉字
├── braille-ocr.js         # OCR 引擎：图片 → 点位检测 → 字符分割 → 拼音解析
├── index.html             # 前端页面（单页应用）
├── test-braille-core.js   # 测试文件
└── 国家通用盲文符号表.md  # 盲文符号参考文档
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 Canvas、原生 JavaScript、CSS3 |
| 后端 | Node.js、Express |
| AI | DeepSeek Chat API（`deepseek-chat` 模型）|
| 盲文标准 | 中国现行盲文方案，遵循分词连写规则 |

## 快速开始

### 环境要求

- Node.js 18+
- DeepSeek API Key（可在 [DeepSeek 开放平台](https://platform.deepseek.com/) 获取）

### 安装与运行

1. 克隆项目并安装后端依赖：

```bash
cd backend
npm install
```

2. 配置 API Key：

将 `backend/.env.example` 复制为 `backend/.env`，填入你的 DeepSeek API Key：

```
DEEPSEEK_API_KEY=sk-你的密钥
PORT=3000
```

3. 启动后端服务：

```bash
cd backend
node server.js
```

服务默认运行在 `http://localhost:3000`。

4. 打开前端页面：

用浏览器直接打开 `index.html`，或通过任意 HTTP 服务器托管。

### 仅使用本地翻译（无需后端）

如果不需要 AI 功能，可以直接在浏览器中打开 `index.html`，使用 Unicode 盲文输入的本地翻译功能，无需启动后端服务。

## 工作原理

```
盲文图片 → OCR 点位检测 → 2×3 网格分割 → 拼音候选生成 → AI 语义消歧 → 中文输出
                                                                    ↑
Unicode 盲文输入 → 本地拼音解析 → 汉字映射 ──── 可选 AI 增强 ──────┘
```

核心引擎 `braille-core.js` 内置了完整的声母（21 个）、韵母（34 个）、声调（4 声 + 轻声）点位映射表，支持拼音与盲文点位的双向转换。

OCR 引擎 `braille-ocr.js` 通过灰度化、自适应阈值、形态学处理、连通域检测等步骤提取盲文点位，再结合核心引擎生成多组拼音候选，最终由 DeepSeek 模型选出语义最合理的组合。

## 后端 API

| 端点 | 用途 |
|------|------|
| `POST /api/ai-translate` | AI 盲文翻译（拼音 → 中文）|
| `POST /api/ocr-disambiguate` | OCR 拼音消歧 |
| `POST /api/suggest` | 拼写改进建议 |
| `POST /api/convert-explain` | 文字转盲文解释 |
| `POST /api/explain` | 内容含义解释 |
| `GET /api/health` | 健康检查 |

## 参与贡献

欢迎提交 Issue 和 Pull Request。以下方向尤其欢迎贡献：

- 提升 OCR 识别准确率（图像预处理、点位检测算法优化）
- 扩充拼音到汉字的本地词典
- 支持更多盲文标准或语言
- 改进前端交互体验

## 许可证

MIT
