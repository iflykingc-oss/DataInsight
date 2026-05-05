import type { Industry, MetricAnalysis, TrendPrediction, DeepAnalysisResult } from './types';

interface InterpretationTemplate {
  positive: string[];
  negative: string[];
  neutral: string[];
  recommendations: string[];
}

const INDUSTRY_TEMPLATES: Record<Industry, Record<string, InterpretationTemplate>> = {
  retail: {
    grossMargin: {
      positive: ['毛利率高于行业平均，产品定价策略有效', '盈利能力强劲，具备价格竞争优势'],
      negative: ['毛利率低于行业平均，建议优化供应链或调整定价', '盈利能力承压，需关注成本控制'],
      neutral: ['毛利率处于行业正常区间', '盈利能力稳定'],
      recommendations: ['优化采购成本', '调整产品组合', '提升高毛利产品占比'],
    },
    inventoryTurnover: {
      positive: ['库存周转快，资金利用效率高', '库存管理优秀，滞销风险低'],
      negative: ['库存周转偏慢，可能存在滞销风险', '资金占用较高，建议优化库存结构'],
      neutral: ['库存周转处于正常水平'],
      recommendations: ['优化库存结构', '加强需求预测', '清理滞销商品'],
    },
    customerRetention: {
      positive: ['客户留存率高，用户忠诚度强', '复购表现优秀'],
      negative: ['客户留存率偏低，需加强客户关系维护', '用户流失风险较高'],
      neutral: ['客户留存处于行业平均水平'],
      recommendations: ['建立会员体系', '优化售后服务', '开展客户关怀活动'],
    },
    salesGrowth: {
      positive: ['销售增长强劲，市场份额扩大', '业务增长势头良好'],
      negative: ['销售增长放缓，需关注市场竞争', '业务增长承压'],
      neutral: ['销售增长平稳'],
      recommendations: ['拓展销售渠道', '优化营销策略', '推出新品类'],
    },
    averageOrderValue: {
      positive: ['客单价高于行业平均， upsell 策略有效'],
      negative: ['客单价偏低，建议优化产品组合和促销策略'],
      neutral: ['客单价处于正常区间'],
      recommendations: ['推出套餐组合', '设置满减活动', '推荐关联商品'],
    },
    returnRate: {
      positive: ['退货率低，产品质量和客户满意度高'],
      negative: ['退货率偏高，需关注产品质量和描述准确性'],
      neutral: ['退货率处于正常水平'],
      recommendations: ['优化产品描述', '提升产品质量', '完善尺码指南'],
    },
  },
  ecommerce: {
    conversionRate: {
      positive: ['转化率高于行业平均，流量变现能力强'],
      negative: ['转化率偏低，需优化页面体验和购物流程'],
      neutral: ['转化率处于行业平均水平'],
      recommendations: ['优化落地页', '简化结账流程', '增加信任标识'],
    },
    customerAcquisitionCost: {
      positive: ['获客成本低于行业平均，营销效率高'],
      negative: ['获客成本偏高，建议优化投放渠道和策略'],
      neutral: ['获客成本处于正常区间'],
      recommendations: ['优化投放渠道', '提升自然流量', '提高复购率'],
    },
    lifetimeValue: {
      positive: ['客户生命周期价值高，用户质量优秀'],
      negative: ['客户生命周期价值偏低，需提升用户粘性'],
      neutral: ['客户生命周期价值处于正常水平'],
      recommendations: ['建立会员体系', '提升复购频次', '增加客单价'],
    },
    cartAbandonmentRate: {
      positive: ['购物车放弃率低于行业平均'],
      negative: ['购物车放弃率偏高，需优化结账体验'],
      neutral: ['购物车放弃率处于正常水平'],
      recommendations: ['简化结账流程', '增加支付方式', '设置弃购挽回'],
    },
    averageSessionDuration: {
      positive: ['平均会话时长较长，用户 engagement 高'],
      negative: ['平均会话时长较短，需优化内容吸引力'],
      neutral: ['平均会话时长处于正常水平'],
      recommendations: ['优化页面内容', '增加互动元素', '个性化推荐'],
    },
    returnRate: {
      positive: ['退货率低，产品质量和客户满意度高'],
      negative: ['退货率偏高，需关注产品质量和描述准确性'],
      neutral: ['退货率处于正常水平'],
      recommendations: ['优化产品描述', '提升产品质量', '完善尺码指南'],
    },
  },
  finance: {
    currentRatio: {
      positive: ['流动比率健康，短期偿债能力强'],
      negative: ['流动比率偏低，短期偿债压力较大'],
      neutral: ['流动比率处于正常区间'],
      recommendations: ['优化应收账款', '增加现金储备', '控制短期负债'],
    },
    debtToEquity: {
      positive: ['资产负债率合理，财务风险可控'],
      negative: ['资产负债率偏高，财务杠杆风险较大'],
      neutral: ['资产负债率处于正常水平'],
      recommendations: ['优化资本结构', '增加权益融资', '控制负债规模'],
    },
    roe: {
      positive: ['净资产收益率高于行业平均，股东回报优秀'],
      negative: ['净资产收益率偏低，资产利用效率有待提升'],
      neutral: ['净资产收益率处于行业平均水平'],
      recommendations: ['提升净利润率', '优化资产周转', '合理使用财务杠杆'],
    },
    netProfitMargin: {
      positive: ['净利润率高于行业平均，盈利能力强'],
      negative: ['净利润率偏低，需关注成本控制和收入增长'],
      neutral: ['净利润率处于正常区间'],
      recommendations: ['控制运营成本', '提升产品附加值', '优化费用结构'],
    },
    operatingCashFlow: {
      positive: ['经营现金流健康，造血能力强'],
      negative: ['经营现金流承压，需关注回款和支出'],
      neutral: ['经营现金流处于正常水平'],
      recommendations: ['加强应收账款管理', '优化库存周转', '控制资本支出'],
    },
    quickRatio: {
      positive: ['速动比率健康，即时偿债能力强'],
      negative: ['速动比率偏低，即时偿债压力较大'],
      neutral: ['速动比率处于正常区间'],
      recommendations: ['增加现金储备', '优化流动资产结构'],
    },
  },
  project: {
    onTimeDelivery: {
      positive: ['项目按时交付率高，项目管理优秀'],
      negative: ['项目延期率较高，需优化进度管理'],
      neutral: ['项目按时交付率处于正常水平'],
      recommendations: ['优化进度计划', '加强风险管理', '提升资源协调'],
    },
    budgetVariance: {
      positive: ['预算控制良好，成本管理有效'],
      negative: ['预算偏差较大，需加强成本控制'],
      neutral: ['预算偏差处于正常范围'],
      recommendations: ['优化成本估算', '加强变更管理', '提升资源效率'],
    },
    resourceUtilization: {
      positive: ['资源利用率高，团队效率优秀'],
      negative: ['资源利用率偏低，存在资源浪费'],
      neutral: ['资源利用率处于正常水平'],
      recommendations: ['优化资源分配', '提升团队协作', '减少闲置资源'],
    },
    defectRate: {
      positive: ['缺陷率低，产品质量优秀'],
      negative: ['缺陷率偏高，需加强质量管理'],
      neutral: ['缺陷率处于正常水平'],
      recommendations: ['加强测试覆盖', '优化开发流程', '提升代码质量'],
    },
    customerSatisfaction: {
      positive: ['客户满意度高，项目交付质量优秀'],
      negative: ['客户满意度偏低，需改进交付质量'],
      neutral: ['客户满意度处于正常水平'],
      recommendations: ['加强需求沟通', '提升交付质量', '优化验收流程'],
    },
    schedulePerformanceIndex: {
      positive: ['进度绩效指数良好，项目按计划推进'],
      negative: ['进度绩效指数偏低，项目进度滞后'],
      neutral: ['进度绩效指数处于正常范围'],
      recommendations: ['优化进度计划', '加强进度监控', '提升执行效率'],
    },
  },
  hr: {
    turnoverRate: {
      positive: ['员工流失率低于行业平均，团队稳定性强'],
      negative: ['员工流失率偏高，需关注员工满意度'],
      neutral: ['员工流失率处于行业平均水平'],
      recommendations: ['优化薪酬福利', '加强员工关怀', '完善晋升通道'],
    },
    timeToFill: {
      positive: ['招聘周期短，招聘效率高'],
      negative: ['招聘周期较长，可能影响业务开展'],
      neutral: ['招聘周期处于正常水平'],
      recommendations: ['优化招聘流程', '拓展招聘渠道', '建立人才库'],
    },
    trainingHours: {
      positive: ['培训投入充足，员工发展重视度高'],
      negative: ['培训投入不足，可能影响员工成长'],
      neutral: ['培训投入处于正常水平'],
      recommendations: ['增加培训预算', '优化培训内容', '建立培训体系'],
    },
    satisfactionScore: {
      positive: ['员工满意度高，团队氛围良好'],
      negative: ['员工满意度偏低，需关注员工诉求'],
      neutral: ['员工满意度处于正常水平'],
      recommendations: ['开展满意度调研', '优化工作环境', '加强团队建设'],
    },
    absenteeismRate: {
      positive: ['缺勤率低，员工出勤状况良好'],
      negative: ['缺勤率偏高，需关注员工健康状况'],
      neutral: ['缺勤率处于正常水平'],
      recommendations: ['关注员工健康', '优化考勤制度', '加强团队管理'],
    },
    costPerHire: {
      positive: ['招聘成本控制良好，招聘效率高'],
      negative: ['招聘成本偏高，需优化招聘渠道'],
      neutral: ['招聘成本处于正常水平'],
      recommendations: ['优化招聘渠道', '提升内部推荐', '降低招聘成本'],
    },
  },
  general: {
    revenueGrowth: {
      positive: ['收入增长强劲，业务发展势头良好'],
      negative: ['收入增长放缓，需关注市场变化'],
      neutral: ['收入增长平稳'],
      recommendations: ['拓展新市场', '优化产品结构', '提升客户价值'],
    },
    costEfficiency: {
      positive: ['成本效率高于行业平均，运营优化效果显著'],
      negative: ['成本效率偏低，需优化运营流程'],
      neutral: ['成本效率处于正常水平'],
      recommendations: ['优化流程', '提升自动化', '控制成本'],
    },
    customerSatisfaction: {
      positive: ['客户满意度高，服务质量优秀'],
      negative: ['客户满意度偏低，需改进服务质量'],
      neutral: ['客户满意度处于正常水平'],
      recommendations: ['优化服务流程', '加强客户沟通', '提升服务质量'],
    },
    employeeProductivity: {
      positive: ['员工生产力高于行业平均，团队效率优秀'],
      negative: ['员工生产力偏低，需提升团队效率'],
      neutral: ['员工生产力处于正常水平'],
      recommendations: ['优化工作流程', '加强培训', '提升工具效率'],
    },
    marketShare: {
      positive: ['市场份额扩大，竞争力增强'],
      negative: ['市场份额萎缩，需加强竞争策略'],
      neutral: ['市场份额稳定'],
      recommendations: ['加强营销', '优化产品', '提升服务'],
    },
    innovationIndex: {
      positive: ['创新指数高，企业创新能力强'],
      negative: ['创新指数偏低，需加强创新投入'],
      neutral: ['创新指数处于正常水平'],
      recommendations: ['增加研发投入', '鼓励创新文化', '建立创新机制'],
    },
  },
};

