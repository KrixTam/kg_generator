# 知识图谱构建器 (Knowledge Graph Generator)

一个交互式 Web 应用，利用可配置的 AI 推理模型和 D3.js，将非结构化文本转化为直观可编辑的知识图谱，并支持质量审计与一键优化。

## 核心功能

- AI 智能提取：从文本识别实体（节点）及其关系（边），生成结构化 JSON。
- 多语种支持：保持原文语言，节点标签与关系不自动翻译。
- 质量审计：对有效性与完备性进行评分，输出改进建议与缺失项。
- 一键优化：根据审计建议重构图谱，补全关系与实体。
- 可视化与导出：D3 力导向图交互展示，支持导出 JSON。

## 技术栈

- 前端：React 19 + TypeScript + Vite
- 样式：Tailwind CSS v4（本地构建）
- 可视化：D3.js
- 图标库：Lucide React
- 后端：Python + FastAPI + OpenAI Python SDK
- AI 接入：OpenAI 兼容的 Chat Completions（后端配置）

## 架构

- 前端编译为静态页面，位于 `dist/`，由后端服务直接提供
- 后端提供 API：
  - `POST /api/generate`
  - `POST /api/verify`
  - `POST /api/optimize`
- 前端仅调用后端 API，不传输模型或密钥相关配置

## 后端配置

将以下环境变量配置到后端运行环境：

```
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL=模型名称或标识
```

说明：
- `OPENAI_API_KEY`：AI 服务的访问密钥（仅后端使用）
- `OPENAI_BASE_URL`：接口基础地址（默认 `https://api.openai.com/v1`）
- `MODEL`：模型标识（例如 `gpt-4o-mini` 或其他兼容模型）
 - 兼容旧变量名：`VITE_OPENAI_API_KEY`、`VITE_OPENAI_BASE_URL`、`VITE_MODEL`（后端启动时将自动读取 `.env/.env.local`）

## 项目文档

- [系统存储与接口说明](./docs/storage_interface.md)
- [系统处理逻辑说明](./docs/processing_logic.md)

## 快速开始

- 前端构建：`npm run build`
- 安装后端依赖：`pip install -r backend/requirements.txt`
- 启动后端：`uvicorn backend.app:app --port 8000`
- 访问：`http://localhost:8000/`

使用步骤：
1. 粘贴文本
2. 生成图谱
3. 验证图谱（质量审计）
4. 一键优化
5. 导出为 JSON（可导入至 Neo4j 等图数据库）
