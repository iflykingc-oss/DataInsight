/**
 * 智能意图理解引擎 - 核心实现
 * 深度理解用户需求，识别行业、业务场景、执行策略
 */

import type {
  UserRequirement,
  IntentUnderstandingResult,
  IndustryType,
  BusinessScenario,
  IntentType,
  BusinessEntity,
  DataRequirement,
  OutputExpectation,
  ExecutionStrategy,
  MatchedPrompt,
  WorkflowSuggestion,
  ClarificationQuestion,
} from './types';

/** 行业特征词库 */
const INDUSTRY_SIGNATURES: Record<IndustryType, {
  keywords: string[];
  entities: string[];
  metrics: string[];
}> = {
  retail: {
    keywords: ['销售', '零售', '门店', '店铺', '商品', '库存', '客单价', '坪效', '毛利', '促销', '品类', 'SKU', '日均', '月均', '客流', '转化率', '销售额', '进货'],
    entities: ['门店', '商品', '客户', '会员', '供应商', '商品分类'],
    metrics: ['销售额', '销量', '客单价', '坪效', '人效', '库存周转', '毛利率', '客流', '转化率', '连带率']
  },
  restaurant: {
    keywords: ['餐饮', '餐厅', '菜品', '厨师', '翻台率', '堂食', '外卖', '食材', '食谱', '座位', '营业', '客流量'],
    entities: ['菜品', '餐桌', '厨师', '原料', '供应商'],
    metrics: ['翻台率', '客单价', '上座率', '食材消耗', '毛利率', '日营收']
  },
  healthcare: {
    keywords: ['医疗', '医院', '患者', '医生', '科室', '门诊', '住院', '手术', '药品', '处方', '挂号', '病床', '医疗费用'],
    entities: ['患者', '医生', '科室', '药品', '病区', '手术'],
    metrics: ['门诊量', '住院量', '床位使用率', '平均住院日', '治愈率', '患者满意度']
  },
  logistics: {
    keywords: ['物流', '快递', '配送', '运输', '仓储', '网点', '运单', '签收', '时效', '揽收', '派送', '干线', '最后一公里', '车辆', '司机'],
    entities: ['网点', '运单', '车辆', '司机', '客户', '仓库'],
    metrics: ['配送时效', '签收率', '破损率', '丢失率', '网点产能', '车辆利用率']
  },
  real_estate: {
    keywords: ['房地产', '楼盘', '房产', '物业', '业主', '车位', '中介', '经纪人', '成交', '带看', '开盘', '去化', '户型', '面积'],
    entities: ['楼盘', '业主', '房产', '车位', '经纪人', '客户'],
    metrics: ['去化率', '成交额', '带看量', '转化率', '库存量', '均价']
  },
  energy: {
    keywords: ['电力', '能源', '发电', '用电', '电网', '电价', '机组', '光伏', '风电', '储能', '售电', '负荷'],
    entities: ['电厂', '机组', '变压器', '线路', '用户'],
    metrics: ['发电量', '用电量', '负荷率', '利用小时数', '线损率', '电价']
  },
  cross_border: {
    keywords: ['跨境', '电商', '亚马逊', '速卖通', 'Shopee', 'Lazada', 'Listing', 'SKU', 'FBA', '头程', '尾程', '报关', '退税'],
    entities: ['店铺', 'Listing', 'SKU', '物流商', '仓库', '买家'],
    metrics: ['GMV', '订单量', '转化率', 'ACOS', 'ROI', '退款率', '库存周转']
  },
  education: {
    keywords: ['教育', '培训', '学员', '课程', '老师', '校区', '续费', '转介绍', '出勤', '完课', '报名', '咨询'],
    entities: ['学员', '课程', '老师', '校区', '班主任', '教材'],
    metrics: ['续费率', '出勤率', '完课率', '转化率', '客单价', '满意度']
  },
  manufacturing: {
    keywords: ['生产', '制造', '产线', '工序', '良率', 'OEE', '设备', '产能', '原料', '成品', '工时', '物料', '质检'],
    entities: ['产品', '工序', '产线', '设备', '工人', '原料'],
    metrics: ['OEE', '产能利用率', '良率', '设备故障率', '物料消耗', '人均产出']
  },
  finance: {
    keywords: ['财务', '会计', '预算', '报销', '发票', '凭证', '账款', '资产', '负债', '利润', '现金流', '投资'],
    entities: ['账户', '凭证', '发票', '合同', '项目', '部门'],
    metrics: ['利润率', '资产负债率', '现金流', '预算执行率', '人均产出']
  },
  hr: {
    keywords: ['人力', '员工', '招聘', '绩效', '薪酬', '离职', '入职', '编制', '人效', '培训', 'KPI', 'OKR'],
    entities: ['员工', '候选人', '部门', '岗位', '薪酬', '绩效'],
    metrics: ['离职率', '入职率', '人效', '人均成本', '招聘周期', '绩效达标率']
  },
  general: {
    keywords: ['数据', '表格', '统计', '分析', '汇总', '筛选', '排序', '导出', '整理'],
    entities: [],
    metrics: []
  }
};