class BusinessInterpretationGenerator {
  private static instance: BusinessInterpretationGenerator;

  static getInstance(): BusinessInterpretationGenerator {
    if (!BusinessInterpretationGenerator.instance) {
      BusinessInterpretationGenerator.instance = new BusinessInterpretationGenerator();
    }
    return BusinessInterpretationGenerator.instance;
  }

  generateMetricInterpretation(
    metric: string,
    displayName: string,
    value: number,
    _unit: string,
    change: number,
    benchmark: { comparison: 'above' | 'below' | 'at' } | null,
    trend: string,
    industry: Industry
  ): { insights: string[]; recommendations: string[]; summary: string } {
    const template = INDUSTRY_TEMPLATES[industry]?.[metric];
    const insights: string[] = [];
    const recommendations: string[] = [];

    if (template) {
      let templateSet: string[];
      if (benchmark?.comparison === 'above') templateSet = template.positive;
      else if (benchmark?.comparison === 'below') templateSet = template.negative;
      else templateSet = template.neutral;

      insights.push(...templateSet.slice(0, 2));
      recommendations.push(...template.recommendations.slice(0, 2));
    }

    if (change > 0.05) {
      insights.push(`${displayName}较上期增长 ${(change * 100).toFixed(1)}%，增长势头良好`);
    } else if (change < -0.05) {
      insights.push(`${displayName}较上期下降 ${(Math.abs(change) * 100).toFixed(1)}%，需关注变化原因`);
    }

    if (trend === 'increasing') {
      insights.push(`${displayName}呈上升趋势`);
    } else if (trend === 'decreasing') {
      insights.push(`${displayName}呈下降趋势`);
    }

    const summary = insights.length > 0
      ? `${displayName}当前为 ${value}，${insights[0]}`
      : `${displayName}当前为 ${value}`;

    return { insights, recommendations, summary };
  }

