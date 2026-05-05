/**
 * 全局调度智能体
 * 产品定位：平台总调度、跨Tab复杂需求拆解、功能导航、场景推荐
 * 禁止直接执行表格生成、数据清洗、数据分析底层操作
 * 仅做分发、规划、引导、校验
 */

import type { ParsedData } from './data-processor/types';

// ============================================================
// 类型定义
// ============================================================

export type TaskType =
  | 'navigate'           // 页面导航
  | 'data_upload'        // 数据上传引导
  | 'data_clean'         // 数据清洗
  | 'data_analyze'       // 数据分析
  | 'visualize'          // 可视化
  | 'report'             // 报告生成
  | 'template_apply'     // 模板应用
  | 'settings'           // 设置
  | 'chat'               // 闲聊/通用问答
  | 'composite';         // 复合任务（需拆解）

export interface TaskIntent {
  type: TaskType;
  confidence: number;      // 0-1
  targetView?: string;     // 目标页面
  parameters?: Record<string, unknown>;
  description: string;     // 任务描述
}

export interface SubTask {
  id: string;
  type: TaskType;
  description: string;
  dependencies: string[];   // 依赖的其他子任务ID
  scene: string;            // 所属场景（用于边界隔离）
  parameters?: Record<string, unknown>;
}

export interface ExecutionPlan {
  originalRequest: string;
  intents: TaskIntent[];
  isComposite: boolean;
  subTasks: SubTask[];
  suggestedActions: Array<{
    label: string;
    action: string;
    params?: Record<string, unknown>;
  }>;
  response: string;         // 给用户的自然语言回复
}

export interface OrchestratorContext {
  currentView: string;
  hasData: boolean;
  dataInfo?: {
    fileName: string;
    rowCount: number;
    columnCount: number;
  };
  isLoggedIn: boolean;
  userRole?: string;
}

// ============================================================
// 意图识别规则引擎（确定性逻辑，不依赖LLM）
// ============================================================

const INTENT_PATTERNS: Array<{
  type: TaskType;
  patterns: RegExp[];
  targetView?: string;
  priority: number;
}> = [
  {
    type: 'navigate',
    patterns: [
      /^(打开|进入|切换|去|到).*(表格|数据|分析|看板|仪表盘|图表|报告|设置|首页)/,
      /^show\s+(me\s+)?(the\s+)?(table|data|analysis|dashboard|chart|report|settings|home)/i,
      /^go\s+to\s+/i,
      /^navigate\s+to\s+/i,
    ],
    priority: 10,
  },
  {
    type: 'data_upload',
    patterns: [
      /^(上传|导入|加载|打开).*(文件|数据|表格|Excel|CSV)/,
      /^upload|import|load\s+(a\s+)?(file|data|spreadsheet)/i,
      /^(我要|我想).*(上传|导入)/,
    ],
    targetView: 'home',
    priority: 10,
  },
  {
    type: 'data_clean',
    patterns: [
      /^(清洗|清理|去重|填充|处理).*(数据|空值|异常|重复)/,
      /^(去除|删除).*(重复|空值|异常)/,
      /^clean|cleanse|dedup|fill\s+(null|missing)/i,
      /^(数据|表格).*(质量|清洗|清理)/,
    ],
    targetView: 'data-prep',
    priority: 9,
  },
  {
    type: 'data_analyze',
    patterns: [
      /^(分析|统计|计算|对比|排名).*(数据|销售|业绩|指标|趋势)/,
      /^(查看|看看|分析).*(同比|环比|增长|下降|分布)/,
      /^analyze|analysis|stat|compare|rank/i,
      /^(为什么|怎么|如何).*(下降|增长|变化|异常)/,
    ],
    targetView: 'insights',
    priority: 9,
  },
  {
    type: 'visualize',
    patterns: [
      /^(生成|创建|做|画).*(图|图表|看板|可视化|饼图|柱状图|折线图)/,
      /^(展示|显示).*(趋势|分布|对比|关系)/,
      /^create|generate|make|draw\s+(a\s+)?(chart|graph|dashboard|visualization)/i,
      /^(可视化|图表).*/,
    ],
    targetView: 'visualization',
    priority: 9,
  },
  {
    type: 'report',
    patterns: [
      /^(生成|导出|下载).*(报告|报表|PDF|Excel)/,
      /^(写|生成).*(周报|月报|总结|分析)/,
      /^generate|export|download\s+(a\s+)?(report|summary)/i,
      /^(报告|报表).*/,
    ],
    targetView: 'report-export',
    priority: 8,
  },
  {
    type: 'template_apply',
    patterns: [
      /^(使用|应用|选择).*(模板|销售台账|库存管理|客户管理)/,
      /^(创建|新建).*(销售表|库存表|客户表)/,
      /^apply|use\s+(a\s+)?template/i,
      /^(模板|场景).*/,
    ],
    targetView: 'ai-table-builder',
    priority: 8,
  },
  {
    type: 'settings',
    patterns: [
      /^(设置|配置|修改).*(模型|API|密钥|参数)/,
      /^open\s+settings|configure|setup/i,
      /^(设置|配置).*/,
    ],
    targetView: 'settings',
    priority: 7,
  },
  {
    type: 'chat',
    patterns: [
      /^(你好|您好|hi|hello|help)/i,
      /^(谢谢|感谢|再见|bye)/i,
      /^(你|系统).*(能|可以|会).*(什么|做)/,
    ],
    priority: 5,
  },
];

