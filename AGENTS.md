# DataInsight - AI原生智能表格数据分析可视化平台

## 项目概述

轻量化智能表格数据处理与可视化工具，依托自动数据分析能力，支持多端上传表格文件，自动生成标准化报表 + 交互式仪表盘，满足个人/企业数据统计、业务复盘、数据可视化展示需求。

核心差异化优势（对标飞书多维表格 AI）：
- **AI 单元格系统**：字段捷径（6种AI字段类型）+ AI生成公式 + 单元格智能工具栏，比飞书更强的自然语言指令+多列联合+整表上下文
- **AI 问数**：自然语言完成数据检索/统计计算/归因分析/趋势预测/分析报告（意图识别 + 多轮上下文 + 流式兜底）
- **深度数据分析引擎**：7大分析模块 + 数据健康评分 + Pearson 相关性 + 分布分析
- **指标语义层**：18个预置指标（6大场景）+ 自定义指标 + AI生成业务指标体系
- **NL2Dashboard**：对话生成业务驱动的智能仪表盘（领域知识库注入）
- **10种ECharts高级图表**：散点/箱线/热力/漏斗/桑基/瀑布/树图/仪表盘/词云/组合
- **SQL Lab**：浏览器端SQLite引擎，即席SQL查询
- **统一工作台**：3组10项精简导航，功能全部通过子Tab展开，无数据时灰化而非隐藏

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4 + CSS Variables 主题
- **数据可视化**: Recharts + ECharts (echarts-for-react)
- **文件解析**: xlsx (Excel), papaparse (CSV)
- **SQL引擎**: sql.js (浏览器端WASM)
- **AI 集成**: 用户自定义 OpenAI 兼容模型（通过 API Key + Base URL + Model Name）
- **状态持久化**: localStorage (仪表盘配置/清洗模板/建表历史/自定义指标/告警规则)

## 导航结构（4组12项）

