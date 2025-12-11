# 通用知识图谱生成器（LLM 驱动）

一个交互式 Web 应用，可将非结构化文本与文档自动抽取为可视化的知识图谱。现已支持通过配置选择更通用的接口与模型（包括 OpenAI 与 Google Gemini），并使用 **D3.js** 进行图形渲染。

## 🌟 主要特性

- **AI 抽取**：从任意文本中智能识别实体（节点）与关系（边），支持选择供应商与模型。
- **文档支持**：内置解析与上传能力：
  - **PDF**（`.pdf`）使用 `pdfjs-dist` 在浏览器端解析。
  - **Markdown/纯文本**（`.md`, `.txt`）。
  - **HTML**（`.html`）。
- **交互式可视化**：使用 **D3.js** 实现力导向图，支持缩放、拖拽、高亮与节点详情。
- **现代化 UI**：React 19 + TypeScript + Tailwind CSS（支持暗色模式）。

## 🛠️ 技术栈

- **前端框架**：React 19（函数式组件与 Hooks）。
- **语言**：TypeScript。
- **AI 接口**：
  - OpenAI REST API（`/v1/chat/completions`，强制 `response_format: json_object`）。
  - Google Gemini（`@google/genai` SDK）。
- **可视化**：D3.js（力模拟、缩放与拖拽）。
- **样式**：Tailwind CSS。
- **文件解析**：`pdfjs-dist` 与原生 DOM 解析。

## 📂 项目结构

```text
├── index.html              # 入口 HTML（Tailwind CDN, Import Maps）
├── index.tsx               # React 入口
├── App.tsx                 # 主布局与状态管理
├── types.ts                # 类型定义（GraphNode, GraphEdge）
├── metadata.json           # 应用元信息
├── components/
│   ├── InputSection.tsx    # 文本输入与文件上传
│   └── ForceGraph.tsx      # D3.js 可视化组件
└── services/
    ├── aiService.ts        # 通用 LLM 提供商路由与提示工程
    └── fileService.ts      # 浏览器端文件解析（PDF/HTML/MD）
```

## 🚀 快速开始

1. 安装依赖：
   - `npm install`
2. 开发运行：
   - `npm run dev`
3. 构建生产（可选，若 `pdfjs-dist` 目标环境要求较高，建议先使用开发模式验证）：
   - `npm run build`

## ⚙️ 配置（供应商、模型与接口地址）

通过环境变量选择 AI 供应商与模型，无需改动代码：

- 供应商：
  - `VITE_AI_PROVIDER` 或 `AI_PROVIDER`
  - 取值：`gemini` 或 `openai`
- 模型：
  - `VITE_MODEL` 或 `MODEL`
  - 默认：`gemini` 使用 `gemini-2.5-flash`，`openai` 使用 `gpt-4o-mini`
- API Key（按优先级读取）：
  - OpenAI：`VITE_OPENAI_API_KEY` → `OPENAI_API_KEY` → `VITE_API_KEY` → `API_KEY`
  - Gemini：`VITE_GEMINI_API_KEY` → `GEMINI_API_KEY` → `VITE_API_KEY` → `API_KEY`

- 接口地址（OpenAI 可配置 Base URL）：
  - `VITE_OPENAI_BASE_URL` 或 `OPENAI_BASE_URL` 或通用 `VITE_BASE_URL`/`BASE_URL`
  - 默认：`https://api.openai.com/v1`

示例（使用 OpenAI）：

```bash
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_MODEL=gpt-4o-mini
```

示例（使用 Gemini）：

```bash
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=...
VITE_MODEL=gemini-2.5-flash
```

## 🧠 提示策略（Prompt Strategy）

系统指令确保模型以严格 JSON 输出，便于直接用于 D3 渲染。策略包括：

1. 识别并去重关键实体（人物、组织、地点、概念、日期等）。
2. 合并同义或重复实体。
3. 为每个实体标注类型（如：Person, Org, Event）。
4. 关系仅在已存在的节点 ID 之间建立。
5. 保持原文语言输出：`label` 与 `relation` 字段不做翻译（中文输入保留中文输出）。

## 📘 使用方法

- 粘贴文本到输入框。
- 上传文件（PDF/HTML/Markdown）。
- 点击“Generate Graph”。
- 在图中拖拽节点、滚轮缩放、点击查看详情。

## 🔒 密钥安全建议

在生产环境中不建议将 API Key 直接暴露到前端。推荐使用后端或边缘代理安全转发请求并进行密钥管理。

---

*使用通用 LLM 接口构建的知识图谱可视化工具*
