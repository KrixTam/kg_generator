# 系统存储与接口说明 (System Storage & Interface)

本应用采用前端状态驱动架构，数据存储位于客户端内存（React State），并通过统一的 JSON 结构与可配置的 AI 推理接口进行交互（OpenAI 兼容的 Chat Completions）。

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

## 3. 外部接口协议与配置
- 输入：原始文本 (String)，可选分析侧重点 (String)
- 输出：符合统一 JSON Schema 的图谱数据，可导出为 `.json` 用于 Neo4j 等图数据库
- 配置（环境变量）：
  - `VITE_OPENAI_API_KEY`
  - `VITE_OPENAI_BASE_URL`（默认 `https://api.openai.com/v1`）
  - `VITE_MODEL`
