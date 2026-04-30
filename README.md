<p align="center">
  <h1 align="center">DataInsight</h1>
  <p align="center">
    <strong>AI 原生智能表格数据分析可视化平台</strong>
  </p>
  <p align="center">
    上传表格 → AI 自动分析 → 生成仪表盘与报告，全流程零代码
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/ECharts-5-red?logo=apache-echarts" alt="ECharts" />
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
  </p>
</p>

---

## 核心能力

### 🏗 AI 智能建表

没有数据？对话即建表。20 套场景模板覆盖通用/零售/美业/团队，或直接用自然语言描述需求，AI 自动生成含表头、示例数据、SUM 公式的 Excel 表格，支持对话迭代修改后一键导出。

### 📊 深度数据分析

上传 Excel/CSV 后，7 大分析模块自动运行：

- **数据健康评分** — 完整性/一致性/时效性综合打分
- **关键发现提取** — 异常值/趋势拐点/强相关关系自动识别
- **Pearson 相关性** — 字段间相关系数矩阵 + 热力图
- **分布分析** — 偏度/峰度/正态性检验
- **趋势检测** — 线性/指数拟合 + 走势判断
- **图表智能推荐** — 基于数据特征自动推荐最佳可视化
- **行动建议生成** — 从数据洞察到业务决策

**一键洞察报告** — 9 大模块自由勾选，一键聚合生成完整结构化报告，支持打印/PDF 导出。

### 📈 智能可视化

**自动仪表盘** — 数据上传后自动生成交互式仪表盘，KPI 卡片 + 6 种基础图表，全图表联动筛选，配置持久化。

**NL2Dashboard** — 用自然语言描述业务需求，AI 自动生成业务驱动的智能仪表盘，支持对话式迭代调整图表类型/布局/指标。

**10 种 ECharts 高级图表**

| 散点图 | 箱线图 | 热力图 | 漏斗图 | 桑基图 |
|:------:|:------:|:------:|:------:|:------:|
| 相关性分析 | 分布与异常 | 相关性矩阵 | 转化流程 | 流向路径 |

| 瀑布图 | 树图 | 仪表盘 | 词云 | 组合图 |
|:------:|:----:|:------:|:----:|:------:|
| 增减变化 | 层级占比 | KPI 完成度 | 文本频率 | 双轴混合 |

### 🤖 AI 问数

基于 LLM 的自然语言数据问答，SSE 流式实时输出：

- **6 种意图识别** — 查询/归因/预测/对比/建议/诊断 + 闲聊兜底
- **多轮对话上下文** — 自动携带历史问答，支持追问和深入分析
- **流式兜底重试** — 首模型失败自动切换备选模型

### 🎯 指标语义层

**18 个预置指标**（5 大场景开箱即用）

| 零售电商 | 用户运营 | 财务管理 | 人力资源 | 通用分析 |
|:--------:|:--------:|:--------:|:--------:|:--------:|
| GMV / 客单价 / 复购率 | DAU / 留存率 / LTV | 毛利率 / 费用率 | 人效 / 离职率 | 同比 / 环比 / 增长率 |

- **自定义指标** — 公式编辑 + 字段依赖 + 阈值告警
- **AI 指标语义层** — 对话式指标生成 + 深度解读 + 场景自动适配

### 🛠 更多能力

| 功能 | 说明 |
|:-----|:-----|
| **SQL Lab** | 浏览器端 SQLite 引擎（sql.js WASM），即席查询 + 结果导出 CSV/JSON |
| **智能告警** | 6 个预置模板 + 自定义阈值/同比/环比规则 + 统计面板 |
| **报表导出** | 4 种报表模板 + PDF/Excel/打印导出 + 分享管理 |
| **数据准备** | 多源上传（Excel/CSV）+ 自动清洗（去重/缺失值/异常检测）+ 数据质量检测 |
| **AI 模型配置** | 支持 DeepSeek/豆包/Kimi/通义千问/OpenAI 等所有 OpenAI 兼容 API |

---

## 亮点功能

### 🧠 AI 单元格系统

将飞书「AI 字段捷径」「AI 生成公式」「单元格智能工具栏」三大能力深度融合并增强，是当前开源领域最完善的表格 AI 能力。

**AI 字段捷径 — 新建一列，点选即用**

