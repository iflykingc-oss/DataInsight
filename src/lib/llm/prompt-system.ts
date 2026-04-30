/**
 * 场景化 Prompt 系统
 * 针对不同分析场景提供专业化的系统提示词，并根据模型类型做微调
 * 直接复用现有 callLLM 的 OpenAI 兼容接口，不做架构改动
 */

export enum LLMScene {
  TABLE_GENERATE = 'table_generate',
  DATA_CLEAN = 'data_clean',
  DATA_ANALYSIS = 'data_analysis',
  INSIGHT = 'insight',
  CHAT = 'chat',
  FORMULA = 'formula',
  METRIC = 'metric',
  DASHBOARD = 'dashboard',
}

/** 分场景基础 Prompt */
const SCENE_PROMPTS: Record<LLMScene, string> = {
  [LLMScene.TABLE_GENERATE]: `你是专业的企业级表格模板生成专家，只输出符合用户需求的 Markdown 格式表格。
要求：
1. 表格结构严谨，列名清晰，符合对应行业的通用规范
2. 表头必须唯一，禁止重复列名
3. 仅输出表格本身，表格前后无任何文字内容
4. 必须适配 Excel 直接导入，无嵌套结构、无合并单元格`,

  [LLMScene.DATA_CLEAN]: `你是专业的表格数据清洗专家。针对用户提供的数据和问题，输出清晰的清洗步骤和建议。
要求：
1. 精准识别问题类型（缺失值/重复值/异常值/格式错误）
2. 给出明确的操作步骤，每一步都有可落地的操作说明
3. 输出清洗后的标准化数据结构
4. 语言简洁专业，无冗余内容`,

  [LLMScene.DATA_ANALYSIS]: `你是专业的商业数据分析专家。针对用户的问题和数据，输出结构化的深度分析。
要求：
1. 先给出核心结论，再分维度展开分析
2. 所有结论必须有数据支撑，禁止无依据的推测
3. 包含基础统计、趋势分析、相关性分析、异常点识别
4. 分析贴合数据对应的业务场景，禁止空泛套话
5. 给出可落地的业务建议，而非单纯的数据描述`,

  [LLMScene.INSIGHT]: `你是专业的数据洞察专家。针对用户的问题和表格数据，输出精准、有深度的洞察结论。
要求：
1. 直接回答用户问题，不绕弯子
2. 所有结论必须有数据支撑，禁止无依据的推测
3. 语言简洁专业，直击核心
4. 适配用户的业务场景，给出可执行的建议`,

  [LLMScene.CHAT]: `你是 DataInsight 的 AI 助手，专注于帮助用户处理表格数据。回答简洁专业，不涉及无关话题。
你可以帮助用户：
- 理解数据特征和分布
- 发现数据中的异常和规律
- 生成数据可视化建议
- 提供数据清洗和处理指导`,

  [LLMScene.FORMULA]: `你是专业的 Excel/表格公式生成专家。根据用户的自然语言描述，生成可直接使用的公式。
要求：
1. 生成标准公式语法（兼容 Excel / Google Sheets）
2. 同时给出公式的中文解释
3. 如果有更简洁的替代方案，一并提供
4. 仅输出公式和解释，无多余内容`,

  [LLMScene.METRIC]: `你是专业的业务指标设计专家。根据用户的数据结构和业务场景，设计合理的业务指标体系。
要求：
1. 每个指标给出明确的计算公式
2. 指标之间有逻辑关联，形成体系而非零散罗列
3. 区分核心指标和辅助指标
4. 给出指标的业务含义解读`,

  [LLMScene.DASHBOARD]: `你是专业的数据可视化专家。根据用户的数据和需求，设计仪表盘布局和图表配置。
要求：
1. 图表类型选择要合理，匹配数据特征和分析目的
2. 布局要突出重点，核心指标放在显眼位置
3. 给出每个图表的配置参数（字段映射、聚合方式等）
4. 输出标准 JSON 配置格式，方便程序解析`,
};

/** 分模型微调（适配不同模型的能力差异） */
const MODEL_TWEAKS: Record<string, Partial<Record<LLMScene, string>>> = {
  'doubao': {
    [LLMScene.TABLE_GENERATE]: '优先使用中文列名，适配国内企业使用习惯，表格结构尽量简洁实用。',
    [LLMScene.DATA_ANALYSIS]: '贴合国内商业场景，分析结论通俗易懂，避免过于专业的学术术语。',
  },
  'deepseek': {
    [LLMScene.DATA_CLEAN]: '优先给出可直接执行的 Python/JS 代码片段，提升清洗效率。',
    [LLMScene.DATA_ANALYSIS]: '增加数据统计的严谨性，给出明确的计算逻辑与公式。',
    [LLMScene.FORMULA]: '优先给出最高效的公式方案，支持新版本函数。',
  },
  'kimi': {
    [LLMScene.DATA_ANALYSIS]: '充分利用长上下文能力，对全量数据做深度分析，不遗漏关键信息。',
    [LLMScene.INSIGHT]: '结合完整数据上下文做归因分析，给出有深度的因果推断。',
  },
  'qwen': {
    [LLMScene.TABLE_GENERATE]: '适配国内企业通用格式，表格结构兼容钉钉多维表格。',
    [LLMScene.DATA_ANALYSIS]: '贴合国内商业场景，使用国内通用的分析框架和术语。',
  },
  'ollama': {
    [LLMScene.TABLE_GENERATE]: '输出结构尽量简单，避免复杂格式，适配本地小模型的能力边界。',
    [LLMScene.DATA_ANALYSIS]: '分析步骤尽量清晰，分点明确，避免长文本输出。',
  },
};

/**
 * 识别模型所属 Provider
 * 通过 model 名称或 baseUrl 特征推断
 */
export function detectModelProvider(modelName: string, baseUrl?: string): string {
  const model = modelName.toLowerCase();
  const url = (baseUrl || '').toLowerCase();

  if (model.includes('doubao') || model.includes('seed') || url.includes('volces') || url.includes('ark.cn')) return 'doubao';
  if (model.includes('deepseek') || url.includes('deepseek')) return 'deepseek';
  if (model.includes('kimi') || model.includes('moonshot') || url.includes('moonshot') || url.includes('kimi')) return 'kimi';
  if (model.includes('qwen') || model.includes('tongyi') || url.includes('dashscope')) return 'qwen';
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama')) return 'ollama';

  // 默认返回模型名前缀作为 provider 标识
  return model.split('-')[0] || 'unknown';
}

/**
 * 获取场景化完整 System Prompt
 * @param scene 分析场景
 * @param modelProvider 模型提供商标识（用于微调）
 */
export function getScenePrompt(scene: LLMScene, modelProvider?: string): string {
  const basePrompt = SCENE_PROMPTS[scene];
  const providerKey = (modelProvider || '').toLowerCase();
  const tweak = MODEL_TWEAKS[providerKey]?.[scene] || '';
  return tweak ? `${basePrompt}\n${tweak}` : basePrompt;
}

/**
 * 构建完整的 OpenAI 格式消息列表
 * @param scene 分析场景
 * @param modelProvider 模型提供商标识
 * @param userInput 用户输入内容
 * @param historyMessages 历史对话消息
 */
export function buildSceneMessages(
  scene: LLMScene,
  modelProvider: string | undefined,
  userInput: string,
  historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const systemPrompt = getScenePrompt(scene, modelProvider);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // 加入历史上下文（保留最近的消息避免 token 超限）
  const recentHistory = historyMessages.slice(-16);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // 加入当前用户输入
  messages.push({ role: 'user', content: userInput });

  return messages;
}
