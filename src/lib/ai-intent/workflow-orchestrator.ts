/**
 * 智能工作流编排引擎
 * 基于用户需求自动规划、执行、调整工作流
 */

import type { UserRequirement } from './types';
import type { SkillDefinition, SkillContext, SkillResult } from '@/lib/skills/core/types';

export interface WorkflowPlan {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedDuration: number;
  complexity: 'low' | 'medium' | 'high';
  requiredSkills: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'skill' | 'condition' | 'parallel' | 'merge' | 'llm';
  skillId?: string;
  skillName?: string;
  parameters: Record<string, unknown>;
  dependsOn: string[];
  outputKey: string;
  optional: boolean;
  reason: string;
  estimatedDuration: number;
}

export interface ConditionBranch {
  condition: string;
  steps: string[];
}

export interface WorkflowExecutor {
  execute(plan: WorkflowPlan, context: WorkflowContext): Promise<WorkflowResult>;
  canExecute(step: WorkflowStep): boolean;
  getProgress(): number;
}

export interface WorkflowContext {
  data: Record<string, unknown>;
  userRequest: string;
  industry?: string;
  businessScenario?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowResult {
  success: boolean;
  outputs: Record<string, unknown>;
  stepResults: Map<string, StepResult>;
  duration: number;
  error?: string;
  recommendedActions?: string[];
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
  skillId?: string;
}

/** 工作流模板库 */
const WORKFLOW_TEMPLATES: Record<string, Omit<WorkflowPlan, 'id'>> = {
  'retail-sales-analysis': {
    name: '零售销售分析',
    description: '完整的零售销售数据分析流程',
    steps: [
      { id: 's1', name: '数据加载', type: 'skill', skillId: 'parse-data', parameters: {}, dependsOn: [], outputKey: 'parsedData', optional: false, reason: '加载数据', estimatedDuration: 2 },
      { id: 's2', name: '数据清洗', type: 'skill', skillId: 'clean-data', parameters: { operations: ['remove-duplicates', 'fill-missing'] }, dependsOn: ['s1'], outputKey: 'cleanedData', optional: false, reason: '清洗脏数据', estimatedDuration: 5 },
      { id: 's3', name: '销售统计', type: 'skill', skillId: 'calculate-statistics', parameters: { metrics: ['销售额', '销量', '客单价'] }, dependsOn: ['s2'], outputKey: 'salesStats', optional: false, reason: '计算核心指标', estimatedDuration: 3 },
      { id: 's4', name: '分组分析', type: 'skill', skillId: 'group-by-analysis', parameters: { groupBy: '商品', metrics: ['销售额'] }, dependsOn: ['s3'], outputKey: 'groupedData', optional: false, reason: '按维度分组', estimatedDuration: 3 },
      { id: 's5', name: '趋势分析', type: 'skill', skillId: 'trend-analysis', parameters: { timeColumn: '日期', valueColumn: '销售额' }, dependsOn: ['s4'], outputKey: 'trendData', optional: true, reason: '分析销售趋势', estimatedDuration: 5 },
      { id: 's6', name: '生成洞察', type: 'llm', parameters: { promptType: 'sales-insight' }, dependsOn: ['s3', 's4', 's5'], outputKey: 'insights', optional: false, reason: 'AI生成业务洞察', estimatedDuration: 10 }
    ],
    estimatedDuration: 28,
    complexity: 'medium',
    requiredSkills: ['parse-data', 'clean-data', 'calculate-statistics', 'group-by-analysis', 'trend-analysis', 'generate-insights'],
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  },
  'table-generation': {
    name: '智能表格生成',
    description: '根据需求生成结构化表格',
    steps: [
      { id: 's1', name: '需求理解', type: 'llm', parameters: { promptType: 'table-requirement-understanding' }, dependsOn: [], outputKey: 'tableSpec', optional: false, reason: '理解表格需求', estimatedDuration: 5 },
      { id: 's2', name: '结构设计', type: 'llm', parameters: { promptType: 'table-structure-design' }, dependsOn: ['s1'], outputKey: 'tableStructure', optional: false, reason: '设计表头和字段', estimatedDuration: 5 },
      { id: 's3', name: '数据生成', type: 'skill', skillId: 'generate-sample-data', parameters: {}, dependsOn: ['s2'], outputKey: 'generatedData', optional: false, reason: '生成表格数据', estimatedDuration: 3 }
    ],
    estimatedDuration: 13,
    complexity: 'low',
    requiredSkills: ['generate-sample-data'],
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  },
  'data-cleaning': {
    name: '数据清洗流程',
    description: '完整的数据清洗与标准化',
    steps: [
      { id: 's1', name: '数据质量检测', type: 'skill', skillId: 'detect-data-quality', parameters: {}, dependsOn: [], outputKey: 'qualityReport', optional: false, reason: '评估数据质量', estimatedDuration: 3 },
      { id: 's2', name: '去重处理', type: 'skill', skillId: 'remove-duplicates', parameters: {}, dependsOn: ['s1'], outputKey: 'deduplicatedData', optional: true, reason: '去除重复数据', estimatedDuration: 2 },
      { id: 's3', name: '缺失值处理', type: 'skill', skillId: 'fill-missing-values', parameters: { strategy: 'auto' }, dependsOn: ['s2'], outputKey: 'filledData', optional: true, reason: '填充缺失值', estimatedDuration: 3 },
      { id: 's4', name: '格式标准化', type: 'skill', skillId: 'standardize-format', parameters: {}, dependsOn: ['s3'], outputKey: 'standardizedData', optional: true, reason: '统一数据格式', estimatedDuration: 3 },
      { id: 's5', name: '异常值检测', type: 'skill', skillId: 'detect-outliers', parameters: {}, dependsOn: ['s4'], outputKey: 'outlierReport', optional: true, reason: '标记异常数据', estimatedDuration: 3 }
    ],
    estimatedDuration: 14,
    complexity: 'low',
    requiredSkills: ['detect-data-quality', 'remove-duplicates', 'fill-missing-values', 'standardize-format', 'detect-outliers'],
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  },
  'business-report': {
    name: '经营分析报告',
    description: '生成完整的经营分析报告',
    steps: [
      { id: 's1', name: '数据准备', type: 'skill', skillId: 'parse-data', parameters: {}, dependsOn: [], outputKey: 'parsedData', optional: false, reason: '加载数据', estimatedDuration: 2 },
      { id: 's2', name: 'KPI计算', type: 'skill', skillId: 'calculate-kpi', parameters: {}, dependsOn: ['s1'], outputKey: 'kpiData', optional: false, reason: '计算核心KPI', estimatedDuration: 5 },
      { id: 's3', name: '同比环比', type: 'skill', skillId: 'calculate-comparison', parameters: {}, dependsOn: ['s2'], outputKey: 'comparisonData', optional: false, reason: '计算同比环比', estimatedDuration: 3 },
      { id: 's4', name: '异常标注', type: 'skill', skillId: 'detect-anomalies', parameters: {}, dependsOn: ['s3'], outputKey: 'anomalyData', optional: true, reason: '标注异常点', estimatedDuration: 3 },
      { id: 's5', name: '报告生成', type: 'llm', parameters: { promptType: 'business-report' }, dependsOn: ['s2', 's3', 's4'], outputKey: 'report', optional: false, reason: '生成分析报告', estimatedDuration: 15 }
    ],
    estimatedDuration: 28,
    complexity: 'high',
    requiredSkills: ['parse-data', 'calculate-kpi', 'calculate-comparison', 'detect-anomalies', 'generate-insights'],
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' }
  }
};

/** 工作流规划器 */
export class WorkflowPlanner {
  /**
   * 基于用户需求规划工作流
   */
  plan(requirement: UserRequirement, availableSkills: SkillDefinition[]): WorkflowPlan {
    // 1. 尝试匹配模板
    const template = this.findMatchingTemplate(requirement);

    if (template) {
      return this.instantiateTemplate(template, requirement);
    }

    // 2. 动态规划
    return this.dynamicPlanning(requirement, availableSkills);
  }

