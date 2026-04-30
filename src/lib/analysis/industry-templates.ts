/**
 * 行业模板体系 — 业务柔性适配层
 * 
 * 核心价值：
 * 1. 不同行业有不同的分析约束（如财务禁止日粒度，人事禁止薪资跨部门无差别对比）
 * 2. 字段映射让同一套分析引擎适配不同行业术语（门店→部门，销售额→营收）
 * 3. 禁止规则防止 LLM 输出不合规的分析结论
 * 4. 行业专属 Prompt 注入让 LLM 输出贴合业务
 * 
 * 设计原则：只约束"不能做"的事，不限制灵活适配
 */

// ========== 类型定义 ==========

/** 时间粒度枚举 */
export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** 行业模板 — 一个行业一套约束 */
export interface IndustryTemplate {
  key: string;
  name: string;
  description: string;

  /** 基础配置 */
  baseConfig: {
    /** 允许的时间粒度（财务只有月/季，零售可以到日） */
    allowedTimeGranularities: TimeGranularity[];
    /** 维度 TopN 上限 */
    maxDimTopN: number;
    /** 最小样本量（低于此值禁止高阶分析） */
    minSampleSize: number;
  };

  /** 字段映射：原始字段名 → 行业标准术语 */
  fieldMapping: Record<string, string>;

  /** 行业核心业务关注点（LLM 优先分析） */
  focusBusinessPoints: string[];

  /** 禁止规则（比全局约束更细） */
  forbiddenRules: {
    /** 禁止使用的算法模块 */
    modules: string[];
    /** 禁止的分析类型（如"跨区域无差别对比"） */
    analysisTypes: string[];
    /** 场景专属黑名单字段 */
    fieldBlacklist: string[];
  };

  /** 行业专属 Prompt 模板（动态变量用 {{var}} 包裹） */
  promptTemplate: string;

  /** 指标解读规范（行业术语对照） */
  metricTerminology: Record<string, { name: string; unit: string; interpretation: string }>;
}

/** LLM 决策指令 — 释放 LLM 能力：场景适配+复杂决策+业务解读 */
export interface LLMDecisionInstruction {
  /** 场景适配决策 */
  sceneAdaptation: {
    /** 字段行业映射 */
    fieldMapping: Record<string, string>;
    /** 行业核心业务关注点 */
    focusBusinessPoints: string[];
    /** 场景禁止的分析 */
    forbiddenAnalysis: string[];
  };

  /** 分析计划（基于算法特征做优先级决策） */
  analysisPlan: {
    /** 优先执行的模块 */
    priorityModules: string[];
    /** 重点分析维度 */
    focusDimensions: string[];
    /** 忽略的字段 */
    ignoreFields: string[];
    /** 基于算法特征触发的高阶分析 */
    advancedAnalysis: Array<{
      module: string;
      triggerReason: string;
    }>;
  };

  /** 参数决策（结合行业+算法建议） */
  parameters: {
    timeGranularity?: TimeGranularity;
    dimTopN?: number;
    outlierSensitivity?: 'low' | 'medium' | 'high';
    [key: string]: unknown;
  };

  /** 业务解读（释放 LLM：基于算法结果+行业场景做业务解读） */
  businessInterpretation: {
    overview: string;
    insights: string[];
    risks: string[];
    suggestions: string[];
  };
}

/** 算法输出 — 释放算法能力：不仅输出结果，还输出特征+建议 */
export interface AlgorithmOutput {
  module: string;
  success: boolean;
  /** 基础计算结果 */
  data: unknown;
  /** 算法挖掘的特征（如"某门店客流波动大""某指标与维度强相关"） */
  features: Record<string, unknown>;
  /** 算法给 LLM 的建议 */
  suggestions: {
    /** 参数调整建议 */
    adjustParams?: Record<string, unknown>;
    /** 建议后续执行的模块 */
    nextModules?: string[];
    /** 数据质量警告 */
    dataWarning?: string[];
  };
  error?: string;
}

