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

### 🛡️ 权限管理系统

- **管理员账号分配**：用户账户由管理员统一创建，无公开注册
- **功能权限控制**：7个功能开关（AI分析、导出、仪表盘、分享、上传、表单收集、自定义AI模型）
- **用户管理**：管理员可查看用户列表、登录记录、使用统计
- **AI模型配置**：管理员统一配置AI模型，用户可自定义（需管理员授权）

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

### 📖 数据故事 (Data Storytelling)

AI 自动发现数据中的关键洞察，将复杂数据转化为引人入胜的叙事故事：

- **5 段式叙事结构** — 标题页 → 执行摘要 → 详细洞察 → 分区符 → 行动结论
- **智能图表嵌入** — 自动选择最相关的可视化图表嵌入故事
- **多轮迭代优化** — 基于用户反馈深化故事内容
- **一键 PPT 导出** — 生成可演示的商业报告

参考 Adobe Customer Journey Analytics Data Storytelling 架构设计。

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

### 🏢 行业场景包

智能适配不同行业的数据分析需求：

- **AI 行业自动识别** — 上传数据后自动识别所属行业（零售/财务/教育/医疗/制造/物流/电商/运营）
- **手动选择覆盖** — 用户可随时切换行业包
- **行业预置指标** — 8 大行业各 6 个核心 KPI 指标（自动挂载到仪表盘）
- **行业仪表盘模板** — 融合 dataVIS 9 个行业大屏模板，开箱即用

---

### 📖 数据故事 (Data Storytelling)

AI 自动发现数据中的关键洞察，将复杂数据转化为引人入胜的叙事故事：

- **5 段式叙事结构** — 标题页 → 执行摘要 → 详细洞察 → 分区符 → 行动结论
- **智能图表嵌入** — 自动选择最相关的可视化图表嵌入故事
- **多轮迭代优化** — 基于用户反馈深化故事内容
- **一键 PPT 导出** — 生成可演示的商业报告

参考 Adobe Customer Journey Analytics Data Storytelling 架构设计。

---

### 🔧 智能数据准备

零门槛的数据清洗体验：

- **上传即质量检测** — 文件上传后自动检测数据质量问题
- **一键修复** — 智能修复重复值、缺失值、异常值
- **清洗模板** — 保存/复用清洗步骤（不存储用户数据，仅存储操作步骤）
- **智能字段推荐** — 多表关联时自动推荐关联字段

融合 airdA NL2SQL self-debug 模式（SQL 生成 → 执行 → 错误分析 → 自动修正 → 重试）和 gpt-runner AI 预设管理理念（.gpt.md 格式模板）。

---

## 导航结构

精简 4 组 12 项入口（独立功能优先，无数据时正常展示），每个入口通过子 Tab 展开详细功能：

| 分组 | 入口 | 子 Tab |
|:----:|:----:|:------:|
| 数据 | AI 建表 | — |
| 数据 | 数据表格 | 表格 / AI 字段 / AI 公式 / 关联表 / 自动化 / 评论 |
| 数据 | 数据准备 | 数据源 / 清洗 / 质量 |
| 分析 | 智能洞察 | 分析 / 报告 |
| 分析 | 可视化 | 仪表盘 / AI 生成 / 设计器 |
| 分析 | 指标体系 | AI 指标 / 指标管理 |
| 分析 | 图表中心 | AI 推荐 / 高级 / ECharts |
| 工具 | AI 问数 | — |
| 工具 | AI 多模态 | 生图 / 图转文 / 文转图 / 图转表 |
| 工具 | 表单收集 | 表单设计 / 数据管理 |
| 工具 | SQL 查询 | — |
| 工具 | 报表导出 | 报表 / 导出 / 分享 / 应用设计 |
| 工具 | 数据故事 | — |
| 工具 | 智能数据准备 | 上传即清洗 / 模板市场 |
| ⚙ 设置 | — | AI 模型 / 数据预警 / 版本快照 / 模板管理 / 权限 |

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

## 智能体架构

DataInsight 采用**双智能体 + 双工作流引擎 + 原子技能池**架构，用户全程无感知，无需手动选择模式：

### 双智能体

| 智能体 | 定位 | 核心能力 | 边界 |
|:------:|:-----|:---------|:-----|
| **全局调度智能体** | 平台级总控中枢 | 跨场景任务规划、模型场景化适配、功能答疑、工作流推荐、跨 Tab 调度 | 不直接执行底层操作，只做调度/规划/引导/分发 |
| **Tab 场景智能体** | 单场景自治智能体 | 场景硬隔离、意图理解、技能调用、工作流执行、结果校验 | 仅处理当前 Tab 业务，拒绝跨场景 |

### 双工作流引擎

| 引擎 | 定位 | 使用场景 |
|:-----|:-----|:---------|
| **预制固化工作流** | 能力下限 | 按人事/销售/财务/项目/教育等业务领域封装 102 个完整流程，小白一键执行 |
| **智能体动态编排** | 能力上限 | 非标需求自动拆解任务 → 挑选技能 → 编排串行/分支/多步流程，会话内存执行，关页即销毁 |

