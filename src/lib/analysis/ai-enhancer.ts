/**
 * AI 增强分析层
 * 在现有 deep-analysis 统计算法之上，增加 AI 业务解读能力
 * 统计算法做精确计算，AI 做业务解读，两者互补
 * 直接复用现有 callLLM 函数，不做架构改动
 */

import { callLLM, callLLMStream, type LLMModelConfig, type LLMMessage } from '@/lib/llm';
import { buildSceneMessages, detectModelProvider, LLMScene } from '@/lib/llm/prompt-system';
import { sessionManager, type LLMSession } from '@/lib/llm/session-manager';
import {
  detectScene,
  getGenericAnalysisPrompt,
  summarizeDeepAnalysis,
  summarizeFieldStats,
  type AnalysisTemplate,
  type AnalysisStep,
  type AnalysisContext,
  AnalysisScene,
  SCENE_DISPLAY,
} from './scene-templates';
import type { DeepAnalysis, FieldStat } from '@/lib/data-processor/types';

/** 单个步骤的执行结果 */
export interface StepResult {
  stepId: string;
  stepName: string;
  content: string;
  recommendedChartTypes: string[];
  isRequired: boolean;
}

/** AI 增强分析的完整结果 */
export interface AIEnhancedResult {
  /** 匹配的分析模板（null 表示通用分析） */
  template: AnalysisTemplate | null;
  /** 识别到的场景 */
  scene: AnalysisScene;
  /** 各步骤的分析结果 */
  stepResults: StepResult[];
  /** AI 增强解读的汇总 */
  summary: string;
  /** 推荐图表类型（按优先级排序） */
  recommendedCharts: string[];
  /** 会话 ID（支持多轮对话） */
  sessionId: string;
}

/** 分析进度回调 */
export type AnalysisProgressCallback = (
  stepIndex: number,
  totalSteps: number,
  stepName: string,
  partialContent?: string
) => void;

/**
 * 执行 AI 增强分析
 * @param fieldNames 字段名列表
 * @param fieldStats 字段统计
 * @param deepAnalysis 深度分析结果
 * @param totalRows 总行数
 * @param modelConfig 模型配置
 * @param onProgress 进度回调
 * @param sessionId 可选会话 ID（支持多轮）
 */
export async function enhanceAnalysisWithAI(
  fieldNames: string[],
  fieldStats: FieldStat[],
  deepAnalysis: DeepAnalysis | undefined,
  totalRows: number,
  modelConfig: LLMModelConfig,
  onProgress?: AnalysisProgressCallback,
  sessionId?: string,
): Promise<AIEnhancedResult> {
  // 1. 场景识别
  const template = detectScene(fieldNames);
  const scene = template?.scene || AnalysisScene.CUSTOM;
  const provider = detectModelProvider(modelConfig.model, modelConfig.baseUrl);

  // 2. 创建或复用会话
  const session: LLMSession = sessionId
    ? sessionManager.getOrCreateSession(sessionId)
    : sessionManager.createSession();

  // 3. 构建统计摘要文本
  const statsSummary = [
    summarizeFieldStats(fieldStats),
    summarizeDeepAnalysis(deepAnalysis),
  ].join('\n');

  // 4. 执行分析步骤
  const stepResults: StepResult[] = [];
  const previousSteps: Record<string, string> = {};
  const allRecommendedCharts: string[] = [];

  if (template) {
    // 按模板步骤执行
    for (let i = 0; i < template.steps.length; i++) {
      const step = template.steps[i];
      onProgress?.(i, template.steps.length, step.name);

      const context: AnalysisContext = {
        fieldNames,
        fieldStats,
        totalRows,
        statsSummary,
        previousSteps: { ...previousSteps },
      };

      const userPrompt = step.promptTemplate(context);

      try {
        const messages = buildSceneMessages(
          LLMScene.DATA_ANALYSIS,
          provider,
          userPrompt,
          session.getHistoryAsOpenAIMessages()
        );

        const content = await callLLM(modelConfig, messages, {
          temperature: 0.3,
          max_tokens: 4096,
          timeout: 120000,
        });

        stepResults.push({
          stepId: step.id,
          stepName: step.name,
          content,
          recommendedChartTypes: step.recommendedChartTypes,
          isRequired: step.required,
        });

        previousSteps[step.id] = content;
        allRecommendedCharts.push(...step.recommendedChartTypes);

        // 更新会话历史
        session.addMessage('user', userPrompt);
        session.addMessage('assistant', content);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '分析步骤执行失败';
        stepResults.push({
          stepId: step.id,
          stepName: step.name,
          content: `❌ 分析失败：${errorMsg}`,
          recommendedChartTypes: step.recommendedChartTypes,
          isRequired: step.required,
        });
      }
    }
  } else {
    // 通用分析（无模板兜底）
    onProgress?.(0, 1, 'AI 深度解读');
    const genericPrompt = getGenericAnalysisPrompt(fieldNames, deepAnalysis, fieldStats);

    try {
      const messages = buildSceneMessages(
        LLMScene.DATA_ANALYSIS,
        provider,
        genericPrompt,
        session.getHistoryAsOpenAIMessages()
      );

      const content = await callLLM(modelConfig, messages, {
        temperature: 0.3,
        max_tokens: 4096,
        timeout: 120000,
      });

      stepResults.push({
        stepId: 'generic',
        stepName: 'AI 深度解读',
        content,
        recommendedChartTypes: ['bar', 'line', 'pie'],
        isRequired: true,
      });

      allRecommendedCharts.push('bar', 'line', 'pie');
      session.addMessage('user', genericPrompt);
      session.addMessage('assistant', content);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'AI 分析失败';
      stepResults.push({
        stepId: 'generic',
        stepName: 'AI 深度解读',
        content: `❌ 分析失败：${errorMsg}`,
        recommendedChartTypes: ['bar', 'line', 'pie'],
        isRequired: true,
      });
    }
  }

  // 5. 生成汇总
  const summary = stepResults
    .filter(r => !r.content.startsWith('❌'))
    .map(r => `### ${r.stepName}\n${r.content}`)
    .join('\n\n');

  // 去重推荐图表
  const uniqueCharts = [...new Set(allRecommendedCharts)];

  return {
    template,
    scene,
    stepResults,
    summary,
    recommendedCharts: uniqueCharts,
    sessionId: session.id,
  };
}