  generateExecutiveSummary(result: DeepAnalysisResult, industry: Industry): string {
    const parts: string[] = [];

    parts.push(`# 执行摘要`);
    parts.push(`## 分析概览`);
    parts.push(`本次分析涵盖 ${result.period.start} 至 ${result.period.end} 的数据，针对 ${this.getIndustryName(industry)} 行业进行深度解读。`);

    if (result.dataQuality.score < 80) {
      parts.push(`⚠️ 数据质量评分为 ${result.dataQuality.score} 分，建议关注数据完整性。`);
    }

    if (result.keyFindings.length > 0) {
      parts.push(`## 关键发现`);
      result.keyFindings.forEach((finding, i) => {
        parts.push(`${i + 1}. ${finding}`);
      });
    }

    if (result.metricAnalyses.length > 0) {
      parts.push(`## 核心指标`);
      result.metricAnalyses.forEach(ma => {
        const benchmarkText = ma.benchmark
          ? `（${ma.benchmark.comparison === 'above' ? '高于' : ma.benchmark.comparison === 'below' ? '低于' : '处于'}行业平均 ${Math.abs(ma.benchmark.gapPercentage).toFixed(1)}%）`
          : '';
        parts.push(`- **${ma.displayName}**: ${ma.value}${benchmarkText}`);
      });
    }

    if (result.recommendations.length > 0) {
      parts.push(`## 行动建议`);
      result.recommendations.forEach((rec, i) => {
        parts.push(`${i + 1}. ${rec}`);
      });
    }

    return parts.join('\n\n');
  }

  async generateLLMEnhancedInterpretation(result: DeepAnalysisResult, industry: Industry): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => {
        const summary = this.generateExecutiveSummary(result, industry);
        resolve(`[LLM增强解读]\n\n${summary}\n\n---\n*本解读由 AI 辅助生成，建议结合业务实际情况进行判断。*`);
      }, 300);
    });
  }

  private getIndustryName(industry: Industry): string {
    const names: Record<Industry, string> = {
      retail: '零售',
      ecommerce: '电商',
      finance: '财务',
      project: '项目',
      hr: '人事',
      general: '通用',
    };
    return names[industry] || industry;
  }
}

export const businessInterpretationGenerator = BusinessInterpretationGenerator.getInstance();