// 复合任务关键词
const COMPOSITE_INDICATORS = [
  /然后|接着|之后|再|最后|并且|同时/,
  /and\s+then|after\s+that|finally|also|plus/i,
  /^(先|首先).*(再|然后|接着)/,
  /^(first|initially).*(then|after|next)/i,
];

// ============================================================
// 场景映射
// ============================================================

const SCENE_MAP: Record<string, { name: string; allowedTasks: TaskType[] }> = {
  'home': { name: '工作台', allowedTasks: ['navigate', 'data_upload', 'template_apply', 'settings', 'chat'] },
  'data-table': { name: '数据预览', allowedTasks: ['navigate', 'data_clean', 'data_analyze', 'visualize', 'chat'] },
  'data-prep': { name: '数据工作台', allowedTasks: ['navigate', 'data_clean', 'chat'] },
  'insights': { name: '自动分析', allowedTasks: ['navigate', 'data_analyze', 'report', 'chat'] },
  'visualization': { name: '仪表盘', allowedTasks: ['navigate', 'visualize', 'chat'] },
  'report-export': { name: '导出分享', allowedTasks: ['navigate', 'report', 'chat'] },
  'ai-table-builder': { name: 'AI生成表格', allowedTasks: ['navigate', 'template_apply', 'chat'] },
};

// ============================================================
// 核心类
// ============================================================

export class OrchestratorAgent {
  private context: OrchestratorContext;

  constructor(context: OrchestratorContext) {
    this.context = context;
  }

  /**
   * 解析用户请求，生成执行计划
   * 这是核心入口：接收自然语言 → 输出结构化执行计划
   */
  parseRequest(request: string): ExecutionPlan {
    const normalizedRequest = request.trim().toLowerCase();

    // 1. 检查是否为复合任务
    const isComposite = COMPOSITE_INDICATORS.some(p => p.test(request));

    // 2. 意图识别（确定性规则匹配）
    const intents = this.recognizeIntents(normalizedRequest);

    // 3. 生成执行计划
    if (isComposite && intents.length > 1) {
      return this.buildCompositePlan(request, intents);
    }

    // 4. 单意图直接处理
    const primaryIntent = intents[0] || this.fallbackIntent(request);
    return this.buildSinglePlan(request, primaryIntent);
  }

