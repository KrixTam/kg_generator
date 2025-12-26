# 系统存储与接口说明 (System Storage & Interface)

本应用采用前端状态驱动架构，数据存储位于客户端内存（React State）。AI 推理通过后端（Python + FastAPI + OpenAI SDK）提供的统一 API 完成，前端仅调用后端，不携带模型或密钥配置。

## 1. 核心数据结构 (Data Models)

### 1.1 知识图谱数据 (`GraphData`)
用于 D3.js 渲染与导出：
- `nodes: GraphNode[]`
  - `id`: 唯一标识符（字符串）
  - `label`: 显示文本
  - `type`: 实体类型（如 Person/Org/Location）
- `edges: GraphEdge[]`
  - `source`: 源节点 ID
  - `target`: 目标节点 ID
  - `relation`: 关系描述

### 1.2 验证报告结果 (`VerificationResult`)
由 AI 验证模块生成的质量评估数据：
- `validityScore`: 有效性得分 (0-100)
- `completenessScore`: 完备性得分 (0-100)
- `feedback`: 定性分析建议列表
- `missingEntities`: 建议补充的实体
- `suggestions`: 具体的优化指导策略

## 2. 状态机管理 (`ProcessingStatus`)
用于驱动页面行为的枚举：
- `IDLE`: 空闲状态
- `PROCESSING`: AI 提取中
- `VERIFYING`: 图谱审计中
- `OPTIMIZING`: 正在根据建议优化
- `SUCCESS`: 操作成功
- `ERROR`: 操作失败（携带 `errorMessage`）

## 3. 后端 API 与配置
- API（后端）：
  - `POST /api/generate` 请求体：`{ text: string, focus?: string }`；返回：`GraphData`
  - `POST /api/verify` 请求体：`{ sourceText: string, graphData: GraphData }`；返回：`VerificationResult`
  - `POST /api/optimize` 请求体：`{ sourceText: string, currentGraph: GraphData, suggestions: string }`；返回：`GraphData`
- 配置（仅后端环境变量）：
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`（默认 `https://api.openai.com/v1`）
  - `MODEL`
  - 兼容旧变量名：`VITE_OPENAI_API_KEY`、`VITE_OPENAI_BASE_URL`、`VITE_MODEL`
