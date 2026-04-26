# DataInsight - 智能表格数据处理与可视化工具

## 项目概述

轻量化智能表格数据处理与可视化工具，依托自动数据分析能力，支持多端上传表格文件，自动生成标准化报表 + 交互式仪表盘，满足个人/企业数据统计、业务复盘、数据可视化展示需求。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据可视化**: Recharts
- **文件解析**: xlsx (Excel), papaparse (CSV)
- **AI 集成**: coze-coding-dev-sdk (LLM)

## 核心功能

### 1. 多端表格上传能力
- Web 端网页上传
- 支持文件格式：Excel（.xlsx/.xls）、CSV
- 支持单文件/批量文件上传
- 自动校验文件格式、数据完整性

### 2. 自动数据处理与分析能力
- 自动数据清洗：去重、空值处理、异常值检测、标准化
- 自动数据分析：基础统计（求和/均值/计数/占比）+ 深度分析
- 深度分析引擎：
  - 业务场景识别（中英文关键词匹配，识别零售/电商/用户运营/库存/财务/人力/教育/生产等8大行业）
  - 细分场景推断（日销跟踪/商品分析/客户分析/区域分析/留存分析/转化漏斗等）
  - 数据特征识别（数据规模/周期特征/特殊事件检测）
  - 数据健康评分（完整性/一致性/质量/可用性，0-100分）
  - 关键发现（严重/警告/提示/正面，含影响+建议）
  - Pearson 相关性分析
  - 分布分析（偏度/峰度/正态性检验）
  - 趋势分析（上升/下降/波动/稳定）
  - 智能图表推荐（6种图表类型+推荐理由+优先级）
  - 行业化行动建议（按本周/本月/本季度分层，含预期收益）
  - 数据画像（自动推测数据类型/行业/细分场景/成熟度/分析潜力）
- 自动字段识别：智能识别表格表头、数据维度、指标字段、业务指标语义

### 3. 交互式仪表盘视图能力
- 自动生成可视化仪表盘（KPI卡片、柱状图、折线图、饼图、面积图、雷达图）
- 智能字段类型识别（数值/文本/日期自动分类）
- 数据自动聚合（按分类字段聚合统计）
- 维度筛选、图表类型切换
- 支持仪表盘自定义配置

### 4. 智能报表生成能力
- 一键生成标准化统计报表（含深度分析内容）
- 支持报表模板选择（汇总/业务/财务/运营）
- 报表实时预览（7大分析模块）
- 打印/PDF导出
- Excel导出（含数据+统计摘要两个Sheet）

### 5. AI 智能分析（业务导向）
- 基于 LLM 的自然语言数据问答（SSE 流式输出）
- 接入真实大语言模型 API（doubao-seed-2-0-lite）
- **业务锚点优先**：Prompt工程让AI先识别业务场景再做分析
- **分层分析框架**：原始数据结论 + 清洗后结论 + 置信度标注
- **场景定制化**：根据数据特征（小样本/短周期/大促窗口期）调整分析策略
- **短期可落地方案**：按本周/本月/本季度分层，优先低成本方案
- **价值挖掘导向**：20%数据现状 → 30%业务洞察 → 50%可执行建议
- 预设6种业务化分析维度：趋势与机会/业务洞察/优化方案/风险与预警/数据诊断/全面诊断

### 6. 多平台数据源集成（Beta）
- 飞书多维表格：App ID + Secret + App Token 配置，4步集成指南，数据实时同步
- 企业微信：Corp ID + Agent ID + Secret，对接组织成员和业务数据
- 钉钉：App Key + App Secret，支持考勤/审批/任务数据导入
- 金山文档（WPS）：API Key + Secret，导入云文档表格数据
- 各平台均有连接配置、集成指南、数据预览三个子标签

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── upload/          # 文件上传 API
│   │   ├── analyze/         # 数据分析 API（含深度分析引擎）
│   │   └── llm-insight/     # LLM 智能洞察 API（SSE流式）
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx             # 主页面（RuoYi风格布局）
├── components/
│   ├── ui/                  # shadcn/ui 组件库
│   ├── file-uploader.tsx    # 文件上传组件
│   ├── data-table.tsx       # 数据表格组件
│   ├── data-insights.tsx    # 深度数据分析组件（7大模块）
│   ├── dashboard.tsx        # 自动生成交互式仪表盘
│   ├── enhanced-llm-assistant.tsx  # AI助手（真实流式API）
│   ├── smart-chart-recommender.tsx # AI智能图表推荐
│   ├── report-generator.tsx # 报表生成组件（4模板+导出）
│   ├── data-cleaner.tsx     # 数据清洗组件
│   ├── ai-model-settings.tsx      # AI模型配置
│   ├── metric-semantic-layer.tsx  # 指标语义层
│   ├── data-quality-checker.tsx   # 数据质量检测
│   ├── data-alerting.tsx          # 数据预警
│   ├── nl2-dashboard.tsx          # NL2Dashboard
│   ├── version-history.tsx        # 版本快照
│   ├── template-manager.tsx       # 模板管理
│   ├── chart-exporter.tsx         # 图表导出
│   ├── dashboard-designer.tsx     # 仪表盘设计器
│   ├── advanced-charts.tsx        # 高级图表
│   ├── share-manager.tsx          # 分享管理
│   ├── feishu-integration.tsx     # 飞书集成（已整合到 platform-integrations）
│   ├── platform-integrations.tsx   # 多平台集成面板（飞书/企微/钉钉/WPS）
│   ├── data-source-manager.tsx     # 数据源管理（含平台集成 Tab）
│   └── global-ai-assistant.tsx    # 全局AI助手
└── lib/
    ├── utils.ts             # 通用工具函数
    └── data-processor.ts    # 数据处理+深度分析引擎
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
  "data": { /* ParsedData */ }
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

## 注意事项

1. **文件大小限制**: 默认 50MB
2. **支持的格式**: .xlsx, .xls, .csv
3. **数据类型推断**: 自动识别数值、文本、日期字段
4. **AI 分析**: 使用 doubao-seed-2-0-lite 模型，流式输出