  /**
   * 意图识别（纯规则，不依赖LLM）
   */
  private recognizeIntents(request: string): TaskIntent[] {
    const matched: Array<{ type: TaskType; confidence: number; targetView?: string }> = [];

    for (const rule of INTENT_PATTERNS) {
      for (const pattern of rule.patterns) {
        if (pattern.test(request)) {
          // 计算置信度：基于匹配长度和规则优先级
          const matchLength = request.match(pattern)?.[0].length || 0;
          const coverage = matchLength / request.length;
          const confidence = Math.min(0.6 + coverage * 0.3 + rule.priority * 0.01, 0.95);

          matched.push({
            type: rule.type,
            confidence,
            targetView: rule.targetView,
          });
          break; // 同一类型只取第一个匹配
        }
      }
    }

    // 按置信度排序
    matched.sort((a, b) => b.confidence - a.confidence);

    // 合并相同类型的意图，取最高置信度
    const deduped = new Map<TaskType, typeof matched[0]>();
    for (const m of matched) {
      if (!deduped.has(m.type) || deduped.get(m.type)!.confidence < m.confidence) {
        deduped.set(m.type, m);
      }
    }

    return Array.from(deduped.values()).map(m => ({
      type: m.type,
      confidence: m.confidence,
      targetView: m.targetView,
      description: this.getIntentDescription(m.type),
    }));
  }

  /**
   * 构建单意图执行计划
   */
  private buildSinglePlan(request: string, intent: TaskIntent): ExecutionPlan {
    const plan: ExecutionPlan = {
      originalRequest: request,
      intents: [intent],
      isComposite: false,
      subTasks: [],
      suggestedActions: [],
      response: '',
    };

    // 根据意图类型生成回复和建议
    switch (intent.type) {
      case 'navigate':
        plan.response = `好的，我帮您切换到${this.getViewName(intent.targetView)}。`;
        plan.suggestedActions = [{ label: '立即切换', action: 'navigate', params: { view: intent.targetView } }];
        break;

      case 'data_upload':
        if (this.context.hasData) {
          plan.response = '您已经上传了数据，需要上传新数据吗？当前数据将被替换。';
          plan.suggestedActions = [
            { label: '上传新数据', action: 'navigate', params: { view: 'home' } },
            { label: '继续使用当前数据', action: 'dismiss' },
          ];
        } else {
          plan.response = '请上传您的数据文件（Excel 或 CSV），我将自动解析并分析。';
          plan.suggestedActions = [{ label: '去上传', action: 'navigate', params: { view: 'home' } }];
        }
        break;

      case 'data_clean':
        if (!this.context.hasData) {
          plan.response = '您还没有上传数据，请先上传数据后再进行清洗。';
          plan.suggestedActions = [{ label: '去上传数据', action: 'navigate', params: { view: 'home' } }];
        } else {
          plan.response = `好的，我将帮您清洗"${this.context.dataInfo?.fileName}"数据，包括去重、填充缺失值、检测异常值等。`;
          plan.suggestedActions = [
            { label: '开始清洗', action: 'navigate', params: { view: 'data-prep', autoClean: true } },
            { label: '手动配置', action: 'navigate', params: { view: 'data-prep' } },
          ];
        }
        break;

      case 'data_analyze':
        if (!this.context.hasData) {
          plan.response = '您还没有上传数据，请先上传数据后再进行分析。';
          plan.suggestedActions = [{ label: '去上传数据', action: 'navigate', params: { view: 'home' } }];
        } else {
          plan.response = `好的，我将对"${this.context.dataInfo?.fileName}"进行深度分析，包括统计摘要、异常检测、趋势分析等。`;
          plan.suggestedActions = [
            { label: '开始分析', action: 'navigate', params: { view: 'insights', autoAnalyze: true } },
            { label: '查看数据', action: 'navigate', params: { view: 'data-table' } },
          ];
        }
        break;

      case 'visualize':
        if (!this.context.hasData) {
          plan.response = '您还没有上传数据，请先上传数据后再创建可视化。';
          plan.suggestedActions = [{ label: '去上传数据', action: 'navigate', params: { view: 'home' } }];
        } else {
          plan.response = '好的，我将根据您的数据自动生成推荐的可视化图表。';
          plan.suggestedActions = [
            { label: '生成图表', action: 'navigate', params: { view: 'visualization', autoVisualize: true } },
            { label: '手动选择', action: 'navigate', params: { view: 'chart-center' } },
          ];
        }
        break;

      case 'report':
        if (!this.context.hasData) {
          plan.response = '您还没有上传数据，请先上传数据后再生成报告。';
          plan.suggestedActions = [{ label: '去上传数据', action: 'navigate', params: { view: 'home' } }];
        } else {
          plan.response = '好的，我将为您生成数据分析报告。';
          plan.suggestedActions = [
            { label: '生成报告', action: 'navigate', params: { view: 'report-export', autoReport: true } },
          ];
        }
        break;

      case 'template_apply':
        plan.response = '我们有多个行业模板可供选择，包括销售台账、库存管理、客户管理等。';
        plan.suggestedActions = [
          { label: '浏览模板', action: 'navigate', params: { view: 'ai-table-builder' } },
        ];
        break;

      case 'settings':
        plan.response = '您可以在设置中配置AI模型、API密钥等参数。';
        plan.suggestedActions = [{ label: '打开设置', action: 'open-settings' }];
        break;

      case 'chat':
        plan.response = '您好！我是DataInsight智能助手，可以帮您：上传数据、清洗数据、分析数据、生成图表和报告。有什么可以帮您的吗？';
        plan.suggestedActions = [
          { label: '上传数据', action: 'navigate', params: { view: 'home' } },
          { label: '查看功能', action: 'show-features' },
        ];
        break;

      default:
        plan.response = '抱歉，我没有完全理解您的需求。您可以尝试说"上传数据"、"分析数据"或"生成图表"。';
        plan.suggestedActions = [
          { label: '上传数据', action: 'navigate', params: { view: 'home' } },
          { label: '数据分析', action: 'navigate', params: { view: 'insights' } },
        ];
    }

    return plan;
  }

