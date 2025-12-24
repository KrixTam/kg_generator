# 系统处理逻辑说明 (System Processing Logic)

本系统实现了“提取-验证-优化”的闭环知识加工链路，利用不同级别的 Gemini 模型执行特定任务。

## 1. 核心业务流程

### 1.1 文档解析逻辑 (`fileService.ts`)
- **PDF**: 使用 `pdfjs-dist` 在浏览器端解析，提取各页文本并合并。
- **HTML**: 使用原生 `DOMParser` 去除 `script` 和 `style` 标签，提取干净的文本。
- **Plain Text**: 直接读取。

### 1.2 图谱生成逻辑 (`aiService.ts`)
- **模型**: `gemini-3-flash-preview`。
- **逻辑**: 通过 `SYSTEM_INSTRUCTION` 定义实体识别规则。使用强制 JSON Schema 确保输出结构化，自动处理实体合并（Consolidation）和语言对齐（保持原意，不自动翻译）。

### 1.3 质量审计逻辑 (`aiService.ts`)
- **模型**: `gemini-3-pro-preview`（利用其更强的推理能力）。
- **优化**: 引入了详细的评分准则（Scoring Rubric），强制要求定量分数与定性评价逻辑一致，避免“评价好但分数低”的现象。
- **缓存策略**: 在 `App.tsx` 中，如果已存在验证报告，系统会弹出自定义对话框，询问用户是“查看旧报告”还是“重新执行审计”，以节省 API 调用。

### 1.4 一键优化逻辑 (`aiService.ts`)
- **模型**: `gemini-3-flash-preview`。
- **逻辑**: 将“原文 + 当前图谱 + 审计建议”作为上下文发送给 AI。AI 执行差异化更新，补全缺失节点，修正错误关系，返回重构后的完整 JSON。

## 2. 可视化渲染逻辑 (`ForceGraph.tsx`)
- **引擎**: D3.js Force Simulation。
- **物理特性**:
  - `charge`: 节点间相互排斥，防止重叠。
  - `collide`: 碰撞检测，确保标签可读。
  - `link`: 基于关系的拉力，使结构紧凑。
- **交互**: 支持缩放、平移、节点拖拽（带有物理冷却逻辑）及实时统计展示。
