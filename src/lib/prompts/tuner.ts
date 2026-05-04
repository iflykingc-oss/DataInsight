import type { ParsedData } from '@/types';
import type { ParsedIntent } from '../skills/intent/classifier';
import { detectScenario, getScenarioTemplate, resolveColumnName, type Scenario } from './scenario-templates';

export interface IntentPromptConfig {
  scenario: Scenario;
  scenarioTemplate: ReturnType<typeof getScenarioTemplate>;
  data: ParsedData;
}

export function buildIntentPrompt(input: string, config: IntentPromptConfig): string {
  const { scenario, scenarioTemplate, data } = config;

  const scenarioInstructions = scenario !== 'general'
    ? `\n【业务场景】${scenarioTemplate.name}\n已知的列名映射：\n${
        Object.entries(scenarioTemplate.intentEnhancements.columnMappings)
          .map(([k, v]) => `  - "${k}" 可能对应: ${v.join(', ')}`)
          .join('\n')
      }\n常用条件缩写：\n${
        Object.entries(scenarioTemplate.intentEnhancements.conditionPatterns)
          .map(([k, v]) => `  - "${k}" = ${v.column} ${v.operator} ${v.value}`)
          .join('\n')
      }`
    : '';

  return `你是一个表格处理助手。用户的表格包含以下信息：

【表格列名】
${data.headers.join(', ')}

【数据量】
${data.rows.length} 行

${scenarioInstructions}

【用户指令】
${input}

请理解用户的指令，并输出结构化的操作意图。

输出格式（JSON）：
{
  "intent": "操作类型（filter/format/clean/delete/export/undo/analyze）",
  "params": {
    // 操作参数
  },
  "confidence": 0.0-1.0,
  "needsClarification": true/false,
  "clarificationQuestion": "如果需要澄清，输出问题"
}

请输出JSON：`;
}

export function buildFilterPrompt(
  column: string,
  operator: string,
  value: unknown,
  data: ParsedData
): string {
  const sampleValues = data.rows.slice(0, 5).map((r) => r[column]);
  const columnStats = data.rows.reduce(
    (acc, r) => {
      const v = Number(r[column]);
      if (!isNaN(v)) {
        acc.min = Math.min(acc.min, v);
        acc.max = Math.max(acc.max, v);
        acc.sum += v;
        acc.count++;
      }
      return acc;
    },
    { min: Infinity, max: -Infinity, sum: 0, count: 0 }
  );

  return `用户要求筛选条件：

列名：${column}
操作符：${operator}
值：${value}

【该列数据概览】
样本值：${sampleValues.join(', ')}
${
  columnStats.count > 0
    ? `数值范围：${columnStats.min.toFixed(2)} ~ ${columnStats.max.toFixed(2)}\n平均值：${(columnStats.sum / columnStats.count).toFixed(2)}`
    : ''
}

请确认这个筛选条件是否合理，并输出：
{
  "confirmed": true/false,
  "adjustedParams": { "column": "...", "operator": "...", "value": ... },
  "reasoning": "确认或调整的原因"
}`;
}

export function buildExplanationPrompt(
  intent: ParsedIntent,
  result: { success: boolean; summary: string; changes?: { before: number; after: number }[] }
): string {
  const status = result.success ? '成功' : '失败';

  return `操作执行${status}！

【用户指令】
${intent.params.raw || JSON.stringify(intent.params)}

【执行结果】
${result.summary}

${
  result.changes
    ? `【数据变化】
${result.changes.map((c) => `${c.description}`).join('\n')}`
    : ''
}

请用简洁易懂的语言向用户解释执行结果，重点说明：
1. 执行了什么操作
2. 产生了什么变化
3. 如果有问题，说明原因`;
}

export interface PromptTuningRecord {
  id: string;
  scenario: Scenario;
  userIntent: string;
  parsedIntent: ParsedIntent;
  success: boolean;
  executionTime: number;
  feedback?: 'good' | 'bad' | 'retry';
  timestamp: number;
}

export class PromptTuner {
  private records: PromptTuningRecord[] = [];
  private scenarioStats: Record<Scenario, { success: number; total: number }> = {
    retail: { success: 0, total: 0 },
    finance: { success: 0, total: 0 },
    hr: { success: 0, total: 0 },
    general: { success: 0, total: 0 },
  };

  logExecution(record: Omit<PromptTuningRecord, 'id' | 'timestamp'>): void {
    const fullRecord: PromptTuningRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.records.push(fullRecord);

    this.scenarioStats[record.scenario].total++;
    if (record.success) {
      this.scenarioStats[record.scenario].success++;
    }
  }

  getScenarioScore(scenario: Scenario): number {
    const stats = this.scenarioStats[scenario];
    if (stats.total === 0) return 100;
    return Math.round((stats.success / stats.total) * 100);
  }

  analyzeFailures(scenario: Scenario): {
    type: string;
    count: number;
    suggestion: string;
  }[] {
    const failures = this.records.filter(
      (r) => r.scenario === scenario && !r.success
    );

    const typeCount: Record<string, number> = {};
    failures.forEach((f) => {
      const type = f.parsedIntent.type;
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        suggestion: this.getSuggestion(type),
      }));
  }

  private getSuggestion(failureType: string): string {
    switch (failureType) {
      case 'filter':
        return '建议在 columnMappings 中添加更多同义词，或增加条件缩写的映射';
      case 'format':
        return '建议在 formatPreferences 中添加更多格式选项';
      case 'unknown':
        return '建议在 keywords 中添加更多业务术语，或在 commonOperations 中添加常用操作序列';
      default:
        return '建议检查该场景的模板配置';
    }
  }

  getImprovement(): {
    scenario: Scenario;
    score: number;
    issues: { type: string; count: number; suggestion: string }[];
  }[] {
    return Object.entries(this.scenarioStats)
      .filter(([, stats]) => stats.total > 10)
      .map(([scenario, stats]) => ({
        scenario: scenario as Scenario,
        score: Math.round((stats.success / stats.total) * 100),
        issues: this.analyzeFailures(scenario as Scenario),
      }))
      .filter((r) => r.score < 90);
  }

  getRecords(scenario?: Scenario): PromptTuningRecord[] {
    if (scenario) {
      return this.records.filter((r) => r.scenario === scenario);
    }
    return [...this.records];
  }
}

export const promptTuner = new PromptTuner();