  /**
   * 构建复合任务执行计划
   */
  private buildCompositePlan(request: string, intents: TaskIntent[]): ExecutionPlan {
    const subTasks: SubTask[] = [];
    let taskId = 0;

    for (const intent of intents) {
      const id = `task-${++taskId}`;
      subTasks.push({
        id,
        type: intent.type,
        description: intent.description,
        dependencies: taskId > 1 ? [`task-${taskId - 1}`] : [],
        scene: intent.targetView || 'general',
        parameters: intent.parameters,
      });
    }

    // 生成自然语言回复
    const taskNames = intents.map(i => this.getIntentDescription(i.type));
    const response = `我理解您需要完成以下任务：\n${taskNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\n我将按顺序为您处理。`;

    return {
      originalRequest: request,
      intents,
      isComposite: true,
      subTasks,
      suggestedActions: [
        { label: '开始执行', action: 'execute-composite', params: { subTasks } },
        { label: '分步执行', action: 'step-by-step', params: { subTasks } },
      ],
      response,
    };
  }

  /**
   * 校验场景边界
   * 返回：是否允许在当前场景执行该任务
   */
  validateSceneBoundary(taskType: TaskType, currentView: string): { allowed: boolean; redirectTo?: string; reason?: string } {
    const scene = SCENE_MAP[currentView];
    if (!scene) {
      return { allowed: true }; // 未知场景默认允许
    }

    if (scene.allowedTasks.includes(taskType)) {
      return { allowed: true };
    }

    // 找到最适合的目标场景
    for (const [view, info] of Object.entries(SCENE_MAP)) {
      if (info.allowedTasks.includes(taskType)) {
        return {
          allowed: false,
          redirectTo: view,
          reason: `"${scene.name}"不支持此操作，已为您切换至"${info.name}"`,
        };
      }
    }

    return { allowed: false, reason: '当前场景不支持此操作' };
  }