  /**
   * 查找匹配的模板
   */
  private findMatchingTemplate(requirement: UserRequirement): string | undefined {
    const industry = requirement.industry;
    const scenario = requirement.businessScenario;

    // 精确匹配
    if (industry !== 'general') {
      const key = `${industry}-${scenario}`;
      if (WORKFLOW_TEMPLATES[key]) {
        return key;
      }
    }

    // 场景匹配
    if (WORKFLOW_TEMPLATES[scenario]) {
      return scenario;
    }

    // 默认模板
    return undefined;
  }

  /**
   * 实例化模板
   */
  private instantiateTemplate(templateKey: string, requirement: UserRequirement): WorkflowPlan {
    const template = WORKFLOW_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    // 克隆步骤并调整参数
    const steps = template.steps.map(step => ({
      ...step,
      parameters: this.adaptParameters(step.parameters, requirement)
    }));

    return {
      id: `wf-${Date.now()}`,
      name: template.name,
      description: template.description,
      steps,
      estimatedDuration: template.estimatedDuration,
      complexity: template.complexity,
      requiredSkills: template.requiredSkills,
      inputSchema: template.inputSchema,
      outputSchema: template.outputSchema
    };
  }

  /**
   * 适配参数
   */
  private adaptParameters(params: Record<string, unknown>, requirement: UserRequirement): Record<string, unknown> {
    const adapted = { ...params };

    // 适配指标
    if (adapted.metrics && Array.isArray(adapted.metrics)) {
      adapted.metrics = requirement.dataRequirements.metrics.length > 0
        ? requirement.dataRequirements.metrics
        : adapted.metrics;
    }

    // 适配维度
    if (adapted.groupBy && typeof adapted.groupBy === 'string') {
      adapted.groupBy = requirement.dataRequirements.dimensions.length > 0
        ? requirement.dataRequirements.dimensions[0]
        : adapted.groupBy;
    }

    return adapted;
  }