| 字段类型 | 核心作用 | 示例 |
|:---------|:---------|:-----|
| 信息提取 | 从非结构化文本精准提取指定信息 | 从「客户备注」自动提取手机号、地址、意向产品 |
| 智能分类 | 按规则自动打标签/分类 | 「订单金额」按区间分为低/中/高客单 |
| 内容总结 | 对长文本精简总结 | 「项目进展」大段文本自动总结为 100 字核心进度 |
| 智能翻译 | 多语言自动互译 | 英文客户名称/地址自动翻译为中文 |
| 内容生成 | 基于现有数据自动生成合规内容 | 基于「产品名+价格+卖点」自动生成推广文案 |
| 图片理解 | 识别图片内容并提取结构化数据 | 从「合同扫描件」自动提取金额、日期、签署方 |

> 增强特性：自然语言指令 `=AI("分析相关性", A:A, B:B)` · 多列联合分析 · 整表数据自动上下文 · 预览 5 行确认后全列生效 · 增量更新只处理变更行

**AI 生成公式** — 说话即公式，自然语言 → `SUMIF`/`COUNTIFS`/`VLOOKUP`/`INDEX-MATCH` 等标准公式 + 逻辑解释 + 一键采纳

**单元格智能工具栏** — 选中文本即刻 AI，8 种操作（填充/润色/翻译/总结/扩写/纠错/简化/转列表）× 6 种语气风格

---

## 导航结构

精简 3 组 10 项入口，每个入口通过子 Tab 展开详细功能：

| 分组 | 入口 | 子 Tab |
|:----:|:----:|:------:|
| 数据 | AI 建表 | — |
| 数据 | 数据表格 | 表格 / AI 字段 / AI 公式 |
| 数据 | 数据准备 | 数据源 / 清洗 / 质量 |
| 分析 | 智能洞察 | 分析 / 报告 |
| 分析 | 可视化 | 仪表盘 / AI 生成 / 设计器 |
| 分析 | 指标体系 | AI 指标 / 指标管理 |
| 分析 | 图表中心 | AI 推荐 / 高级 / ECharts |
| 工具 | AI 问数 | — |
| 工具 | SQL 查询 | — |
| 工具 | 报表导出 | 报表 / 导出 / 分享 |
| ⚙ 设置 | — | AI 模型 / 数据预警 / 版本快照 / 模板管理 |

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/iflykingc-oss/DataInsight.git
cd DataInsight

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev          # http://localhost:5000