/** 业务场景识别规则 */
const SCENARIO_PATTERNS: {
  scenario: BusinessScenario;
  intentType: IntentType;
  keywords: string[];
  outputFormats: string[];
}[] = [
  {
    scenario: 'table_generation',
    intentType: 'generate',
    keywords: ['生成表格', '创建表格', '生成表', '设计表格', '制作表格', '生成模板', '创建表头', '生成字段'],
    outputFormats: ['表格', '表', '字段']
  },
  {
    scenario: 'data_cleaning',
    intentType: 'clean',
    keywords: ['清洗', '清理', '去重', '去脏', '补全', '填充', '标准化', '格式化', '规范'],
    outputFormats: []
  },
  {
    scenario: 'data_analysis',
    intentType: 'analyze',
    keywords: ['分析', '剖析', '诊断', '评估', '解读', '洞察', '发现', '研究', '对比', '比较'],
    outputFormats: []
  },
  {
    scenario: 'visualization',
    intentType: 'visualize',
    keywords: ['可视化', '图表', '画图', '生成图', 'dashboard', '看板', '大屏', '展现'],
    outputFormats: ['图', '表', 'dashboard', '看板']
  },
  {
    scenario: 'report',
    intentType: 'report',
    keywords: ['报告', '报表', '周报', '月报', '季报', '年报', '总结', '汇总报告', '分析报告'],
    outputFormats: ['报告', '报表', '周报', '月报']
  },
  {
    scenario: 'business_review',
    intentType: 'analyze',
    keywords: ['经营分析', '业务分析', '业绩分析', '运营分析', '复盘', '经营诊断', '盈利分析'],
    outputFormats: []
  },
  {
    scenario: 'customer_analysis',
    intentType: 'analyze',
    keywords: ['客户分析', '客户画像', '客户分层', '客户价值', '流失分析', '复购', 'RFM', '会员分析'],
    outputFormats: []
  },
  {
    scenario: 'performance_review',
    intentType: 'analyze',
    keywords: ['绩效分析', 'KPI分析', 'OKR', '考核', '目标完成', '达标分析', '绩效评估'],
    outputFormats: []
  },
  {
    scenario: 'supply_chain',
    intentType: 'analyze',
    keywords: ['供应链', '库存分析', '周转', '补货', '采购', '供应商', '物流', '配送'],
    outputFormats: []
  },
  {
    scenario: 'risk_control',
    intentType: 'audit',
    keywords: ['风险', '预警', '监控', '异常', '预警', '风险点', '风控', '合规', '检查'],
    outputFormats: []
  },
  {
    scenario: 'formula',
    intentType: 'generate',
    keywords: ['公式', '计算', '函数', 'SUM', 'VLOOKUP', 'IF', '求和', '统计'],
    outputFormats: ['公式', '函数']
  },
  {
    scenario: 'general',
    intentType: 'unknown',
    keywords: [],
    outputFormats: []
  }
];

/** 时间词识别 */
const TIME_PATTERNS = {
  // 时间范围
  range: /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)|(本月)|(上月)|(本月)|(本季)|(上季)|(本年)|(去年)|(近\s*\d+\s*[日月年周天])|(上?\s*半\s*[年月])|(下\s*半\s*[年月])/g,
  // 时间粒度
  granularity: /按(日|周|月|季|年)统计|(日|周|月|季|年)度|(日|周|月|季|年)报/g,
  // 具体时间点
  point: /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)|(今天)|(昨天)|(前天)|(明天)|(后天)|(周一)|(周日)/g
};