  /**
   * 动态规划
   */
  private dynamicPlanning(requirement: UserRequirement, availableSkills: SkillDefinition[]): WorkflowPlan {
    const steps: WorkflowStep[] = [];
    let stepId = 1;

    // 1. 数据加载步骤（如果需要数据）
    if (requirement.dataRequirements.metrics.length > 0 || requirement.dataRequirements.dimensions.length > 0) {
      steps.push({
        id: `s${stepId++}`,
        name: '数据准备',
        type: 'skill',
        skillId: 'parse-data',
        parameters: {},
        dependsOn: [],
        outputKey: 'parsedData',
        optional: false,
        reason: '准备分析数据',
        estimatedDuration: 2
      });
    }

    // 2. 根据意图类型添加步骤
    switch (requirement.intentType) {
      case 'clean':
        steps.push(...this.planCleaningSteps(requirement, stepId));
        break;
      case 'analyze':
      case 'generate':
        steps.push(...this.planAnalysisSteps(requirement, stepId));
        break;
      case 'visualize':
        steps.push(...this.planVisualizationSteps(requirement, stepId));
        break;
      case 'report':
        steps.push(...this.planReportSteps(requirement, stepId));
        break;
      default:
        steps.push(...this.planGeneralSteps(requirement, stepId));
    }

    // 3. 生成洞察步骤
    if (requirement.outputExpectation.needInsights) {
      const lastStep = steps[steps.length - 1];
      steps.push({
        id: `s${stepId}`,
        name: '生成洞察',
        type: 'llm',
        parameters: { promptType: 'insight-generation' },
        dependsOn: lastStep ? [lastStep.id] : [],
        outputKey: 'insights',
        optional: false,
        reason: 'AI生成业务洞察和建议',
        estimatedDuration: 10
      });
    }

    return {
      id: `wf-dynamic-${Date.now()}`,
      name: `动态规划-${requirement.businessScenario}`,
      description: `基于需求动态生成的工作流`,
      steps,
      estimatedDuration: steps.reduce((sum, s) => sum + s.estimatedDuration, 0),
      complexity: steps.length <= 3 ? 'low' : steps.length <= 6 ? 'medium' : 'high',
      requiredSkills: steps.filter(s => s.type === 'skill').map(s => s.skillId!),
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' }
    };
  }

  /**
   * 规划清洗步骤
   */
  private planCleaningSteps(requirement: UserRequirement, startId: number): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    let id = startId;

