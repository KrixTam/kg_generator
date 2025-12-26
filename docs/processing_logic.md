# 系统处理逻辑说明 (System Processing Logic)

本系统实现了“提取 → 验证 → 优化”的闭环知识加工链路。前端负责交互与可视化，AI 推理由后端（Python + FastAPI + OpenAI SDK）提供统一接口。

## 1. 核心业务流程

### 1.1 输入与预处理
- 当前版本由 `InputSection` 组件收集文本输入并传递到 AI 服务。
- 如需扩展文件解析（PDF/HTML/Markdown），可在组件或服务层集成解析逻辑；PDF 建议使用 `pdfjs-dist`。

### 1.2 图谱生成逻辑 (`services/aiService.ts`)
- 前端调用后端 `POST /api/generate`（请求体：`{ text, focus }`），后端返回标准化的图谱 JSON。
- 系统指令定义实体识别与关系抽取规则；输出严格遵循统一 Schema。
- 保持原文语言，不进行自动翻译。

### 1.3 质量审计逻辑 (`services/aiService.ts`)
- 前端调用后端 `POST /api/verify`（请求体：`{ sourceText, graphData }`），对图谱进行有效性与完备性审计。
- 评分与定性反馈需一致；返回“缺失实体”“改进建议”等结构化结果。
- UI 缓存策略：如果已存在验证报告，点击“验证图谱”将先弹出确认弹窗，用户可选择“重新生成报告”或“查看现有报告”。

### 1.4 一键优化逻辑 (`services/aiService.ts`)
- 前端调用后端 `POST /api/optimize`（请求体：`{ sourceText, currentGraph, suggestions }`），根据审计建议进行差异化重构。
- 产出完整且一致的图谱 JSON，修正无效关系并补全缺失信息。

### 1.5 后端配置与静态资源
- 后端环境变量：
  - `OPENAI_API_KEY`、`OPENAI_BASE_URL`（默认 `https://api.openai.com/v1`）、`MODEL`
  - 兼容旧变量名：`VITE_OPENAI_API_KEY`、`VITE_OPENAI_BASE_URL`、`VITE_MODEL`
- 前端构建产物位于 `dist/`，由后端静态服务直接提供

## 2. 可视化渲染逻辑 (`components/ForceGraph.tsx`)
- 引擎：D3 Force Simulation。
- 物理特性：
  - `charge`：节点间排斥，避免重叠。
  - `collide`：碰撞检测，提升标签可读性。
  - `link`：基于边关系的拉力，提升结构紧凑度。
- 交互：支持缩放、平移、节点拖拽（包含冷却逻辑）与实时统计。
