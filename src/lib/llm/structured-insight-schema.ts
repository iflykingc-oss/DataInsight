/**
 * 结构化洞察输出规范 (Structured Insight Schema)
 * 
 * 设计目标：
 * 1. 排版：分层级、要点化、数据突出
 * 2. 逻辑：数据精确、维度清晰、归因有据、建议可执行
 * 
 * 格式：JSON Schema + Markdown Narrative
 * - JSON 部分：结构化数据（前端渲染用）
 * - Markdown 部分：详细分析（可读性用）
 */

// ===== 核心发现 (Key Finding) =====
export type FindingCategory = 
  | 'trend'        // 趋势发现
  | 'comparison'   // 对比发现
  | 'anomaly'      // 异常发现
  | 'correlation'   // 关联发现
  | 'distribution'  // 分布发现
  | 'risk'         // 风险发现
  | 'opportunity'; // 机会发现

export type DataConfidence = 'high' | 'medium' | 'low';

export interface KeyFinding {
  /** 发现类别 */
  category: FindingCategory;
  /** 核心结论（一句话，不超过30字） */
  conclusion: string;
  /** 数据支撑（精确数值+单位+同比环比） */
  evidence: {
    /** 指标名称 */
    metric: string;
    /** 当前值（必须精确，带单位） */
    current: string;
    /** 变化值（必须精确，如 "+8.5%" 或 "-12.3%"） */
    change?: string;
    /** 变化方向 */
    direction: 'up' | 'down' | 'stable';
    /** 置信度 */
    confidence: DataConfidence;
  };
  /** 归因分析（如果适用） */
  attribution?: {
    /** 可能原因 */
    reason: string;
    /** 置信度 */
    confidence: DataConfidence;
    /** 验证条件 */
   验证条件?: string;
  };
  /** 关联维度 */
  dimensions?: string[];
}

// ===== 维度分析 (Dimension Analysis) =====
export interface DimensionAnalysis {
  /** 维度名称 */
  dimension: string;
  /** 维度下的关键数据点 */
  dataPoints: Array<{
    /** 数据点名称 */
    name: string;
    /** 精确数值 */
    value: string;
    /** 同比/环比 */
    compare?: string;
    /** 排名（可选） */
    rank?: number;
  }>;
  /** 分析结论 */
  conclusion: string;
}

// ===== 建议 (Recommendation) =====
export type RecommendationUrgency = 'immediate' | 'short_term' | 'long_term';

export interface Recommendation {
  /** 建议标题（动作导向） */
  title: string;
  /** 紧急程度 */
  urgency: RecommendationUrgency;
  /** 具体行动步骤 */
  actions: string[];
  /** 数据依据 */
  dataBasis: string;
  /** 预期收益 */
  expectedBenefit?: string;
  /** 优先级（1-5，1最高） */
  priority: number;
}

// ===== 数据质量 (Data Quality) =====
export interface DataQualityIssue {
  /** 问题类型 */
  type: 'missing' | 'outlier' | 'inconsistent' | 'invalid';
  /** 问题描述 */
  description: string;
  /** 影响范围 */
  impact: string;
  /** 修复建议 */
  fix: string;
}

// ===== 完整洞察报告 =====
export interface StructuredInsight {
  /** 元信息 */
  meta: {
    /** 场景描述 */
    scenario: string;
    /** 数据范围 */
    dataRange: string;
    /** 分析时间戳 */
    timestamp: string;
  };
  /** 核心发现（3-5条，按重要性排序） */
  keyFindings: KeyFinding[];
  /** 维度分析（按维度分组） */
  dimensionAnalysis: DimensionAnalysis[];
  /** 建议（按紧急程度排序） */
  recommendations: Recommendation[];
  /** 数据质量 */
  dataQuality?: DataQualityIssue[];
  /** 数据局限性 */
  limitations: string[];
  /** 推荐追问（3个深度问题） */
  followUpQuestions: string[];
  /** 原始 Markdown（供展示用） */
  markdown?: string;
}

/**
 * 解析 LLM 输出的结构化洞察
 * 支持从 Markdown 中提取 JSON 或直接解析 JSON
 */
export function parseStructuredInsight(rawOutput: string): StructuredInsight | null {
  try {
    // 尝试从 Markdown 中提取 JSON
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // 尝试直接解析（可能是纯 JSON）
    return JSON.parse(rawOutput);
  } catch {
    return null;
  }
}

/**
 * 生成结构化洞察的 Prompt 部分
 * 这个模板告诉 LLM 如何输出结构化数据
 */