    steps.push({
      id: `s${id++}`,
      name: '数据质量检测',
      type: 'skill',
      skillId: 'detect-data-quality',
      parameters: {},
      dependsOn: [],
      outputKey: 'qualityReport',
      optional: false,
      reason: '评估数据质量现状',
      estimatedDuration: 3
    });

    steps.push({
      id: `s${id++}`,
      name: '去重处理',
      type: 'skill',
      skillId: 'remove-duplicates',
      parameters: {},
      dependsOn: [`s${id - 1}`],
      outputKey: 'deduplicatedData',
      optional: true,
      reason: '去除重复记录',
      estimatedDuration: 2
    });

    steps.push({
      id: `s${id}`,
      name: '格式标准化',
      type: 'skill',
      skillId: 'standardize-format',
      parameters: {},
      dependsOn: [`s${id - 1}`],
      outputKey: 'cleanedData',
      optional: false,
      reason: '统一数据格式',
      estimatedDuration: 3
    });

    return steps;
  }

  /**
   * 规划分析步骤
   */
  private planAnalysisSteps(requirement: UserRequirement, startId: number): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    let id = startId;

    // 基础统计
    steps.push({
      id: `s${id++}`,
      name: '基础统计',
      type: 'skill',
      skillId: 'calculate-statistics',
      parameters: { columns: requirement.dataRequirements.metrics },
      dependsOn: [],
      outputKey: 'basicStats',
      optional: false,
      reason: '计算基础统计指标',
      estimatedDuration: 3
    });

    // 分组分析（如果有维度）
    if (requirement.dataRequirements.dimensions.length > 0) {
      steps.push({
        id: `s${id++}`,
        name: '分组分析',
        type: 'skill',
        skillId: 'group-by-analysis',
        parameters: { groupBy: requirement.dataRequirements.dimensions[0] },
        dependsOn: [`s${id - 2}`],
        outputKey: 'groupedStats',
        optional: false,
        reason: '按维度分组分析',
        estimatedDuration: 3
      });
    }

    return steps;
  }

  /**
   * 规划可视化步骤
   */
  private planVisualizationSteps(requirement: UserRequirement, startId: number): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    let id = startId;

    steps.push({
      id: `s${id++}`,
      name: '数据准备',
      type: 'skill',
      skillId: 'prepare-visualization-data',
      parameters: {},
      dependsOn: [],
      outputKey: 'vizData',
      optional: false,
      reason: '准备可视化数据',
      estimatedDuration: 2
    });

    steps.push({
      id: `s${id++}`,
      name: '图表生成',
      type: 'skill',
      skillId: 'create-chart',
      parameters: { chartType: requirement.outputExpectation.format === 'chart' ? 'auto' : 'bar' },
      dependsOn: [`s${id - 1}`],
      outputKey: 'chart',
      optional: false,
      reason: '生成数据图表',
      estimatedDuration: 5
    });

    return steps;
  }

  /**
   * 规划报告步骤
   */
  private planReportSteps(requirement: UserRequirement, startId: number): WorkflowStep[] {
    return this.planAnalysisSteps(requirement, startId);
  }

  /**
   * 规划通用步骤
   */
  private planGeneralSteps(requirement: UserRequirement, startId: number): WorkflowStep[] {
    return [{
      id: `s${startId}`,
      name: '智能处理',
      type: 'llm',
      parameters: { promptType: 'general' },
      dependsOn: [],
      outputKey: 'result',
      optional: false,
      reason: '根据需求智能处理',
      estimatedDuration: 10
    }];
  }

  /**
   * 获取所有模板
   */
  listTemplates(): { id: string; name: string; description: string; complexity: string }[] {
    return Object.entries(WORKFLOW_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      complexity: template.complexity
    }));
  }
}

/** 工作流执行器 */
export class WorkflowExecutor {
  private currentStepIndex = 0;
  private stepResults: Map<string, StepResult> = new Map();
  private cancelled = false;

  constructor(
    private skillExecutor: (skillId: string, params: Record<string, unknown>, context: SkillContext) => Promise<SkillResult>,
    private llmCaller: (prompt: string, params: Record<string, unknown>) => Promise<unknown>
  ) {}