# 构建生产版本
pnpm build
pnpm start
```

### 代码质量检查

```bash
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint 代码检查
```

---

## 技术栈

| 层级 | 技术 | 版本 | 用途 |
|:----:|:-----|:----:|:-----|
| 框架 | Next.js (App Router) | 16 | 全栈框架 |
| UI | React | 19 | 组件化 UI |
| 语言 | TypeScript | 5 | 类型安全 |
| 组件库 | shadcn/ui (Radix UI) | - | 40+ 精细组件 |
| 样式 | Tailwind CSS | 4 | 原子化样式 + CSS Variables 主题 |
| 基础图表 | Recharts | - | 折线/柱状/饼图/KPI卡片 |
| 高级图表 | ECharts (echarts-for-react) | 5 | 散点/箱线/热力/漏斗/桑基等 10 种 |
| SQL 引擎 | sql.js | - | 浏览器端 WASM SQLite |
| 文件解析 | xlsx + papaparse | - | Excel/CSV 解析与生成 |
| AI 集成 | OpenAI Compatible API | - | 豆包/DeepSeek/Kimi/通义/OpenAI 等 |

---

## 项目架构

```
src/
├── app/
│   ├── api/                     # 后端 API 路由（11个）
│   │   ├── upload/              #   文件上传与解析
│   │   ├── analyze/             #   数据深度分析
│   │   ├── llm-insight/         #   AI 智能洞察（SSE 流式）
│   │   ├── ai-field/            #   AI 单元格字段执行
│   │   ├── ai-formula/          #   AI 公式生成
│   │   ├── ai-table-builder/    #   AI 智能建表
│   │   ├── metric-ai/           #   AI 指标生成
│   │   ├── nl2-dashboard/       #   AI 仪表盘生成
│   │   ├── database/            #   外部数据库连接
│   │   ├── test-connection/     #   AI 模型连接测试
│   │   └── alerts/              #   数据告警
│   ├── globals.css              # 全局样式 + CSS 变量主题
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 主页面（精简侧边栏 + 子Tab路由）
├── components/
│   ├── ui/                      # shadcn/ui 组件库
│   ├── sidebar.tsx              # 侧边栏导航（3组10项）
│   ├── home-cards.tsx           # 首页功能卡片
│   ├── settings-dialog.tsx      # 设置弹窗（AI模型/预警/版本/模板）
│   ├── data-table.tsx           # 数据表格（含 AI 字段列渲染）
│   ├── ai-field-panel.tsx       # AI 字段配置面板（6种AI类型）
│   ├── ai-formula-generator.tsx # AI 公式生成器
│   ├── ai-cell-toolbar.tsx      # 单元格智能工具栏（8种AI操作）
│   ├── data-insights.tsx        # 深度数据分析（7大模块）
│   ├── insight-report-generator.tsx # 一键洞察报告（9模块勾选）
│   ├── dashboard.tsx            # 交互式仪表盘
│   ├── nl2-dashboard.tsx        # NL2Dashboard 对话生成
│   ├── dashboard-designer.tsx   # 仪表盘设计器
│   ├── echarts-extensions.tsx   # ECharts 高级图表（10种）
│   ├── extended-chart-gallery.tsx # 扩展图表面板
│   ├── metric-semantic-layer.tsx # AI 指标语义层
│   ├── metric-manager.tsx       # 指标管理面板
│   ├── sql-lab.tsx              # SQL Lab（浏览器端 SQLite）
│   ├── data-alerting.tsx        # 智能告警
│   ├── enhanced-llm-assistant.tsx # AI 分析助手（有数据时）
│   ├── global-ai-assistant.tsx  # 全局 AI 助手（拖拽移动）
│   ├── ai-table-builder.tsx     # AI 智能建表
│   ├── async-file-uploader.tsx  # 异步文件上传（Web Worker）
│   ├── data-cleaner.tsx         # 数据清洗
│   ├── data-quality-checker.tsx # 数据质量检测
│   ├── report-generator.tsx     # 报表生成
│   ├── share-manager.tsx        # 分享管理
│   ├── data-source-manager.tsx  # 数据源管理
│   ├── platform-integrations.tsx # 多平台集成
│   └── error-boundary.tsx       # 错误边界
└── lib/
    ├── utils.ts                 # 通用工具（cn 等）
    ├── request.ts               # 统一请求（request + streamRequest）
    ├── llm.ts                   # LLM 调用核心（callLLM + callLLMStream + callLLMStreamWithFallback）
    ├── data-processor.ts        # 数据处理 + 深度分析引擎
    ├── ai-field-engine.ts       # AI 字段引擎（6种类型检测 + Prompt 生成）
    ├── metric-engine.ts         # 指标计算引擎（18预置 + 自定义）
    ├── cache-manager.ts         # LRU 缓存管理
    ├── session-store.ts         # 多 Tab 会话存储
    ├── file-parser.worker.ts    # 文件解析 Web Worker
    └── platform-types.ts        # 平台集成类型定义
```

---

## AI 模型配置

所有 AI 功能共用一套模型配置，在「设置 → AI 模型」中配置：

| 配置项 | 说明 |
|:------:|:-----|
| API Key | 模型服务密钥 |
| Base URL | OpenAI 兼容 API 地址 |
| Model Name | 模型名称 |

**已验证兼容的模型服务：**

| 服务商 | Base URL | 推荐模型 |
|:------:|:---------|:---------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 豆包（字节） | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` |
| Kimi（月之暗面） | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| 任意 OpenAI 兼容 API | 对应地址 | 对应模型名 |

---

## API 接口

| 接口 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/upload` | POST | 上传并解析 Excel/CSV 文件 |
| `/api/analyze` | POST | 分析已解析的数据 |
| `/api/llm-insight` | POST | AI 智能洞察（SSE 流式） |
| `/api/ai-field` | POST | AI 单元格字段执行 |
| `/api/ai-formula` | POST | AI 生成公式 |
| `/api/ai-table-builder` | POST | AI 智能建表 |
| `/api/metric-ai` | POST | AI 指标生成 |
| `/api/nl2-dashboard` | POST | AI 仪表盘生成 |
| `/api/database` | POST | 外部数据库连接与查询 |
| `/api/test-connection` | POST | AI 模型连接测试 |
| `/api/alerts` | GET | 获取告警模板列表 |

---

## 开发规范

- **包管理器**：必须使用 `pnpm`，禁止 npm/yarn
- **样式**：使用 Tailwind CSS 语义化类名（`bg-background`/`text-foreground`），禁止硬编码颜色
- **组件**：优先使用 shadcn/ui 组件
- **请求**：使用 `src/lib/request.ts` 的 `request` / `streamRequest`
- **LLM**：使用 `src/lib/llm.ts` 的 `callLLM` / `callLLMStream` / `callLLMStreamWithFallback`
- **类型**：禁止 `any`，所有函数参数必须标注类型
- **持久化**：仪表盘配置/清洗模板/建表历史/自定义指标/告警规则均存储在 localStorage

---

## License

[MIT](LICENSE)
