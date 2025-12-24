# 系统存储与接口说明 (System Storage & Interface)

本应用采用前端状态驱动架构，所有数据存储均位于客户端内存中（React State），并通过标准化的 JSON 结构与 Gemini API 进行交互。

## 1. 核心数据结构 (Data Models)

### 1.1 知识图谱数据 (`GraphData`)
这是系统的核心存储对象，用于 D3.js 渲染和导出。
- `nodes: GraphNode[]`: 节点列表。
  - `id`: 唯一标识符（字符串）。
  - `label`: 显示文本。
  - `type`: 实体类型（如：Person, Org, Location）。
- `edges: GraphEdge[]`: 关系列表。
  - `source`: 源节点 ID。
  - `target`: 目标节点 ID。
  - `relation`: 关系描述。

### 1.2 验证报告结果 (`VerificationResult`)
存储由 Gemini 3 Pro 生成的质量评估数据。
- `validityScore`: 有效性得分 (0-100)。
- `completenessScore`: 完备性得分 (0-100)。
- `feedback`: 定性分析建议列表。
- `missingEntities`: 识别出的缺失实体。
- `suggestions`: 具体的优化指导策略。

## 2. 状态机管理 (`ProcessingStatus`)
系统通过枚举值严格控制 UI 表现：
- `IDLE`: 空闲状态，等待输入。
- `PROCESSING`: 正在进行 AI 实体提取。
- `VERIFYING`: 正在进行图谱一致性审计。
- `OPTIMIZING`: 正在应用审计建议重构图谱。
- `SUCCESS`: 最近一次操作成功。
- `ERROR`: 发生异常（存储错误消息于 `errorMessage`）。

## 3. 外部接口协议
- **Input**: 原始文本 (String) + 分析侧重点 (String)。
- **Output**: 符合特定 JSON Schema 的图谱数据，支持导出为 `.json` 文件以便导入 Neo4j。