/** 数量词识别 */
const QUANTITY_PATTERNS = /(\d+)\s*(个|条|份|页|行|天|月|年|万|千|百|吨|件|箱|家|名|人|次|元)/g;

/** 度量词识别 */
const METRIC_PATTERNS = /(销售|营收|收入|成本|利润|毛利|增长|下降|同比|环比|占比|比率|率|额|量|数|均|总)/g;

interface IntentUnderstandingConfig {
  enableDeepUnderstanding?: boolean;
  autoDetectIndustry?: boolean;
  proactiveClarification?: boolean;
  minConfidenceThreshold?: number;
}

export class IntentUnderstandingEngine {
  private config: Required<IntentUnderstandingConfig>;

  constructor(config?: IntentUnderstandingConfig) {
    this.config = {
      enableDeepUnderstanding: true,
      autoDetectIndustry: true,
      proactiveClarification: true,
      minConfidenceThreshold: 0.6,
      ...config
    };
  }

  /**
   * 理解用户需求
   */
  async understand(
    userRequest: string,
    data?: { headers: string[]; rows: Record<string, unknown>[] }
  ): Promise<IntentUnderstandingResult> {
    try {
      // 1. 基础文本分析
      const cleanedRequest = this.cleanText(userRequest);
      const words = this.tokenize(cleanedRequest);

      // 2. 行业识别
      const industry = this.detectIndustry(words, userRequest);

      // 3. 业务场景识别
      const scenario = this.detectBusinessScenario(userRequest);

      // 4. 意图类型识别
      const intentType = this.detectIntentType(userRequest, scenario);

      // 5. 业务实体提取
      const entities = this.extractBusinessEntities(userRequest, industry);

      // 6. 数据需求提取
      const dataRequirements = this.extractDataRequirements(userRequest, data, industry);

      // 7. 输出期望识别
      const outputExpectation = this.detectOutputExpectation(userRequest, scenario);

      // 8. 置信度计算
      const confidence = this.calculateConfidence(industry, scenario, intentType, entities, dataRequirements);

      // 9. 澄清需求判断
      const { needClarification, clarificationQuestions } = this.evaluateNeedForClarification(
        userRequest,
        data,
        entities,
        dataRequirements,
        confidence
      );

      // 10. 执行策略确定
      const suggestedStrategy = this.determineExecutionStrategy(
        confidence,
        needClarification,
        scenario
      );

      // 11. 构建完整需求结构
      const requirement: UserRequirement = {
        rawRequest: userRequest,
        industry,
        businessScenario: scenario,
        intentType,
        businessEntities: entities,
        dataRequirements,
        outputExpectation,
        confidence,
        needClarification,
        clarificationQuestions,
        suggestedStrategy
      };

      // 12. 匹配最佳Prompt
      const matchedPrompts = this.matchPrompts(requirement);

      // 13. 生成工作流建议
      const suggestedWorkflow = this.suggestWorkflow(requirement, matchedPrompts);

      return {
        success: true,
        requirement,
        matchedPrompts,
        suggestedWorkflow
      };
    } catch (error) {
      return {
        success: false,
        requirement: {
          rawRequest: userRequest,
          industry: 'general',
          businessScenario: 'general',
          intentType: 'unknown',
          businessEntities: [],
          dataRequirements: { metrics: [], dimensions: [] },
          outputExpectation: {
            format: 'any',
            detailLevel: 'detailed',
            needInsights: true,
            needSuggestions: true,
            languageStyle: 'any'
          },
          confidence: 0,
          needClarification: false,
          suggestedStrategy: 'guided'
        },
        matchedPrompts: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /** 文本清洗 */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  /** 分词 */
  private tokenize(text: string): string[] {
    return text.split(/[\s,.，、。!?！？；;]+/).filter(Boolean);
  }

  /** 行业识别 */
  private detectIndustry(words: string[], fullText: string): IndustryType {
    const scores: Record<IndustryType, number> = {
      retail: 0, restaurant: 0, healthcare: 0, logistics: 0,
      real_estate: 0, energy: 0, cross_border: 0, education: 0,
      manufacturing: 0, finance: 0, hr: 0, general: 0
    };

    const lowerText = fullText.toLowerCase();

    for (const [industry, signature] of Object.entries(INDUSTRY_SIGNATURES)) {
      if (industry === 'general') continue;

      // 关键词匹配
      for (const keyword of signature.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          scores[industry as IndustryType] += 2;
        }
      }

      // 实体匹配
      for (const entity of signature.entities) {
        if (lowerText.includes(entity.toLowerCase())) {
          scores[industry as IndustryType] += 1;
        }
      }

      // 度量词匹配
      for (const metric of signature.metrics) {
        if (lowerText.includes(metric.toLowerCase())) {
          scores[industry as IndustryType] += 1;
        }
      }
    }

    // 找最高分
    let maxScore = 0;
    let detectedIndustry: IndustryType = 'general';

    for (const [industry, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedIndustry = industry as IndustryType;
      }
    }

    return detectedIndustry;
  }

  /** 业务场景识别 */
  private detectBusinessScenario(fullText: string): BusinessScenario {
    const lowerText = fullText.toLowerCase();

    // 按优先级匹配
    const priorityOrder = [
      'report',           // 报告类优先
      'business_review', // 经营分析
      'customer_analysis', // 客户分析
      'performance_review', // 绩效分析
      'supply_chain',    // 供应链
      'risk_control',    // 风险控制
      'visualization',   // 可视化
      'formula',         // 公式
      'data_cleaning',   // 清洗
      'table_generation', // 生成
      'data_analysis'    // 分析
    ];

    for (const scenario of priorityOrder) {
      const pattern = SCENARIO_PATTERNS.find(p => p.scenario === scenario);
      if (pattern) {
        for (const keyword of pattern.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            return scenario as BusinessScenario;
          }
        }
      }
    }

    return 'general';
  }

  /** 意图类型识别 */
  private detectIntentType(fullText: string, scenario: BusinessScenario): IntentType {
    const lowerText = fullText.toLowerCase();

    for (const pattern of SCENARIO_PATTERNS) {
      if (pattern.scenario === scenario) {
        return pattern.intentType;
      }
    }

    // 通用意图识别
    if (/生成|创建|制作|设计/.test(lowerText)) return 'generate' as IntentType;
    if (/分析|诊断|评估|洞察/.test(lowerText)) return 'analyze' as IntentType;
    if (/清洗|清理|去重/.test(lowerText)) return 'clean' as IntentType;
    if (/可视化|图表|dashboard/.test(lowerText)) return 'visualize' as IntentType;
    if (/对比|比较/.test(lowerText)) return 'compare' as IntentType;
    if (/预测|预判| forecast/.test(lowerText)) return 'forecast' as IntentType;
    if (/监控|预警|风险/.test(lowerText)) return 'monitor' as IntentType;
    if (/优化|改进|提升/.test(lowerText)) return 'optimize' as IntentType;

    return 'unknown' as IntentType;
  }

  /** 提取业务实体 */
  private extractBusinessEntities(fullText: string, industry: IndustryType): BusinessEntity[] {
    const entities: BusinessEntity[] = [];
    const signature = INDUSTRY_SIGNATURES[industry];
    const lowerText = fullText.toLowerCase();

    // 提取signature中定义的实体
    if (signature) {
      for (const entity of signature.entities) {
        if (lowerText.includes(entity.toLowerCase())) {
          entities.push({
            type: entity,
            name: entity,
            attributes: [],
            count: undefined,
          });
        }
      }
    }

    // 提取数量信息
    const quantityMatches = fullText.match(QUANTITY_PATTERNS);
    if (quantityMatches) {
      for (const match of quantityMatches) {
        const num = parseInt(match.match(/\d+/)?.[0] || '0');
        for (const entity of entities) {
          if (lowerText.includes(entity.name.toLowerCase())) {
            entity.count = num;
          }
        }
      }
    }

    return entities;
  }

  /** 提取数据需求 */
  private extractDataRequirements(
    fullText: string,
    data: { headers: string[]; rows: Record<string, unknown>[] } | undefined,
    industry: IndustryType
  ): DataRequirement {
    const requirement: DataRequirement = {
      metrics: [],
      dimensions: []
    };

    const lowerText = fullText.toLowerCase();
    const signature = INDUSTRY_SIGNATURES[industry];

    // 从文本中提取指标
    if (signature) {
      for (const metric of signature.metrics) {
        if (lowerText.includes(metric.toLowerCase())) {
          requirement.metrics.push(metric);
        }
      }
    }

    // 从数据列中推断指标
    if (data?.headers) {
      for (const header of data.headers) {
        if (signature?.metrics.some(m => header.includes(m) || m.includes(header))) {
          if (!requirement.metrics.includes(header)) {
            requirement.metrics.push(header);
          }
        }
      }
    }

    // 识别时间范围
    const timeRangeMatches = fullText.match(TIME_PATTERNS.range);
    if (timeRangeMatches) {
      requirement.timeRange = { start: timeRangeMatches[0] };
    }

    // 识别时间粒度
    const granularityMatch = fullText.match(TIME_PATTERNS.granularity);
    if (granularityMatch) {
      const granularity = granularityMatch[1] || granularityMatch[2] || granularityMatch[3];
      if (requirement.timeRange) {
        const validGranularity = ['day', 'week', 'month', 'quarter', 'year'] as const;
        type Granularity = typeof validGranularity[number];
        if (validGranularity.includes(granularity as Granularity)) {
          requirement.timeRange.granularity = granularity as Granularity;
        }
      }
    }

    return requirement;
  }

  /** 识别输出期望 */
  private detectOutputExpectation(fullText: string, scenario: BusinessScenario): OutputExpectation {
    const lowerText = fullText.toLowerCase();

    let format: OutputExpectation['format'] = 'any';
    let detailLevel: OutputExpectation['detailLevel'] = 'detailed';
    let needInsights = true;
    let needSuggestions = true;
    let languageStyle: OutputExpectation['languageStyle'] = 'any';

    // 格式识别
    if (/图表|可视化|dashboard|看板|图/.test(lowerText)) {
      format = 'chart';
    } else if (/表格|表/.test(lowerText)) {
      format = 'table';
    } else if (/报告|报表|周报|月报|总结/.test(lowerText)) {
      format = 'report';
      detailLevel = 'comprehensive';
      needInsights = true;
      needSuggestions = true;
    } else if (/JSON|json|数据/.test(lowerText)) {
      format = 'json';
    }

    // 详细程度识别
    if (/简略|简单|概要|摘要/.test(lowerText)) {
      detailLevel = 'summary';
      needInsights = false;
      needSuggestions = false;
    } else if (/详细|完整|全面|深入/.test(lowerText)) {
      detailLevel = 'comprehensive';
    }

    // 语言风格识别
    if (/通俗|易懂|简单|小白/.test(lowerText)) {
      languageStyle = 'simple';
    } else if (/专业|正式|规范/.test(lowerText)) {
      languageStyle = 'professional';
    }

    return { format, detailLevel, needInsights, needSuggestions, languageStyle };
  }

  /** 计算置信度 */
  private calculateConfidence(
    industry: IndustryType,
    scenario: BusinessScenario,
    intentType: IntentType,
    entities: BusinessEntity[],
    dataRequirements: DataRequirement
  ): number {
    let confidence = 0.5;

    // 行业识别置信度
    if (industry !== 'general') {
      confidence += 0.2;
    }

    // 业务场景明确性
    if (scenario !== 'general') {
      confidence += 0.15;
    }

    // 意图类型明确性
    if (intentType !== 'unknown') {
      confidence += 0.1;
    }

    // 实体识别
    if (entities.length > 0) {
      confidence += 0.05 * Math.min(entities.length, 3);
    }

    // 数据需求明确性
    if (dataRequirements.metrics.length > 0) {
      confidence += 0.05 * Math.min(dataRequirements.metrics.length, 3);
    }

    return Math.min(confidence, 1);
  }

  /** 评估是否需要澄清 */
  private evaluateNeedForClarification(
    userRequest: string,
    data: { headers: string[]; rows: Record<string, unknown>[] } | undefined,
    entities: BusinessEntity[],
    dataRequirements: DataRequirement,
    confidence: number
  ): { needClarification: boolean; clarificationQuestions: ClarificationQuestion[] } {
    const questions: ClarificationQuestion[] = [];

    // 置信度低于阈值
    if (confidence < this.config.minConfidenceThreshold) {
      questions.push({
        question: '您希望分析的重点是什么？',
        options: ['整体概况', '某个具体方面'],
        type: 'select'
      });
    }

    // 无数据且需要数据
    if (!data && dataRequirements.metrics.length === 0) {
      questions.push({
        question: '您是否有数据需要分析？',
        options: ['我有数据（请上传）', '生成示例数据'],
        type: 'select'
      });
    }

    // 行业不明确
    if (confidence < 0.7 && entities.length === 0) {
      questions.push({
        question: '您属于哪个行业？',
        options: ['零售/销售', '餐饮', '医疗', '物流', '教育', '其他'],
        type: 'select'
      });
    }

    // 数据需求不明确
    if (dataRequirements.metrics.length === 0 && data?.headers.length) {
      questions.push({
        question: '您想分析哪些指标？',
        type: 'text'
      });
    }

    return {
      needClarification: questions.length > 0 && this.config.proactiveClarification,
      clarificationQuestions: questions
    };
  }

  /** 确定执行策略 */
  private determineExecutionStrategy(
    confidence: number,
    needClarification: boolean,
    scenario: BusinessScenario
  ): ExecutionStrategy {
    if (needClarification) {
      return 'guided';
    }

    if (confidence >= 0.8 && !needClarification) {
      return 'auto';
    }

    if (confidence >= 0.6) {
      return 'semi_auto';
    }

    return 'guided';
  }

  /** 匹配最佳Prompt */
  private matchPrompts(requirement: UserRequirement): MatchedPrompt[] {
    // 这里会调用Prompt配置系统
    // 暂时返回模拟数据，实际会从配置系统获取
    return [];
  }

  /** 建议工作流 */
  private suggestWorkflow(
    requirement: UserRequirement,
    matchedPrompts: MatchedPrompt[]
  ): WorkflowSuggestion | undefined {
    // 基于需求自动规划工作流
    const steps: WorkflowSuggestion['steps'] = [];

    // 清洗步骤（如果需要）
    if (requirement.businessScenario === 'data_cleaning') {
      steps.push({
        stepOrder: 1,
        skillId: 'remove-duplicates',
        skillName: '去重',
        parameters: {},
        reason: '去除重复数据'
      });
      steps.push({
        stepOrder: 2,
        skillId: 'fill-missing-values',
        skillName: '缺失值填充',
        parameters: { strategy: 'mean' },
        reason: '补全缺失数据'
      });
      steps.push({
        stepOrder: 3,
        skillId: 'standardize-format',
        skillName: '格式标准化',
        parameters: {},
        reason: '统一数据格式'
      });
    }

    // 分析步骤
    if (requirement.businessScenario === 'data_analysis' || requirement.businessScenario === 'business_review') {
      steps.push({
        stepOrder: 1,
        skillId: 'calculate-statistics',
        skillName: '基础统计',
        parameters: { columns: requirement.dataRequirements.metrics },
        reason: '计算基础统计指标'
      });

      if (requirement.dataRequirements.dimensions.length > 0) {
        steps.push({
          stepOrder: 2,
          skillId: 'group-by-analysis',
          skillName: '分组分析',
          parameters: { groupBy: requirement.dataRequirements.dimensions[0] },
          reason: '按维度分组分析'
        });
      }

      steps.push({
        stepOrder: 3,
        skillId: 'generate-insights',
        skillName: '生成洞察',
        parameters: {},
        reason: 'AI生成业务洞察'
      });
    }

    if (steps.length === 0) {
      return undefined;
    }

    return {
      workflowId: 'auto-generated',
      workflowName: `自动生成-${requirement.businessScenario}`,
      steps,
      estimatedDuration: steps.length * 5,
      complexity: steps.length <= 2 ? 'low' : steps.length <= 4 ? 'medium' : 'high'
    };
  }
}

/** 创建默认实例 */
export function createIntentUnderstandingEngine(config?: IntentUnderstandingConfig): IntentUnderstandingEngine {
  return new IntentUnderstandingEngine(config);
}