### 原子技能池

所有表格 AI 能力拆解为 104 个最小原子 Skill，统一标准化封装：

| 分类 | 数量 | 示例 |
|:-----|:----:|:-----|
| 表格生成 | 18 | 销售台账/库存管理/客户跟踪/项目进度/财务报表等场景建表 |
| 数据清洗 | 18 | 去重/缺失值填充/异常值检测/格式标准化/列拆分合并 |
| 数据分析 | 18 | 描述统计/相关性/趋势/分布/异常/聚类/归因 |
| 数据可视化 | 18 | 图表推荐/仪表盘生成/高级图表/ECharts 扩展 |
| 公式计算 | 17 | 条件统计/查找引用/日期计算/文本处理/财务公式 |
| 文档解析 | 15 | PDF/Word/图片/网页转表格，智能字段映射 |

### 场景化模型适配

不做全局模型评分，按 6 大业务场景独立适配：

- 模型优秀 → 模型主导规划 + 工具组合 + 流程编排
- 模型中等 → 规则前置兜底，模型辅助推理
- 模型偏弱 → 强制工程规则主导，模型仅做文案

单场景熔断不影响其他场景。

### 出海隐私合规

- **用户业务数据零存储** — 不上传、不落地、不落库、不持久化
- 所有业务数据仅生命周期：当前页面内存 + 临时会话内存
- 页面关闭/刷新/切换 Tab，所有临时数据自动销毁
- 仅存储用户登录态、界面偏好、模板配置、工作流规则配置

---

## 项目架构

```
src/
├── app/
│   ├── api/                     # 后端 API 路由（17个）
│   │   ├── auth/                #   认证（登录/登出/用户信息）
│   │   ├── admin/               #   管理员（用户管理/AI配置/登录记录/使用统计）
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
│   │   ├── alerts/              #   数据告警
│   │   ├── analysis-planner/   #   分析规划（定制分析）
│   │   ├── data-clean/          #   数据清洗
│   │   ├── export/              #   数据导出
│   │   └── platform/            #   平台集成（飞书/企微/钉钉/WPS）
│   ├── form/                    # 表单填写独立页面
│   ├── globals.css              # 全局样式 + CSS 变量主题
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 主页面（精简侧边栏 + 子Tab路由）
├── components/
│   ├── ui/                      # shadcn/ui 组件库
│   ├── sidebar.tsx              # 侧边栏导航（权限控制）
│   ├── home-cards.tsx           # 首页功能卡片（权限控制）
│   ├── login-dialog.tsx          # 统一登录弹窗
│   ├── user-menu.tsx            # 右上角用户菜单
│   ├── admin-panel.tsx          # 管理员面板（用户管理/AI配置/登录记录）
│   ├── settings-dialog.tsx      # 设置弹窗（AI模型/预警/版本/模板/权限）
│   ├── async-file-uploader.tsx  # 异步文件上传（Web Worker）
│   ├── data-table.tsx           # 数据表格（含 AI 字段列渲染）
│   ├── pivot-table.tsx          # 数据透视表（行/列/值字段 + 5种聚合）
│   ├── ai-field-panel.tsx       # AI 字段配置面板（6种AI类型）
│   ├── ai-formula-generator.tsx # AI 公式生成器
│   ├── ai-cell-toolbar.tsx      # 单元格智能工具栏（8种AI操作）
│   ├── data-insights.tsx        # 深度数据分析（7大模块）
│   ├── insight-report-generator.tsx # 一键洞察报告（9模块勾选）
│   ├── dashboard.tsx            # 交互式仪表盘（KPI卡片+图表联动）
│   ├── nl2-dashboard.tsx        # NL2Dashboard 对话生成仪表盘
│   ├── dashboard-designer.tsx   # 仪表盘设计器
│   ├── echarts-extensions.tsx   # ECharts 高级图表（10种）
│   ├── extended-chart-gallery.tsx # 扩展图表面板
│   ├── metric-semantic-layer.tsx # AI 指标语义层
│   ├── metric-manager.tsx       # 指标管理面板
│   ├── sql-lab.tsx              # SQL Lab（浏览器端 SQLite）
│   ├── data-alerting.tsx        # 智能告警（6预置模板+自定义规则）
│   ├── enhanced-llm-assistant.tsx # AI 分析助手（有数据时）
│   ├── global-ai-assistant.tsx  # 全局 AI 助手（拖拽移动+操作执行）
│   ├── ai-table-builder.tsx     # AI 智能建表（20套场景模板）
│   ├── data-cleaner.tsx        # 数据清洗（IQR/Z-score/模板）
│   ├── data-quality-checker.tsx # 数据质量检测
│   ├── report-generator.tsx     # 报表生成（4模板+导出）
│   ├── share-manager.tsx        # 分享管理
│   ├── record-share-manager.tsx # 单条记录分享
│   ├── data-source-manager.tsx  # 数据源管理
│   ├── platform-integrations.tsx # 多平台集成（飞书/企微/钉钉/WPS）
│   ├── view-kanban.tsx          # 看板视图
│   ├── view-calendar.tsx        # 日历视图
│   ├── view-gantt.tsx          # 甘特图视图
│   ├── form-builder.tsx         # 表单构建器（15种字段+主题+规则+权限控制）
│   ├── linked-tables.tsx        # 数据联动/关联表（多表+Lookup）
│   ├── multimodal-fields.tsx     # AI 多模态（生图/图转文/文转图/图转表）
│   ├── workflow-automation.tsx  # 自动化工作流（触发器+动作）
│   ├── row-permissions.tsx      # 行级权限（字段/行/视图级）
│   ├── row-comments.tsx         # 行内评论（表格即文档）
│   ├── app-builder.tsx         # 应用设计器（拖拽搭建业务应用）
│   ├── chart-exporter.tsx       # 图表导出
│   ├── advanced-charts.tsx      # 高级图表
│   ├── version-history.tsx      # 版本快照
│   ├── template-manager.tsx     # 模板管理
│   ├── ai-model-settings.tsx    # AI 模型配置面板
│   ├── data-storytelling.tsx   # 数据故事（5段式叙事+PPT导出）
│   ├── industry-scenario.tsx   # 行业场景包（8大行业+AI识别）
│   ├── smart-data-prep.tsx     # 智能数据准备（上传即清洗+模板）
│   ├── industry-dashboards.tsx  # 行业仪表盘模板（dataVIS融合）
│   ├── nl2sql-debug.tsx        # NL2SQL自调试（airda融合）
│   ├── ai-preset-manager.tsx   # AI预设管理器（gpt-runner融合）
│   └── error-boundary.tsx       # 错误边界
└── lib/
    ├── utils.ts                 # 通用工具（cn 等）
    ├── llm.ts                   # LLM 调用核心（callLLM + callLLMStream + Fallback）
    ├── auth.ts                  # 认证核心（登录/JWT/数据库操作）
    ├── auth-middleware.ts       # API 路由权限中间件
    ├── use-auth.tsx             # 全局登录状态 Hook
    ├── request.ts               # 统一请求工具（request + streamRequest + getAuthHeaders）
    ├── safe-storage.ts          # 安全存储层（自动降级 + 容量预警）
    ├── data-processor/          # 数据处理模块（分析引擎+类型+深度分析）
    ├── ai-field-engine.ts       # AI 字段引擎（6种类型检测 + Prompt 生成）
    ├── metric-engine.ts         # 指标计算引擎（18预置 + 自定义）
    ├── cache-manager.ts         # LRU 缓存管理
    ├── session-store.ts         # 多 Tab 会话存储
    ├── data-lifecycle.ts        # 数据生命周期管理（72小时TTL自动清理）
    ├── agent/                   # 智能体核心
    │   └── core/                #   类型定义 / 全局调度智能体 / 场景智能体 / 意图路由 / 任务规划 / 上下文管理
    ├── skills/                  # 原子技能中台
    │   ├── core/                #   类型定义 / 注册表 / 执行器
    │   └── definitions/         #   104个技能定义（生成/清洗/分析/可视化/公式/解析）
    ├── workflow/                # 工作流引擎
    │   ├── core/                #   类型定义 / 执行引擎 / 注册表
    │   └── definitions/         #   102个工作流定义（通用/销售/财务/项目/教育）
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

### 认证接口

| 接口 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/me` | GET | 获取当前用户信息 |
| `/api/auth/logout` | POST | 用户登出 |

