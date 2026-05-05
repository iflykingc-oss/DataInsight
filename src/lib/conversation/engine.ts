/**
 * 对话式分析引擎
 * 多轮对话、上下文理解、智能推荐、渐进式分析
 */

import type {
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  ConversationConfig,
  DataContext,
  AnalysisContext,
} from './types';
import type { UserRequirement } from '@/lib/ai-intent/types';
import { createIntentUnderstandingEngine } from '@/lib/ai-intent';
import { promptCompiler } from '@/lib/ai-intent/prompt-compiler';
import { workflowPlanner } from '@/lib/ai-intent/workflow-orchestrator';
import { smartInsightEngine } from '@/lib/advanced-analytics/smart-insights';
import { logger } from '@/lib/monitoring/logger';

export class ConversationEngine {
  private contexts: Map<string, ConversationContext> = new Map();
  private intentEngine = createIntentUnderstandingEngine({
    enableDeepUnderstanding: true,
    autoDetectIndustry: true,
    proactiveClarification: true,
    minConfidenceThreshold: 0.6,
  });

  private config: ConversationConfig = {
    maxHistoryLength: 20,
    enableContextMemory: true,
    enableProactiveInsights: true,
    enableFollowUpSuggestions: true,
    language: 'zh',
    responseStyle: 'detailed',
  };