// ========== 行业模板库 ==========

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  /** 零售线下门店 */
  retail_v1: {
    key: 'retail_v1',
    name: '零售线下门店',
    description: '适用于门店销售、客流、坪效等线下零售数据分析',
    baseConfig: {
      allowedTimeGranularities: ['day', 'week', 'month'],
      maxDimTopN: 30,
      minSampleSize: 100,
    },
    fieldMapping: {
      '销售额': '销售额',
      '门店': '门店',
      '地区': '区域',
      '品类': '品类',
      '客流': '日均客流',
      '坪效': '坪效（元/㎡）',
      '客单价': '客单价（元）',
    },
    focusBusinessPoints: ['门店销售额、客流、坪效', '区域/品类拆解', '门店头部效应', '异常门店排查'],
    forbiddenRules: {
      modules: [], // 零售场景开放所有模块
      analysisTypes: ['跨区域无差别对比（一线城市vs三线城市不做简单数值对比）'],
      fieldBlacklist: ['用户手机号', '详细地址', '备注'],
    },
    promptTemplate: `你是资深零售线下门店数据分析师，专注于门店销售、客流、坪效分析，严格遵循以下约束：

1. 身份约束：只做零售门店相关分析，语言专业、贴合零售业务（如门店、品类、区域）

2. 数据背景：数据为零售线下门店数据，共{{rowCount}}条，时间范围{{timeRange}}，数据质量{{dataQuality}}

3. 强制约束（不可违反）：
   - 时间粒度只能在{{allowedTimeGranularities}}中选择，禁止自定义
   - 维度TopN不能超过{{maxDimTopN}}，不能低于5
   - 禁止选择黑名单字段：{{forbiddenFields}}
   - 禁止做{{forbiddenAnalysis}}分析
   - 样本量低于{{minSampleSize}}时，禁止开启高阶算法（如correlation、prediction）

4. 场景适配：
   - 字段映射按{{fieldMapping}}处理，输出时使用映射后的字段名
   - 优先关注{{focusBusinessPoints}}等核心业务点

5. 算法协同（核心）：
   - 必须结合算法特征{{algorithmFeatures}}和建议{{algorithmSuggestions}}做决策
   - 算法建议的参数调整、后续模块，优先采纳
   - 算法识别的异常指标{{abnormalMetrics}}，必须在业务解读中重点分析

6. 输出格式（严格JSON，无Markdown包裹）：
   - 所有数值必须精确到小数点后1位，禁止"近千人""显著增长"等模糊表达
   - 归因必须有数据支撑，禁止"可能是因为"等无依据推测
   - 建议必须可落地，禁止"加强管理""优化流程"等空话

7. 错误禁止：
   - 禁止输出与零售无关的业务解读
   - 禁止突破上述约束
   - 禁止忽略算法输出的特征和建议`,

    metricTerminology: {
      '销售额': { name: '销售额', unit: '元', interpretation: '衡量门店整体营收能力' },
      '客流': { name: '日均客流', unit: '人/日', interpretation: '衡量门店引流能力' },
      '坪效': { name: '坪效', unit: '元/㎡', interpretation: '衡量门店空间利用效率' },
      '客单价': { name: '客单价', unit: '元', interpretation: '衡量客户消费能力' },
    },
  },

  /** 企业财务 */
  finance_v1: {
    key: 'finance_v1',
    name: '企业财务',
    description: '适用于企业营收、成本、利润等财务数据分析',
    baseConfig: {
      allowedTimeGranularities: ['month', 'quarter', 'year'], // 财务禁止日/周粒度
      maxDimTopN: 20,
      minSampleSize: 50,
    },
    fieldMapping: {
      '销售额': '营收',
      '成本': '运营成本',
      '利润': '净利润',
      '门店': '部门',
      '地区': '业务区域',
      '金额': '金额（万元）',
    },
    focusBusinessPoints: ['营收/成本/利润变化', '部门绩效拆解', '成本管控', '财务异常排查'],
    forbiddenRules: {
      modules: [],
      analysisTypes: ['日/周粒度聚合', '无关维度拆解（如用户等级）'],
      fieldBlacklist: ['员工身份证号', '银行账号', '备注'],
    },
    promptTemplate: `你是资深企业财务数据分析师，专注于营收、成本、利润分析，严格遵循以下约束：

1. 身份约束：只做企业财务相关分析，语言专业、贴合财务业务（如营收、成本、净利润、部门）

2. 数据背景：数据为企业财务数据，共{{rowCount}}条，时间范围{{timeRange}}，数据质量{{dataQuality}}

3. 强制约束（不可违反）：
   - 时间粒度只能在{{allowedTimeGranularities}}中选择，禁止日/周粒度
   - 维度TopN不能超过{{maxDimTopN}}，不能低于5
   - 禁止选择黑名单字段：{{forbiddenFields}}
   - 禁止做{{forbiddenAnalysis}}分析
   - 样本量低于{{minSampleSize}}时，禁止开启高阶算法

4. 场景适配：
   - 字段映射按{{fieldMapping}}处理，输出时使用映射后的字段名（如销售额→营收）
   - 优先关注{{focusBusinessPoints}}等核心业务点

5. 算法协同（核心）：
   - 必须结合算法特征{{algorithmFeatures}}和建议{{algorithmSuggestions}}做决策
   - 算法识别的异常指标{{abnormalMetrics}}，必须在业务解读中重点分析

6. 输出格式（严格JSON，无Markdown包裹）：
   - 所有数值必须精确到小数点后2位（财务精度要求更高）
   - 禁止模糊表达，增长率必须有基准值和当前值
   - 建议必须贴合财务逻辑，给出成本管控、绩效优化等具体措施

7. 错误禁止：
   - 禁止输出与财务无关的业务解读
   - 禁止突破上述约束`,

    metricTerminology: {
      '营收': { name: '营收', unit: '万元', interpretation: '衡量企业整体收入规模' },
      '净利润': { name: '净利润', unit: '万元', interpretation: '衡量企业盈利能力' },
      '利润率': { name: '利润率', unit: '%', interpretation: '衡量企业盈利效率' },
    },
  },

  /** 企业人事 */
  hr_v1: {
    key: 'hr_v1',
    name: '企业人事',
    description: '适用于员工结构、流失率、薪资等人事数据分析',
    baseConfig: {
      allowedTimeGranularities: ['month', 'quarter', 'year'],
      maxDimTopN: 15,
      minSampleSize: 30,
    },
    fieldMapping: {
      '员工数': '在职员工数',
      '部门': '一级部门',
      '入职时间': '入职日期',
      '薪资': '月均薪资',
      '人员': '员工',
    },
    focusBusinessPoints: ['员工流失率', '部门人员结构', '薪资分布', '入职/离职分析'],
    forbiddenRules: {
      modules: ['correlation'], // 人事数据不建议做过多相关性（避免隐私风险）
      analysisTypes: ['薪资跨部门无差别对比'],
      fieldBlacklist: ['员工身份证号', '手机号', '家庭地址', '银行卡号'],
    },
    promptTemplate: `你是资深企业人事数据分析师，专注于员工结构、流失率、薪资分析，严格遵循以下约束：

1. 身份约束：只做企业人事相关分析，语言专业、贴合人事业务

2. 数据背景：数据为企业人事数据，共{{rowCount}}条，时间范围{{timeRange}}，数据质量{{dataQuality}}

3. 强制约束（不可违反）：
   - 时间粒度只能在{{allowedTimeGranularities}}中选择
   - 禁止选择黑名单字段：{{forbiddenFields}}
   - 禁止做{{forbiddenAnalysis}}分析
   - 禁止做相关性分析（避免隐私风险）

4. 场景适配：
   - 字段映射按{{fieldMapping}}处理
   - 优先关注{{focusBusinessPoints}}等核心业务点

5. 算法协同（核心）：
   - 必须结合算法特征{{algorithmFeatures}}和建议{{algorithmSuggestions}}做决策
   - 算法识别的异常（如某部门流失率过高），必须重点分析

6. 输出格式（严格JSON，无Markdown包裹）：
   - 禁止泄露员工隐私相关解读
   - 建议必须贴合人事管理，给出人员优化、流失率控制等具体措施

7. 错误禁止：
   - 禁止泄露员工隐私
   - 禁止突破上述约束`,

    metricTerminology: {
      '在职员工数': { name: '在职员工数', unit: '人', interpretation: '衡量企业人员规模' },
      '流失率': { name: '流失率', unit: '%', interpretation: '衡量人员稳定性' },
    },
  },

  /** 项目管理 */
  project_v1: {
    key: 'project_v1',
    name: '项目管理',
    description: '适用于项目进度、任务、工时等项目管理数据分析',
    baseConfig: {
      allowedTimeGranularities: ['day', 'week', 'month'],
      maxDimTopN: 20,
      minSampleSize: 20,
    },
    fieldMapping: {
      '负责人': '项目经理',
      '截止日期': '交付日期',
      '状态': '任务状态',
      '工时': '实际工时（h）',
    },
    focusBusinessPoints: ['项目进度与逾期', '资源分配与瓶颈', '任务完成率', '工时分析'],
    forbiddenRules: {
      modules: [],
      analysisTypes: ['个人效率排名（避免造成职场内卷误解）'],
      fieldBlacklist: ['员工手机号', '私人邮箱'],
    },
    promptTemplate: `你是资深项目管理数据分析师，专注于项目进度、资源、工时分析，严格遵循以下约束：

1. 身份约束：只做项目管理相关分析，语言专业、贴合项目管理

2. 数据背景：共{{rowCount}}条，时间范围{{timeRange}}

3. 强制约束：
   - 时间粒度只能在{{allowedTimeGranularities}}中选择
   - 禁止做{{forbiddenAnalysis}}分析
   - 禁止选择黑名单字段：{{forbiddenFields}}

4. 场景适配：
   - 字段映射按{{fieldMapping}}处理
   - 优先关注{{focusBusinessPoints}}等核心业务点

5. 算法协同（核心）：
   - 必须结合算法特征{{algorithmFeatures}}和建议{{algorithmSuggestions}}做决策

6. 输出格式（严格JSON）：
   - 建议必须贴合项目管理，给出资源优化、进度管控等具体措施`,

    metricTerminology: {
      '完成率': { name: '完成率', unit: '%', interpretation: '衡量项目整体进度' },
      '逾期率': { name: '逾期率', unit: '%', interpretation: '衡量项目按时交付能力' },
    },
  },

  /** 销售/CRM */
  sales_v1: {
    key: 'sales_v1',
    name: '销售跟踪',
    description: '适用于销售漏斗、商机、客户等CRM数据分析',
    baseConfig: {
      allowedTimeGranularities: ['week', 'month', 'quarter'],
      maxDimTopN: 25,
      minSampleSize: 50,
    },
    fieldMapping: {
      '客户': '客户',
      '合同': '合同',
      '销售额': '签约金额',
      '商机': '商机',
      '跟进': '跟进记录',
    },
    focusBusinessPoints: ['销售漏斗转化', '商机质量分析', '客户结构', '赢单/丢单归因'],
    forbiddenRules: {
      modules: [],
      analysisTypes: ['客户个人信息关联分析'],
      fieldBlacklist: ['客户手机号', '客户身份证号'],
    },
    promptTemplate: `你是资深销售数据分析专家，专注于销售漏斗、商机转化、客户分析，严格遵循以下约束：

1. 身份约束：只做销售相关分析，语言专业、贴合销售业务

2. 数据背景：共{{rowCount}}条，时间范围{{timeRange}}

3. 强制约束：
   - 时间粒度只能在{{allowedTimeGranularities}}中选择
   - 禁止做{{forbiddenAnalysis}}分析
   - 禁止选择黑名单字段：{{forbiddenFields}}

4. 场景适配：
   - 字段映射按{{fieldMapping}}处理
   - 优先关注{{focusBusinessPoints}}等核心业务点

5. 算法协同（核心）：
   - 必须结合算法特征{{algorithmFeatures}}和建议{{algorithmSuggestions}}做决策

6. 输出格式（严格JSON）：
   - 建议必须贴合销售管理，给出客户策略、商机优化等具体措施`,

    metricTerminology: {
      '签约金额': { name: '签约金额', unit: '元', interpretation: '衡量销售业绩' },
      '赢单率': { name: '赢单率', unit: '%', interpretation: '衡量销售转化效率' },
    },
  },

  /** 通用模板（兜底） */
  general_v1: {
    key: 'general_v1',
    name: '通用数据',
    description: '适用于无法匹配特定行业的数据分析',
    baseConfig: {
      allowedTimeGranularities: ['day', 'week', 'month', 'quarter'],
      maxDimTopN: 30,
      minSampleSize: 30,
    },
    fieldMapping: {},
    focusBusinessPoints: ['数据整体特征', '关键指标变化', '异常值识别', '数据分布规律'],
    forbiddenRules: {
      modules: [],
      analysisTypes: [],
      fieldBlacklist: ['手机号', '身份证号', '银行账号', '详细地址', '备注'],
    },
    promptTemplate: `你是专业的数据分析专家，针对用户提供的数据进行深度分析，严格遵循以下约束：

1. 数据背景：共{{rowCount}}条，时间范围{{timeRange}}，数据质量{{dataQuality}}

2. 强制约束：
   - 时间粒度只能在{{allowedTimeGranularities}}中选择
   - 禁止选择黑名单字段：{{forbiddenFields}}
   - 样本量低于{{minSampleSize}}时，禁止开启高阶算法

3. 算法协同：
   - 必须结合算法特征{{algorithmFeatures}}和建议{{algorithmSuggestions}}做决策
   - 算法识别的异常指标{{abnormalMetrics}}，必须重点分析

4. 输出格式（严格JSON）：
   - 所有数值必须精确，禁止模糊表达
   - 建议必须可落地，禁止空泛套话`,

    metricTerminology: {},
  },
};