  /**
   * 执行工作流
   */
  async execute(plan: WorkflowPlan, context: WorkflowContext): Promise<WorkflowResult> {
    this.currentStepIndex = 0;
    this.stepResults.clear();
    this.cancelled = false;

    const startTime = Date.now();
    const outputs: Record<string, unknown> = {};
    const recommendedActions: string[] = [];

    // 按依赖顺序执行步骤
    for (const step of plan.steps) {
      if (this.cancelled) {
        break;
      }

      // 检查依赖是否满足
      const depsSatisfied = step.dependsOn.every(depId => {
        const depResult = this.stepResults.get(depId);
        return depResult && depResult.success;
      });

      if (!depsSatisfied && step.dependsOn.length > 0) {
        // 依赖失败，标记为失败
        this.stepResults.set(step.id, {
          stepId: step.id,
          success: false,
          output: null,
          error: `依赖步骤失败: ${step.dependsOn.join(', ')}`,
          duration: 0
        });
        continue;
      }

      // 执行步骤
      const stepStart = Date.now();
      try {
        const result = await this.executeStep(step, context, outputs);
        const duration = Date.now() - stepStart;

        this.stepResults.set(step.id, {
          stepId: step.id,
          success: result.success,
          output: result.output,
          error: result.error,
          duration,
          skillId: step.skillId
        });

        if (result.success) {
          outputs[step.outputKey] = result.output;
        }
      } catch (error) {
        this.stepResults.set(step.id, {
          stepId: step.id,
          success: false,
          output: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - stepStart
        });

        if (!step.optional) {
          // 非可选步骤失败，整个工作流失败
          return {
            success: false,
            outputs,
            stepResults: this.stepResults,
            duration: Date.now() - startTime,
            error: `步骤 ${step.name} 失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
            recommendedActions: this.generateRecommendations(plan, this.stepResults)
          };
        }
      }

      this.currentStepIndex++;
    }

    return {
      success: true,
      outputs,
      stepResults: this.stepResults,
      duration: Date.now() - startTime,
      recommendedActions: this.generateFinalRecommendations(outputs)
    };
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    previousOutputs: Record<string, unknown>
  ): Promise<{ success: boolean; output: unknown; error?: string }> {
    switch (step.type) {
      case 'skill':
        if (!step.skillId) {
          return { success: false, output: null, error: 'No skillId specified' };
        }
        const skillContext: SkillContext = {
          sessionId: '',
          scene: context.businessScenario || 'general',
          userRequest: context.userRequest,
          metadata: context.metadata
        };
        const skillResult = await this.skillExecutor(step.skillId, step.parameters, skillContext);
        return {
          success: skillResult.success,
          output: skillResult.data,
          error: skillResult.error
        };

      case 'llm':
        const llmResult = await this.llmCaller(step.parameters.promptType as string, {
          ...step.parameters,
          context: previousOutputs,
          userRequest: context.userRequest
        });
        return { success: true, output: llmResult };

      default:
        return { success: true, output: previousOutputs };
    }
  }

  /**
   * 生成推荐动作
   */
  private generateRecommendations(plan: WorkflowPlan, results: Map<string, StepResult>): string[] {
    const recommendations: string[] = [];

    for (const [stepId, result] of results) {
      if (!result.success) {
        const step = plan.steps.find(s => s.id === stepId);
        if (step) {
          recommendations.push(`重试步骤"${step.name}}"或跳过该步骤`);
        }
      }
    }

    return recommendations;
  }

  /**
   * 生成最终推荐
   */
  private generateFinalRecommendations(outputs: Record<string, unknown>): string[] {
    const recommendations: string[] = [];

    if (outputs.insights) {
      recommendations.push('查看生成的数据洞察');
    }
    if (outputs.chart) {
      recommendations.push('可视化图表已生成，可调整图表类型');
    }
    if (outputs.cleanedData) {
      recommendations.push('数据已清洗，可继续进行分析');
    }

    return recommendations;
  }

  /**
   * 取消执行
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * 获取进度
   */
  getProgress(): number {
    return this.currentStepIndex;
  }
}

/** 全局工作流规划器 */
export const workflowPlanner = new WorkflowPlanner();