  /**
   * 创建新会话
   */
  createSession(userId?: string): string {
    const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: ConversationContext = {
      sessionId,
      userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.contexts.set(sessionId, context);
    logger.info('ConversationEngine', `Created session: ${sessionId}`, { userId });

    return sessionId;
  }

  /**
   * 发送消息并获取回复
   */
  async sendMessage(
    sessionId: string,
    message: string,
    data?: { headers: string[]; rows: Record<string, unknown>[] }
  ): Promise<ConversationResponse> {
    const context = this.getContext(sessionId);
    if (!context) {
      return {
        message: '会话已过期，请重新开始',
        type: 'text',
      };
    }

    const timer = logger.createTimer('ConversationEngine', 'processMessage');

    try {
      // 1. 添加上下文理解
      const enrichedMessage = this.enrichWithContext(message, context);

      // 2. 记录用户消息
      const userMsg: ConversationMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      context.messages.push(userMsg);

      // 3. 意图理解（结合上下文）
      const intentResult = await this.intentEngine.understand(enrichedMessage, data);

      // 4. 生成回复
      const response = await this.generateResponse(intentResult, context, data);

      // 5. 记录助手消息
      const assistantMsg: ConversationMessage = {
        id: `msg_${Date.now()}_resp`,
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        metadata: {
          intent: intentResult.requirement?.intentType,
          industry: intentResult.requirement?.industry,
          confidence: intentResult.requirement?.confidence,
        },
      };
      context.messages.push(assistantMsg);

      // 6. 更新上下文
      context.updatedAt = Date.now();
      this.updateDataContext(context, data);
      this.updateAnalysisContext(context, response);

      // 7. 清理历史
      this.trimHistory(context);

      timer();
      return response;
    } catch (error) {
      logger.error('ConversationEngine', 'Failed to process message', error instanceof Error ? error : new Error(String(error)), {
        sessionId,
        message: message.substring(0, 100),
      });

      return {
        message: '抱歉，处理您的请求时出现了问题。请重试或换一种方式描述您的需求。',
        type: 'text',
        suggestions: [
          '简化您的问题',
          '提供更具体的数据描述',
          '尝试使用不同的关键词',
        ],
      };
    }
  }

  /**
   * 结合上下文丰富用户消息
   */
  private enrichWithContext(message: string, context: ConversationContext): string {
    if (!this.config.enableContextMemory || context.messages.length === 0) {
      return message;
    }

    const recentMessages = context.messages.slice(-3);
    const hasContext = recentMessages.some(m => m.role === 'assistant');

    if (!hasContext) return message;

    // 检测指代和省略
    const pronouns = ['这', '那', '它', '这个', '那个', '上述', '前面', '刚才'];
    const hasPronoun = pronouns.some(p => message.includes(p));

    if (hasPronoun || message.length < 10) {
      // 需要上下文补充
      const lastTopic = this.extractLastTopic(context);
      return `${message}（上下文：${lastTopic}）`;
    }

    return message;
  }

  /**
   * 提取最近的主题
   */
  private extractLastTopic(context: ConversationContext): string {
    const lastAssistantMsg = [...context.messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      return lastAssistantMsg.content.substring(0, 100);
    }
    return '';
  }

  /**
   * 生成回复
   */
  private async generateResponse(
    intentResult: Awaited<ReturnType<typeof this.intentEngine.understand>>,
    context: ConversationContext,
    data?: { headers: string[]; rows: Record<string, unknown>[] }
  ): Promise<ConversationResponse> {
    const requirement = intentResult.requirement;

    if (!requirement) {
      return {
        message: '我没有理解您的需求，能否请您更详细地描述一下？',
        type: 'clarification',
        suggestions: [
          '我想分析销售数据',
          '帮我生成一个表格',
          '清洗这些数据',
        ],
      };
    }

    // 需要澄清
    if (requirement.needClarification && requirement.clarificationQuestions) {
      return {
        message: '为了更好地帮助您，我需要确认几个信息：',
        type: 'clarification',
        followUpQuestions: requirement.clarificationQuestions.map(q => q.question),
      };
    }

    // 编译Prompt
    const compiledPrompt = promptCompiler.compile(requirement);

    // 规划工作流
    const workflow = workflowPlanner.plan(requirement, []);

    // 生成智能洞察（如果启用）
    let insights;
    if (this.config.enableProactiveInsights && data) {
      insights = await smartInsightEngine.generateInsights(data.rows.slice(0, 1000), {
        autoDetect: true,
        types: ['anomaly', 'trend', 'correlation'],
        minConfidence: 0.7,
        maxInsights: 5,
      });
    }

    // 构建回复
    const response: ConversationResponse = {
      message: this.buildResponseMessage(requirement, compiledPrompt, workflow),
      type: this.determineResponseType(requirement),
      insights,
      suggestions: this.generateFollowUpSuggestions(requirement, context),
      actions: this.generateActions(requirement),
    };

    // 如果有数据，添加数据引用
    if (data) {
      response.data = {
        headers: data.headers,
        rowCount: data.rows.length,
        preview: data.rows.slice(0, 5),
      };
    }

    return response;
  }

  /**
   * 构建回复消息
   */
  private buildResponseMessage(
    requirement: NonNullable<UserRequirement>,
    compiledPrompt: ReturnType<typeof promptCompiler.compile>,
    workflow: ReturnType<typeof workflowPlanner.plan>
  ): string {
    const parts: string[] = [];

    // 确认理解
    parts.push(`已理解您的需求：${requirement.rawRequest}`);

    // 识别信息
    if (requirement.industry !== 'general') {
      parts.push(`识别行业：${this.getIndustryName(requirement.industry)}`);
    }
    parts.push(`分析场景：${this.getScenarioName(requirement.businessScenario)}`);

    // 执行计划
    parts.push(`\n执行计划：`);
    workflow.steps.forEach((step, i) => {
      parts.push(`${i + 1}. ${step.name} - ${step.reason}`);
    });

    // 预期输出
    parts.push(`\n预计输出：${this.getOutputDescription(requirement.outputExpectation)}`);

    return parts.join('\n');
  }

  /**
   * 确定回复类型
   */
  private determineResponseType(requirement: NonNullable<UserRequirement>): ConversationResponse['type'] {
    switch (requirement.businessScenario) {
      case 'table_generation':
        return 'table';
      case 'visualization':
        return 'chart';
      case 'data_analysis':
      case 'business_review':
        return 'insight';
      default:
        return 'text';
    }
  }

  /**
   * 生成后续建议
   */
  private generateFollowUpSuggestions(
    requirement: NonNullable<UserRequirement>,
    context: ConversationContext
  ): string[] {
    const suggestions: string[] = [];

    // 基于当前意图的建议
    switch (requirement.businessScenario) {
      case 'data_analysis':
        suggestions.push('查看详细的数据分布');
        suggestions.push('对比不同时间段的差异');
        suggestions.push('找出影响最大的因素');
        break;
      case 'table_generation':
        suggestions.push('调整表格字段');
        suggestions.push('添加更多示例数据');
        suggestions.push('导出为Excel格式');
        break;
      case 'data_cleaning':
        suggestions.push('查看清洗前后的对比');
        suggestions.push('处理剩余的异常值');
        suggestions.push('保存清洗规则');
        break;
      case 'visualization':
        suggestions.push('切换图表类型');
        suggestions.push('调整配色方案');
        suggestions.push('添加数据标签');
        break;
      default:
        suggestions.push('深入分析某个维度');
        suggestions.push('对比不同分组');
        suggestions.push('生成可视化图表');
    }

    // 基于上下文的个性化建议
    if (context.analysisContext?.insights && context.analysisContext.insights.length > 0) {
      suggestions.push('查看之前发现的异常');
    }

    return suggestions.slice(0, 4);
  }

  /**
   * 生成可执行操作
   */
  private generateActions(requirement: NonNullable<UserRequirement>): Array<{ label: string; action: string; params?: Record<string, unknown> }> {
    const actions: Array<{ label: string; action: string; params?: Record<string, unknown> }> = [];

    actions.push({
      label: '执行分析',
      action: 'execute_analysis',
      params: { scenario: requirement.businessScenario },
    });

    actions.push({
      label: '调整参数',
      action: 'adjust_params',
    });

    if (requirement.outputExpectation.format === 'chart') {
      actions.push({
        label: '预览图表',
        action: 'preview_chart',
      });
    }

    return actions;
  }

  /**
   * 更新数据上下文
   */
  private updateDataContext(context: ConversationContext, data?: { headers: string[]; rows: Record<string, unknown>[] }): void {
    if (!data) return;

    context.dataContext = {
      currentDataset: {
        id: `ds_${Date.now()}`,
        name: '当前数据集',
        headers: data.headers,
        rowCount: data.rows.length,
        sample: data.rows.slice(0, 5),
      },
    };
  }

  /**
   * 更新分析上下文
   */
  private updateAnalysisContext(context: ConversationContext, response: ConversationResponse): void {
    if (!context.analysisContext) {
      context.analysisContext = {};
    }

    if (response.insights) {
      context.analysisContext.insights = response.insights.map(i => ({
        id: i.id,
        type: i.type,
        description: i.description,
        timestamp: Date.now(),
      }));
    }
  }

  /**
   * 清理历史消息
   */
  private trimHistory(context: ConversationContext): void {
    if (context.messages.length > this.config.maxHistoryLength * 2) {
      // 保留最近的对话
      context.messages = context.messages.slice(-this.config.maxHistoryLength * 2);
    }
  }

  /**
   * 获取上下文
   */
  getContext(sessionId: string): ConversationContext | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * 获取会话历史
   */
  getHistory(sessionId: string): ConversationMessage[] {
    const context = this.contexts.get(sessionId);
    return context?.messages || [];
  }

  /**
   * 清除会话
   */
  clearSession(sessionId: string): void {
    this.contexts.delete(sessionId);
    logger.info('ConversationEngine', `Cleared session: ${sessionId}`);
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private getIndustryName(industry: string): string {
    const names: Record<string, string> = {
      retail: '零售/商超',
      restaurant: '餐饮',
      healthcare: '医疗/医药',
      logistics: '物流/快递',
      real_estate: '房地产',
      energy: '能源/电力',
      cross_border: '跨境电商',
      education: '教育培训',
      manufacturing: '制造业',
      finance: '金融',
      hr: '人力资源',
      general: '通用',
    };
    return names[industry] || industry;
  }

  private getScenarioName(scenario: string): string {
    const names: Record<string, string> = {
      table_generation: '表格生成',
      data_cleaning: '数据清洗',
      data_analysis: '数据分析',
      visualization: '数据可视化',
      report: '报表生成',
      formula: '公式生成',
      business_review: '经营分析',
      performance_review: '绩效分析',
      customer_analysis: '客户分析',
      supply_chain: '供应链分析',
      risk_control: '风险控制',
      general: '通用处理',
    };
    return names[scenario] || scenario;
  }

  private getOutputDescription(expectation: { format: string; detailLevel: string; needInsights: boolean; needSuggestions: boolean }): string {
    const parts: string[] = [];
    parts.push(expectation.detailLevel === 'summary' ? '概要' : expectation.detailLevel === 'detailed' ? '详细' : '全面');
    parts.push(expectation.format === 'chart' ? '图表' : expectation.format === 'table' ? '表格' : '报告');
    if (expectation.needInsights) parts.push('含洞察');
    if (expectation.needSuggestions) parts.push('含建议');
    return parts.join('、');
  }
}

export const conversationEngine = new ConversationEngine();