/**
 * 流式 AI 增强分析（单步骤，适合实时展示）
 * 用于"AI问数"等需要流式输出的场景
 */
export async function enhanceAnalysisStream(
  userQuestion: string,
  fieldNames: string[],
  fieldStats: FieldStat[],
  deepAnalysis: DeepAnalysis | undefined,
  totalRows: number,
  modelConfig: LLMModelConfig,
  sessionId?: string,
): Promise<ReadableStream<Uint8Array>> {
  const provider = detectModelProvider(modelConfig.model, modelConfig.baseUrl);
  const statsSummary = [
    summarizeFieldStats(fieldStats),
    summarizeDeepAnalysis(deepAnalysis),
  ].join('\n');

  // 构建包含数据上下文的用户输入
  const enrichedInput = `数据字段：${fieldNames.join('、')}\n数据量：${totalRows}行\n\n统计数据：\n${statsSummary}\n\n用户问题：${userQuestion}`;

  const session: LLMSession = sessionId
    ? sessionManager.getOrCreateSession(sessionId)
    : sessionManager.createSession();

  const messages = buildSceneMessages(
    LLMScene.INSIGHT,
    provider,
    enrichedInput,
    session.getHistoryAsOpenAIMessages()
  );

  const stream = await callLLMStream(modelConfig, messages, {
    temperature: 0.3,
    max_tokens: 4096,
  });

  // 记录到会话（异步，不阻塞流式输出）
  let fullContent = '';
  const originalStream = stream;
  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      // 提取内容用于记录会话
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) fullContent += data.content;
          } catch { /* ignore */ }
        }
      }
    },
    flush() {
      if (fullContent) {
        session.addMessage('user', enrichedInput);
        session.addMessage('assistant', fullContent);
      }
    },
  });

  originalStream.pipeTo(transformStream.writable);
  return transformStream.readable;
}

/**
 * 快速场景识别（仅返回场景信息，不调用 LLM）
 */
export function quickDetectScene(fieldNames: string[]): {
  scene: AnalysisScene;
  displayName: string;
  template: AnalysisTemplate | null;
} {
  const template = detectScene(fieldNames);
  const scene = template?.scene || AnalysisScene.CUSTOM;
  const display = SCENE_DISPLAY[scene];
  return {
    scene,
    displayName: display.name,
    template,
  };
}