export const STRUCTURED_INSIGHT_TEMPLATE = `## 输出格式（必须严格遵循）

你必须同时输出【结构化 JSON】和【Markdown 详细分析】。

### 结构化 JSON（核心发现）
在回答开头，用 \`\`\`json\`\`\` 输出以下 JSON：

\`\`\`json
{
  "meta": {
    "scenario": "一句话描述分析场景（行业+核心问题）",
    "dataRange": "数据范围（时间/门店/品类等）",
    "timestamp": "${new Date().toISOString()}"
  },
  "keyFindings": [
    {
      "category": "trend|comparison|anomaly|correlation|distribution|risk|opportunity",
      "conclusion": "核心结论（≤30字，不含数据）",
      "evidence": {
        "metric": "指标名称",
        "current": "当前值（含单位，如'85.6万元'）",
        "change": "变化值（含方向，如'+8.5%'）",
        "direction": "up|down|stable",
        "confidence": "high|medium|low"
      },
      "attribution": {
        "reason": "可能原因（1句话）",
        "confidence": "high|medium|low",
        "验证条件": "需要什么数据验证（如果不确定）"
      },
      "dimensions": ["关联维度1", "关联维度2"]
    }
  ],
  "dimensionAnalysis": [...],
  "recommendations": [
    {
      "title": "建议标题（动词开头，如'提升客流量'）",
      "urgency": "immediate|short_term|long_term",
      "actions": ["具体行动1", "具体行动2"],
      "dataBasis": "数据依据（如'科技园店坪效3,520元/㎡，领先均值40%'）",
      "expectedBenefit": "预期收益（如'预计提升销售额10-15%'）",
      "priority": 1
    }
  ],
  "dataQuality": [...],
  "limitations": ["数据局限性1", "数据局限性2"],
  "followUpQuestions": ["深度追问1", "深度追问2", "深度追问3"]
}
\`\`\`

### Markdown 详细分析
在 JSON 之后，用 Markdown 输出详细分析。格式要求：

\`\`\`markdown
## 📊 一句话场景（不超过20字）

## 🔑 核心发现（按重要性排序，每条包含：结论→数据→归因）

### 1. [发现标题]
- **结论**：[一句话结论]
- **数据**：[精确数值+同比环比，格式：指标名 + 数值 + 单位 + 同比/环比]
- **原因**：[可能原因，如果不确定写"可能原因+需XX数据验证"]
- **维度**：[涉及的维度，如门店/区域/品类]

### 2. ...

## 📈 维度分析（每个维度单独一小节）

### [维度1]
| 数据点 | 数值 | 同比 | 排名 |
|--------|------|-----|------|
| ... | ... | ... | ... |
**分析**：[2-3行分析]

## 💡 建议（按紧急程度：🔴立即 🟡本月 🟢本季）

### 🔴 立即行动（本周）
1. [建议标题]
   - 依据：[数据依据]
   - 行动：[具体步骤]
   - 预期：[收益估算]

### 🟡 本月计划
...

### 🟢 本季规划
...

## ⚠️ 数据局限性（必须列出）
1. [局限性1]
2. [局限性2]

## ❓ 推荐追问（3个深度问题）
1. [指向更深层分析的问题]
2. [指向交叉验证的问题]
3. [指向趋势外推的问题]
\`\`\`

## 写作规范（铁律）

### 数据精确性
- ✅ 正确："科技园店日均客流 986 人，环比增长 23.5%"
- ❌ 错误："科技园店日均客流近千人，环比增长显著"
- ✅ 正确："城南店销售额 12.3 万元，环比下降 5.2%"
- ❌ 错误："城南店销售额下降了一些"

### 变化描述
- ✅ 必须写："环比 +8.5%（上周 78.9 万元 → 本周 85.6 万元）"
- ❌ 禁止写："环比增长显著/明显/较大幅度"

### 维度一致性
- ✅ 正确："从门店维度看，科技园店表现最优（85.6万）；从区域维度看，城南区域增速最快（+15%）"
- ❌ 禁止："科技园表现好，万达店有问题，整体还行"

### 归因有据
- ✅ 正确："科技园店坪效领先可能与选址有关（科技园区工作日客流稳定），需验证工作日vs周末数据"
- ❌ 禁止："科技园店坪效领先是因为管理好"

### 建议可执行
- ✅ 正确："优化万达广场店品类结构：将高坪效品类（数码/轻奢）占比从30%提升至50%，预计可提升坪效15-20%"
- ❌ 禁止："建议提升空间利用率""建议加强管理""适当增加资源投入"

### 追问深度
- ✅ 正确："按区域拆分后，哪个区域的销售额降幅最大，是全品类下滑还是个别品类拖累？"
- ❌ 错误："销售额为什么下降？""哪个店表现最好？"`;