// ========== 基础约束层 ==========

/** 全局黑名单字段（所有行业通用） */
const GLOBAL_FIELD_BLACKLIST = ['序号', 'ID', '手机号', '身份证号', '银行账号', '详细地址', '备注'];

/**
 * 基础约束层：校验 + 边界检查
 * 只写死"不能碰"的底线，不限制行业灵活适配
 */
export class BasicConstraint {
  /** 前置校验：数据+模板是否满足分析条件 */
  validate(
    rowCount: number,
    validRate: number,
    template: IndustryTemplate,
    fieldNames: string[],
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 全局黑名单检测（警告，不阻断）
    const blacklistHits = fieldNames.filter(f => GLOBAL_FIELD_BLACKLIST.includes(f));
    if (blacklistHits.length > 0) {
      warnings.push(`以下字段已自动屏蔽：${blacklistHits.join('、')}`);
    }

    // 2. 行业黑名单检测
    const industryBlacklistHits = fieldNames.filter(f => template.forbiddenRules.fieldBlacklist.includes(f));
    if (industryBlacklistHits.length > 0) {
      warnings.push(`行业约束：以下字段已屏蔽：${industryBlacklistHits.join('、')}`);
    }

    // 3. 数据质量底线（有效率 < 60% 阻断）
    if (validRate < 0.6) {
      errors.push(`数据整体有效率 ${(validRate * 100).toFixed(1)}% < 60%，无法进行分析`);
    }

    // 4. 样本量底线
    if (rowCount < template.baseConfig.minSampleSize) {
      warnings.push(
        `样本量 ${rowCount} < 行业最小要求 ${template.baseConfig.minSampleSize}，高阶分析可能不可靠`
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** 过滤黑名单字段 */
  filterFields<T extends { field: string }>(
    fieldStats: T[],
    template: IndustryTemplate,
  ): T[] {
    const allBlacklist = [...GLOBAL_FIELD_BLACKLIST, ...template.forbiddenRules.fieldBlacklist];
    return fieldStats.filter(f => !allBlacklist.includes(f.field));
  }

  /** LLM 边界校验：检查 LLM 决策是否越界 */
  checkLLMBoundary(
    instruction: LLMDecisionInstruction,
    template: IndustryTemplate,
  ): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // 1. 时间粒度校验
    const granularity = instruction.parameters.timeGranularity;
    if (granularity && !template.baseConfig.allowedTimeGranularities.includes(granularity)) {
      violations.push(
        `时间粒度 "${granularity}" 不允许，仅支持 ${template.baseConfig.allowedTimeGranularities.join('/')}`
      );
    }

    // 2. TopN 边界校验
    const topN = instruction.parameters.dimTopN;
    if (topN !== undefined && (topN < 5 || topN > template.baseConfig.maxDimTopN)) {
      violations.push(
        `维度TopN ${topN} 超出范围（5~${template.baseConfig.maxDimTopN}）`
      );
    }

    // 3. 禁止模块校验
    if (template.forbiddenRules.modules.length > 0) {
      const forbiddenModules = instruction.analysisPlan.priorityModules.filter(
        m => template.forbiddenRules.modules.includes(m)
      );
      if (forbiddenModules.length > 0) {
        violations.push(`选择了禁止的算法模块：${forbiddenModules.join('、')}`);
      }
    }

    // 4. 禁止分析类型校验
    if (template.forbiddenRules.analysisTypes.length > 0) {
      const forbiddenAnalysis = instruction.sceneAdaptation.forbiddenAnalysis.filter(
        t => template.forbiddenRules.analysisTypes.includes(t)
      );
      if (forbiddenAnalysis.length > 0) {
        violations.push(`包含禁止的分析类型：${forbiddenAnalysis.join('、')}`);
      }
    }

    return { valid: violations.length === 0, violations };
  }
}


// ========== 行业模板管理器 ==========

export class IndustryTemplateManager {
  private templates: Record<string, IndustryTemplate>;

  constructor() {
    this.templates = { ...INDUSTRY_TEMPLATES };
  }

  /** 获取行业模板 */
  getTemplate(key: string): IndustryTemplate {
    return this.templates[key] || this.templates['general_v1'];
  }

  /** 自动识别行业场景 */
  detectTemplate(fieldNames: string[]): IndustryTemplate {
    const lowerFields = fieldNames.map(f => f.toLowerCase().trim());
    let bestKey = 'general_v1';
    let bestScore = 0;

    // 关键词匹配评分
    const SCENE_KEYWORDS: Record<string, string[]> = {
      retail_v1: ['销售额', '门店', '品类', '客流', '坪效', '客单价', '零售', '进货', '库存'],
      finance_v1: ['收入', '支出', '利润', '成本', '费用', '科目', '凭证', '借贷', '营收', '净利润'],
      hr_v1: ['姓名', '部门', '职位', '薪资', '入职', '工龄', '绩效', '离职', '考勤', '员工'],
      project_v1: ['任务', '负责人', '截止日期', '进度', '状态', '优先级', '里程碑', '工时', '项目'],
      sales_v1: ['客户', '合同', '商机', '成交', '赢单', '丢单', '跟进', '回款', '线索', 'CRM'],
    };

    for (const [key, keywords] of Object.entries(SCENE_KEYWORDS)) {
      const score = keywords.filter(kw =>
        lowerFields.some(f => f.includes(kw.toLowerCase()))
      ).length;
      if (score > bestScore && score >= 2) {
        bestScore = score;
        bestKey = key;
      }
    }

    return this.templates[bestKey];
  }

  /** 渲染 Prompt 模板（注入动态变量） */
  renderPrompt(
    template: IndustryTemplate,
    vars: {
      rowCount: number;
      timeRange?: string;
      dataQuality?: string;
      algorithmFeatures?: string;
      algorithmSuggestions?: string;
      abnormalMetrics?: string;
    },
  ): string {
    const allowedGranularities = template.baseConfig.allowedTimeGranularities.join('、');
    const forbiddenFields = [
      ...template.forbiddenRules.fieldBlacklist,
    ].join('、') || '无';
    const forbiddenAnalysis = template.forbiddenRules.analysisTypes.join('、') || '无';
    const fieldMapping = Object.entries(template.fieldMapping)
      .map(([k, v]) => `${k}→${v}`)
      .join('、') || '无特殊映射';
    const focusPoints = template.focusBusinessPoints.join('；');

    return template.promptTemplate
      .replace(/\{\{rowCount\}\}/g, String(vars.rowCount))
      .replace(/\{\{timeRange\}\}/g, vars.timeRange || '未知')
      .replace(/\{\{dataQuality\}\}/g, vars.dataQuality || '未知')
      .replace(/\{\{allowedTimeGranularities\}\}/g, allowedGranularities)
      .replace(/\{\{maxDimTopN\}\}/g, String(template.baseConfig.maxDimTopN))
      .replace(/\{\{minSampleSize\}\}/g, String(template.baseConfig.minSampleSize))
      .replace(/\{\{forbiddenFields\}\}/g, forbiddenFields)
      .replace(/\{\{forbiddenAnalysis\}\}/g, forbiddenAnalysis)
      .replace(/\{\{fieldMapping\}\}/g, fieldMapping)
      .replace(/\{\{focusBusinessPoints\}\}/g, focusPoints)
      .replace(/\{\{algorithmFeatures\}\}/g, vars.algorithmFeatures || '无')
      .replace(/\{\{algorithmSuggestions\}\}/g, vars.algorithmSuggestions || '无')
      .replace(/\{\{abnormalMetrics\}\}/g, vars.abnormalMetrics || '无');
  }

  /** 新增/修改模板（无需改核心代码） */
  updateTemplate(key: string, template: Partial<IndustryTemplate>): void {
    if (this.templates[key]) {
      this.templates[key] = { ...this.templates[key], ...template };
    } else {
      this.templates[key] = template as IndustryTemplate;
    }
  }

  /** 获取所有模板 */
  getAllTemplates(): Record<string, IndustryTemplate> {
    return { ...this.templates };
  }
}