| 分组 | 入口 | 内部子Tab |
|------|------|-----------|
| 数据 | AI建表 | — |
| 数据 | 数据表格 | 表格 / AI字段 / AI公式 / 关联表 / 自动化 / 评论 |
| 数据 | 数据准备 | 数据源 / 清洗 / 质量 |
| 分析 | 智能洞察 | 分析 / 报告 |
| 分析 | 可视化 | 仪表盘 / AI生成 / 设计器 |
| 分析 | 指标体系 | AI指标 / 指标管理 |
| 分析 | 图表中心 | AI推荐 / 高级 / ECharts |
| 工具 | AI问数 | — |
| 工具 | AI多模态 | 生图 / 图转文 / 文转图 / 图转表 |
| 工具 | 表单收集 | 表单设计 / 数据管理 |
| 工具 | SQL查询 | — |
| 工具 | 报表导出 | 报表 / 导出 / 分享 / 应用设计 |
| 设置弹窗 | — | AI模型 / 数据预警 / 版本快照 / 模板管理 / 权限 |

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── upload/            # 文件上传 API
│   │   ├── analyze/           # 数据分析 API（含深度分析引擎）
│   │   ├── metric-ai/         # AI 指标生成 API（调用 LLM 生成业务指标体系）
│   │   ├── llm-insight/       # LLM 智能洞察 API（SSE流式，意图识别+多轮上下文+流式兜底）
│   │   ├── ai-table-builder/   # AI 智能建表 API（场景模板+AI生成+迭代修改+Excel导出）
│   │   ├── nl2-dashboard/     # NL2Dashboard 智能仪表盘生成 API
│   │   ├── ai-field/           # AI 单元格字段 API（6种AI字段类型执行）
│   │   ├── ai-formula/        # AI 生成公式 API（自然语言→标准公式）
│   │   ├── database/          # 数据库连接 API（外部数据库查询）
│   │   ├── test-connection/   # AI 模型连接测试 API
│   │   ├── analysis-planner/  # AI 分析规划 API（分析方案生成）
│   │   └── alerts/            # 数据告警 API（CRUD+模板）
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx               # 主页面（精简侧边栏布局，4组12项导航）
│   └── form/                  # 表单填写独立页面
│       └── page.tsx           # 表单收集填写入口
├── components/
│   ├── ui/                    # shadcn/ui 组件库
│   ├── sidebar.tsx            # 侧边栏组件（导航定义+渲染）
│   ├── home-cards.tsx         # 首页功能卡片
│   ├── settings-dialog.tsx    # 设置弹窗（AI模型/预警/版本/模板/权限）
│   ├── async-file-uploader.tsx # 异步文件上传组件（Web Worker解析）
│   ├── data-table.tsx         # 数据表格组件（含AI字段列渲染）
│   ├── pivot-table.tsx        # 数据透视表（行/列/值字段+5种聚合）
│   ├── view-kanban.tsx        # 看板视图（拖拽分组）
│   ├── view-calendar.tsx      # 日历视图（月/周切换）
│   ├── view-gantt.tsx         # 甘特图视图（起止日期渲染）
│   ├── data-insights.tsx      # 深度数据分析组件（7大模块+AI深度分析）
│   ├── dashboard.tsx          # 自动生成交互式仪表盘（含配置持久化+联动筛选）
│   ├── enhanced-llm-assistant.tsx  # AI分析助手（真实流式API，多轮上下文）
│   ├── global-ai-assistant.tsx     # 全局AI助手（SSE流式+拖拽+操作执行）
│   ├── ai-field-panel.tsx     # AI字段配置面板（6种AI字段类型）
│   ├── ai-formula-generator.tsx # AI公式生成器（自然语言→公式+解释+采纳）
│   ├── ai-cell-toolbar.tsx    # 单元格智能工具栏（8种AI操作）
│   ├── smart-chart-recommender.tsx # AI智能图表推荐
│   ├── report-generator.tsx   # 报表生成组件（4模板+导出）
│   ├── insight-report-generator.tsx # 一键洞察报告（9模块勾选+聚合生成）
│   ├── data-cleaner.tsx       # 数据清洗组件（IQR/Z-score/模板保存）
│   ├── ai-model-settings.tsx  # AI模型配置
│   ├── ai-table-builder.tsx   # AI智能建表（场景模板+对话生成+迭代+历史）
│   ├── metric-semantic-layer.tsx  # AI 指标语义层（对话式指标生成 + 解读）
│   ├── metric-manager.tsx     # 指标管理面板（预置18指标+自定义指标）
│   ├── data-quality-checker.tsx # 数据质量检测
│   ├── data-alerting.tsx      # 数据预警（6个预置模板+自定义规则+统计面板）
│   ├── nl2-dashboard.tsx     # NL2Dashboard（流式生成+编辑）
│   ├── echarts-extensions.tsx # ECharts高级图表（10种）
│   ├── extended-chart-gallery.tsx # 扩展图表面板
│   ├── linked-tables.tsx      # 多表关联管理（关联字段+Lookup+联合查询）
│   ├── multimodal-fields.tsx  # AI多模态（生图/图转文/图转表/语音转写）
│   ├── workflow-automation.tsx # 自动化工作流（触发器+动作+规则引擎）
│   ├── row-permissions.tsx    # 行级权限（字段/行/视图三级控制）
│   ├── app-builder.tsx        # 应用模式/界面设计器（拖拽搭建+预览）
│   ├── row-comments.tsx       # 表格即文档（行内评论+头像+时间戳）
│   ├── sql-lab.tsx            # SQL Lab（浏览器端SQLite）
│   ├── version-history.tsx    # 版本快照
│   ├── template-manager.tsx   # 模板管理
│   ├── chart-exporter.tsx     # 图表导出
│   ├── dashboard-designer.tsx # 仪表盘设计器
│   ├── advanced-charts.tsx    # 高级图表
│   ├── share-manager.tsx      # 分享管理
│   ├── platform-integrations.tsx # 多平台集成面板（飞书/企微/钉钉/WPS）
│   ├── data-source-manager.tsx   # 数据源管理（含平台集成 Tab）
│   ├── form-builder.tsx        # 表单收集（15种字段+二维码+主题+规则）
│   └── error-boundary.tsx     # 错误边界组件
└── lib/
    ├── utils.ts               # 通用工具函数（cn合并className等）
    ├── request.ts             # 统一请求工具（request + streamRequest，重试/超时/取消）
    ├── llm.ts                 # LLM调用核心（callLLM + callLLMStream + callLLMStreamWithFallback）
    ├── data-processor.ts      # 数据处理+深度分析引擎+数据质量报告
    ├── ai-field-engine.ts     # AI字段引擎（6种AI字段类型检测+Prompt生成）
    ├── metric-engine.ts       # 指标计算引擎（18预置+自定义+阈值检查）
    ├── cache-manager.ts       # 缓存管理（LRU+TTL+容量控制）
    ├── session-store.ts       # 会话存储（多Tab数据共享+事件通知）
    ├── file-parser.worker.ts  # 文件解析Web Worker
    └── platform-types.ts      # 平台集成类型定义
