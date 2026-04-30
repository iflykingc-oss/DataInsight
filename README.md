# DataInsight - AI原生智能表格数据分析可视化平台

基于 [Next.js 16](https://nextjs.org) + [shadcn/ui](https://ui.shadcn.com) + [ECharts](https://echarts.apache.org) 构建，支持多端表格上传、AI单元格操作、自动数据分析、交互式仪表盘和 AI 智能洞察。

## 快速开始

```bash
pnpm install       # 安装依赖
pnpm dev           # 启动开发服务器 (端口 5000)
pnpm build         # 构建生产版本
pnpm start         # 启动生产服务器
pnpm ts-check      # TypeScript 类型检查
pnpm lint          # ESLint 代码检查
```

## 核心功能

### AI 单元格系统（比飞书更强）
- **AI 字段捷径**：6种AI字段类型（信息提取/智能分类/内容总结/智能翻译/内容生成/图片理解），可视化配置+预览5行+全列生效+联动更新
- **AI 生成公式**：自然语言→标准Excel公式+逻辑解释+一键采纳
- **单元格智能工具栏**：8种AI操作（填充/润色/翻译/总结/扩写/纠错/简化/转列表）
- **差异化**：自然语言指令+多列联合+整表上下文+AI公式混合

### 深度数据分析
- 自动数据清洗：去重、5种缺失值策略、IQR/Z-score异常检测、标准化
- 深度分析引擎：7大模块（健康评分/关键发现/相关性/分布/趋势/图表推荐/行动建议）
- 一键洞察报告：9大模块自由勾选→聚合生成完整报告

### 指标体系
- 18个预置指标（零售/电商/用户运营/财务/人力/通用6大场景）
- 自定义指标：公式编辑+字段依赖+阈值告警
- AI指标语义层：对话式指标生成+深度解读

### 可视化
- 交互式仪表盘：KPI卡片+6种Recharts图表+全图表联动筛选+配置持久化
- NL2Dashboard：对话生成业务驱动的智能仪表盘
- 10种ECharts高级图表：散点/箱线/热力/漏斗/桑基/瀑布/树图/仪表盘/词云/组合

### AI 智能分析
- 基于LLM的自然语言数据问答（SSE流式输出）
- 6种意图识别：查询/归因/预测/对比/建议/诊断
- 多轮对话上下文 + 流式兜底重试
- 预设6种业务化分析维度

### 其他
- AI 智能建表：20套场景模板+对话生成+迭代修改+Excel导出
- SQL Lab：浏览器端SQLite引擎，即席SQL查询
- 智能告警：6个预置模板+自定义规则+统计面板
- 报表导出：4种模板+PDF/Excel/打印
- 多平台集成：飞书/企微/钉钉/WPS

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16 | App Router 全栈框架 |
| React | 19 | UI 框架 |
| TypeScript | 5 | 类型安全 |
| shadcn/ui | - | 组件库 (基于 Radix UI) |
| Tailwind CSS | 4 | 样式 |
| Recharts | - | 基础图表 |
| ECharts | 5 | 高级图表 |
| sql.js | - | 浏览器端 SQLite |
| xlsx | - | Excel 解析/生成 |
| papaparse | - | CSV 解析 |

## 项目结构

```
src/
├── app/
│   ├── api/               # 11个API路由
│   │   ├── upload/         # 文件上传
│   │   ├── analyze/        # 数据分析
│   │   ├── llm-insight/    # AI洞察 (SSE流式)
│   │   ├── ai-field/       # AI单元格字段
│   │   ├── ai-formula/     # AI生成公式
│   │   ├── ai-table-builder/ # AI建表
│   │   ├── metric-ai/      # AI指标生成
│   │   ├── nl2-dashboard/  # AI仪表盘生成
│   │   ├── database/       # 数据库连接
│   │   ├── test-connection/ # 模型连接测试
│   │   └── alerts/         # 数据告警
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                # shadcn/ui 组件
│   ├── sidebar.tsx        # 侧边栏
│   ├── home-cards.tsx     # 首页卡片
│   ├── settings-dialog.tsx # 设置弹窗
│   └── ...                # 30+业务组件
├── lib/
│   ├── utils.ts           # 通用工具
│   ├── request.ts         # 统一请求
│   ├── llm.ts             # LLM调用核心
│   ├── data-processor.ts  # 数据处理引擎
│   ├── ai-field-engine.ts # AI字段引擎
│   ├── metric-engine.ts   # 指标计算引擎
│   ├── cache-manager.ts   # 缓存管理
│   ├── session-store.ts   # 会话存储
│   ├── file-parser.worker.ts # 文件解析Worker
│   └── platform-types.ts  # 平台集成类型
└── types/
    └── index.ts           # 全局类型定义
```

## AI 模型配置

所有AI功能共用一套模型配置，通过设置页面配置：
- **API Key**: 你的模型服务密钥
- **Base URL**: OpenAI兼容API地址
- **Model Name**: 模型名称（如 gpt-4o、deepseek-chat 等）

支持的模型服务：豆包、DeepSeek、Kimi、通义千问、OpenAI、以及所有OpenAI兼容API。

## 开发规范

- **包管理器**: 必须使用 pnpm，禁止 npm/yarn
- **样式**: 使用 Tailwind CSS 语义化类名 (bg-background/text-foreground)，禁止硬编码颜色
- **组件**: 优先使用 shadcn/ui 组件
- **请求**: 使用 `src/lib/request.ts` 的 request/streamRequest
- **LLM**: 使用 `src/lib/llm.ts` 的 callLLM/callLLMStream/callLLMStreamWithFallback
- **类型**: 禁止 any，所有函数参数必须标注类型

## License

MIT