### 管理员接口（需管理员权限）

| 接口 | 方法 | 说明 |
|:-----|:----:|:-----|
| `/api/admin/users` | GET/POST/PUT/DELETE | 用户管理 |
| `/api/admin/login-logs` | GET | 登录记录 |
| `/api/admin/usage-stats` | GET | 使用统计 |
| `/api/admin/ai-config` | GET/PUT | AI模型配置 |

### 数据接口

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
| `/api/alerts` | POST | 获取告警模板列表 |
| `/api/analysis-planner` | POST | AI 分析规划 |
| `/api/data-clean` | POST | 数据清洗 |
| `/api/data-story` | POST | 数据故事生成（SSE 流式） |
| `/api/industry-detect` | POST | AI 行业自动识别 |

---

## 登录说明

### 默认管理员

| 账户 | 密码 | 说明 |
|:-----|:----:|:-----|
| `admin` | `admin123` | 管理员账户，拥有全部权限 |

### 功能权限

管理员可控制用户使用以下功能：

| 功能 | 权限Key | 说明 |
|:-----|:--------|:-----|
| AI智能分析 | `ai_analyze` | AI问数、深度分析 |
| 数据导出 | `export` | 导出Excel/CSV/PDF |
| 仪表盘 | `dashboard` | 创建和管理仪表盘 |
| 分享链接 | `share` | 生成分享链接 |
| 文件上传 | `upload` | 上传Excel/CSV文件 |
| 表单收集 | `form` | 创建和管理数据收集表单 |
| 自定义AI模型 | `custom_ai_model` | 用户可配置自己的AI模型 |

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