```

## 开发命令

- **开发环境**: `pnpm dev` (端口 5000)
- **构建**: `pnpm build`
- **类型检查**: `pnpm ts-check`
- **代码检查**: `pnpm lint`

## API 接口

### POST /api/upload
上传并解析 Excel/CSV 文件

**请求**: FormData，包含 files 字段

**响应**:
```json
{
  "success": true,
  "data": [{
    "headers": ["字段1", "字段2"],
    "rows": [{ "字段1": "值1", "字段2": 100 }],
    "fileName": "data.xlsx",
    "rowCount": 100,
    "columnCount": 2
  }]
}
```

### POST /api/analyze
分析已解析的数据

**请求**:
```json
{
  "data": { "headers": [...], "rows": [...] }
}
```

**响应**:
```json
{
  "success": true,
  "analysis": {
    "fieldStats": [...],
    "summary": { "totalRows": 100, "totalColumns": 5, ... },
    "insights": ["洞察1", "洞察2"],
    "anomalies": [...]
  }
}
```

### POST /api/llm-insight
获取 AI 智能洞察（SSE 流式响应）

**请求**:
```json
{
  "message": "销售额为什么下降？",
  "data": { "headers": [...], "rows": [...] },
  "fieldStats": [{ "field": "...", "type": "number" }],
  "chatHistory": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```

**响应**: SSE 流式（text/event-stream），每个 chunk 为 `data: {content: "..."}`

**意图识别**: query/attribution/prediction/comparison/suggestion/diagnosis + greeting/chat

### POST /api/ai-table-builder
AI 智能建表（场景模板 + AI 生成 + 对话迭代 + Excel 导出）

**action=list-templates**: 获取场景模板列表（20套模板：通用5+零售5+美业5+团队5）

**action=generate**: AI 生成表格方案
```json
{
  "action": "generate",
  "userRequirement": "创建一个月度销售跟踪表",
  "sceneId": "retail-monthly-sales",
  "modelConfig": { "apiKey": "...", "baseUrl": "...", "modelName": "..." }
}
```

**action=iterate**: 对话式迭代修改方案

**action=confirm**: 确认生成 Excel 文件（.xlsx，含表头+示例数据+SUM公式+自适应列宽）

### POST /api/ai-field
AI 单元格字段执行

**请求**:
```json
{
  "action": "execute",
  "field": {
    "id": "field-1", "name": "摘要", "type": "summarize",
    "sourceColumns": ["备注"], "config": { "summarizeLength": 50 }
  },
  "context": { "rows": [...], "headers": [...], "rowIndices": [0,1,2,3,4] },
  "modelConfig": { "apiKey": "...", "baseUrl": "...", "modelName": "..." }
}
```

**AI字段类型**: extract / classify / summarize / translate / generate / image-understand

### POST /api/ai-formula
AI 生成公式

**请求**:
```json
{
  "text": "统计A列中状态为已完成的记录数",
  "modelConfig": { "apiKey": "...", "baseUrl": "...", "modelName": "..." }
}
```

**响应**:
```json
{
  "success": true,
  "data": { "formula": "COUNTIF(A:A,\"已完成\")", "explanation": "..." }
}
```

### POST /api/analysis-planner
AI 分析规划（深度分析方案生成）

**请求**:
```json
{
  "data": { "headers": [...], "rows": [...] },
  "fieldStats": [...],
  "message": "深度分析销售额下降原因"
}
```

**响应**:
```json
{
  "success": true,
  "plan": {
    "plan": ["相关性分析", "趋势分析", "归因分析"],
    "reasoning": "分析思路..."
  }
}
```

### POST /api/metric-ai
AI 智能生成指标体系

### POST /api/nl2-dashboard
NL2Dashboard 智能仪表盘生成（业务驱动）

### GET /api/alerts
获取告警模板列表（20个预置模板 + 6大分类）

### POST /api/database
数据库连接与查询

### POST /api/test-connection
AI 模型连接测试

## 注意事项

1. **文件大小限制**: 默认 50MB
2. **支持的格式**: .xlsx, .xls, .csv
3. **数据类型推断**: 自动识别数值、文本、日期字段
4. **AI 模型**: 用户通过设置页面配置 OpenAI 兼容 API（apiKey + baseUrl + modelName），所有 AI 功能共用此配置
5. **错误边界**: 关键组件已包裹 ErrorBoundary
6. **统一请求**: 使用 `src/lib/request.ts` 的 `request<T>()` 和 `streamRequest()` 进行 HTTP 请求
7. **LLM 调用**: 使用 `src/lib/llm.ts` 的 `callLLM()` / `callLLMStream()` / `callLLMStreamWithFallback()`，统一超时120秒+自动重试
8. **持久化**: 仪表盘配置、清洗模板、建表历史、自定义指标、告警规则、表单配置/收集数据、关联表配置、评论数据均存储在 localStorage
9. **WASM 依赖**: SQL Lab 使用 sql.js，WASM 文件位于 `public/sql-wasm.wasm`
10. **主题**: 使用 CSS Variables + Tailwind 语义化类名，禁止硬编码颜色
11. **懒加载**: 所有组件使用 `next/dynamic` 懒加载+SSR禁用，减少首屏编译时间
12. **AI多模态**: 图片生成使用 pollinations.ai CDN，无需API Key；图转文/图转表/语音转写需要配置AI模型