  /**
   * 获取建议的下一步操作
   */
  getSuggestedNextSteps(currentView: string, hasData: boolean): Array<{ label: string; action: string; params?: Record<string, unknown> }> {
    const steps: Array<{ label: string; action: string; params?: Record<string, unknown> }> = [];

    if (!hasData) {
      steps.push({ label: '上传数据', action: 'navigate', params: { view: 'home' } });
      steps.push({ label: '选择模板', action: 'navigate', params: { view: 'ai-table-builder' } });
      return steps;
    }

    switch (currentView) {
      case 'home':
        steps.push({ label: '查看数据', action: 'navigate', params: { view: 'data-table' } });
        steps.push({ label: '数据分析', action: 'navigate', params: { view: 'insights' } });
        break;
      case 'data-table':
        steps.push({ label: '数据清洗', action: 'navigate', params: { view: 'data-prep' } });
        steps.push({ label: '数据分析', action: 'navigate', params: { view: 'insights' } });
        break;
      case 'data-prep':
        steps.push({ label: '查看清洗结果', action: 'navigate', params: { view: 'data-table' } });
        steps.push({ label: '数据分析', action: 'navigate', params: { view: 'insights' } });
        break;
      case 'insights':
        steps.push({ label: '生成图表', action: 'navigate', params: { view: 'visualization' } });
        steps.push({ label: '导出报告', action: 'navigate', params: { view: 'report-export' } });
        break;
      case 'visualization':
        steps.push({ label: '导出图表', action: 'navigate', params: { view: 'report-export' } });
        steps.push({ label: '深度分析', action: 'navigate', params: { view: 'insights' } });
        break;
      default:
        steps.push({ label: '回到工作台', action: 'navigate', params: { view: 'home' } });
    }

    return steps;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private fallbackIntent(request: string): TaskIntent {
    // 如果没有任何规则匹配，尝试关键词匹配
    const keywords: Array<{ words: string[]; type: TaskType; targetView?: string }> = [
      { words: ['图', 'chart', 'graph', '可视化'], type: 'visualize', targetView: 'visualization' },
      { words: ['分析', 'analyze', '统计'], type: 'data_analyze', targetView: 'insights' },
      { words: ['清洗', 'clean', '去重'], type: 'data_clean', targetView: 'data-prep' },
      { words: ['报告', 'report', '导出'], type: 'report', targetView: 'report-export' },
      { words: ['模板', 'template'], type: 'template_apply', targetView: 'ai-table-builder' },
      { words: ['上传', 'upload', '导入'], type: 'data_upload', targetView: 'home' },
    ];

    for (const kw of keywords) {
      if (kw.words.some(w => request.includes(w))) {
        return {
          type: kw.type,
          confidence: 0.5,
          targetView: kw.targetView,
          description: this.getIntentDescription(kw.type),
        };
      }
    }

    return {
      type: 'chat',
      confidence: 0.3,
      description: '通用对话',
    };
  }

  private getIntentDescription(type: TaskType): string {
    const descriptions: Record<TaskType, string> = {
      navigate: '页面导航',
      data_upload: '数据上传',
      data_clean: '数据清洗',
      data_analyze: '数据分析',
      visualize: '可视化',
      report: '报告生成',
      template_apply: '模板应用',
      settings: '设置',
      chat: '通用对话',
      composite: '复合任务',
    };
    return descriptions[type] || '未知任务';
  }

  private getViewName(view?: string): string {
    const names: Record<string, string> = {
      'home': '工作台',
      'data-table': '数据预览',
      'data-prep': '数据工作台',
      'insights': '自动分析',
      'visualization': '仪表盘',
      'report-export': '导出分享',
      'ai-table-builder': 'AI生成表格',
      'settings': '设置',
    };
    return names[view || ''] || view || '对应页面';
  }
}

// ============================================================
// 便捷函数
// ============================================================

export function createOrchestrator(context: OrchestratorContext): OrchestratorAgent {
  return new OrchestratorAgent(context);
}

export function quickParse(request: string, context: OrchestratorContext): ExecutionPlan {
  const agent = new OrchestratorAgent(context);
  return agent.parseRequest(request);
}
