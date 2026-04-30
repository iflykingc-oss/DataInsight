import { NextRequest } from 'next/server';
import { callLLMStreamWithFallback, validateModelConfig, type LLMModelConfig } from '@/lib/llm';

/**
 * AI 智能洞察 API（SSE 流式响应）
 * 
 * 特性：
 * - 问候语/闲聊检测 → 模板回复
 * - 用户意图识别 → 匹配对应 Prompt 模板
 * - 多轮对话上下文（最近5轮）
 * - 流式输出兜底（超时降级、异常重试）
 * - 数据范围强约束 + 幻觉拦截
 */

// 意图类型
type QueryIntent = 'query' | 'attribution' | 'prediction' | 'comparison' | 'suggestion' | 'diagnosis' | 'greeting' | 'smalltalk';

// 意图识别规则
const INTENT_RULES: Array<{ intent: QueryIntent; patterns: RegExp; label: string }> = [
  { intent: 'query', patterns: /多少|总数|总计|合计|平均|均值|占比|比例|排名|top|最大|最小|最高|最低|count|sum|avg|mean/i, label: '数据查询' },
  { intent: 'attribution', patterns: /为什么|原因|归因|因为|导致|怎么回事|为什么.*下降|为什么.*增长|why|because|root cause/i, label: '归因分析' },
  { intent: 'prediction', patterns: /预测|趋势|未来|预计|可能|走势|会怎样|下一步|forecast|predict|trend/i, label: '趋势预测' },
  { intent: 'comparison', patterns: /对比|比较|差异|差别|vs|相比|同比|环比|比较.*不同|compare|versus|yoy|mom/i, label: '对比分析' },
  { intent: 'suggestion', patterns: /建议|推荐|怎么做|如何优化|如何提升|怎么办|方向|策略|suggest|recommend|how to/i, label: '优化建议' },
  { intent: 'diagnosis', patterns: /异常|问题|风险|不对|错误|质量|缺失|脏数据|anomal|risk|error|quality/i, label: '数据诊断' },
];

function detectIntent(query: string): { intent: QueryIntent; label: string } {
  const trimmed = query.trim().toLowerCase();
  
  // 问候语
  if (/^(你好|hi|hello|嗨|hey|在吗|在不在|您好|早上好|下午好|晚上好|早|晚安)\s*[!！。.？?]*$/i.test(trimmed)) {
    return { intent: 'greeting', label: '问候' };
  }
  // 闲聊
  if (/^(谢谢|感谢|thanks|ok|好的|明白了|知道|懂了|嗯|哦|是的|对)\s*[!！。.？?]*$/i.test(trimmed)) {
    return { intent: 'smalltalk', label: '闲聊' };
  }
  
  // 按优先级匹配意图
  for (const rule of INTENT_RULES) {
    if (rule.patterns.test(trimmed)) {
      return { intent: rule.intent, label: rule.label };
    }
  }
  
  return { intent: 'query', label: '综合分析' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      data,
      fieldStats,
      analysisMode = 'comprehensive',
      modelConfig,
      chatHistory,
    } = body as {
      message: string;
      data?: { headers: string[]; rows: Record<string, unknown>[]; rowCount?: number; columnCount?: number };
      fieldStats?: Array<{
        field: string; type: string; count?: number; nullCount?: number;
        uniqueCount?: number; numericStats?: { min: number; max: number; mean: number; median: number; sum: number; std?: number };
        sampleValues?: unknown[];
      }>;
      analysisMode?: string;
      modelConfig?: LLMModelConfig;
      chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    // 模型配置验证
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '⚠️ 请先配置 AI 模型。在设置中添加模型（需提供 API Key、Base URL 和模型名称）' })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const question = message || '';

    // 意图识别
    const { intent, label } = detectIntent(question);

    // 问候语
    if (intent === 'greeting') {
      const encoder = new TextEncoder();
      const greetingResponse = `你好！我是AI数据分析助手，可以帮您分析上传的数据。

您可以直接向我提问，比如：
- 「各区域的销售额对比如何」
- 「哪些指标存在异常」
- 「推荐下一步分析方向」

也可以点击下方的快捷分析按钮开始。

## 推荐追问
1. 这份数据的整体概况是怎样的
2. 数据中有哪些值得关注的异常或趋势
3. 基于当前数据，最应该优先解决的业务问题是什么`;

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: greetingResponse })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // 闲聊
    if (intent === 'smalltalk') {
      const encoder = new TextEncoder();
      const smallTalkResponse = `不客气！如果有数据分析相关的问题，随时告诉我。`;

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: smallTalkResponse })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // 构建数据上下文
    const dataContext = buildDataContext(data, fieldStats);

    // 根据意图构建差异化系统提示词
    const systemPrompt = buildSystemPrompt(intent, label, data, fieldStats);

    // 构建消息（含多轮对话上下文）
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // 注入最近5轮对话上下文
    if (chatHistory && chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: `数据概要：\n${dataContext}\n\n用户问题：${question}` });

    // 流式调用 LLM（带超时和重试兜底）
    try {
      const stream = await callLLMStreamWithFallback(modelConfig!, messages);
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (llmError) {
      const encoder = new TextEncoder();
      const errorMsg = llmError instanceof Error ? llmError.message : 'AI 模型调用失败';
      const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('超时');
      const is401 = errorMsg.includes('401') || errorMsg.includes('Unauthorized');
      const is404 = errorMsg.includes('404') || errorMsg.includes('Not Found');
      const is429 = errorMsg.includes('429') || errorMsg.includes('Too Many');

      let userMsg = '❌ ';
      if (is401) {
        userMsg += 'API Key 无效或已过期，请检查模型配置中的 API Key。';
      } else if (is404) {
        userMsg += '模型名称不正确，请检查模型配置中的模型名称是否与提供商一致。';
      } else if (is429) {
        userMsg += 'API 调用频率超限，请稍后重试，或检查账户额度。';
      } else if (isTimeout) {
        userMsg += 'AI 模型响应超时，请稍后重试。如果持续超时，建议切换更快的模型。';
      } else {
        userMsg += `${errorMsg}\n\n请检查模型配置是否正确（API Key、Base URL、模型名称）。`;
      }

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: userMsg })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
          }
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }
  } catch (error) {
    console.error('LLM insight API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 带兜底的 LLM 流式调用
 * - 首次调用超时 60s
 * - 超时后降级为 1 次重试（30s 超时）
 * - 重试仍失败则抛出异常
 */


/**
 * 构建差异化系统提示词（根据意图）
 * 
 * 2024-11-12 升级：使用结构化输出规范
 * - JSON Schema：核心发现、维度分析、建议
 * - Markdown：详细分析
 * - 强制数据精确性：禁止"近千人"、"显著增长"等模糊表达
 */
function buildSystemPrompt(
  intent: QueryIntent,
  intentLabel: string,
  data?: { headers: string[]; rows: Record<string, unknown>[] },
  fieldStats?: Array<Record<string, unknown>>
): string {
  const numericCount = fieldStats?.filter(f => f.type === 'number').length || 0;
  const textCount = fieldStats?.filter(f => f.type === 'string').length || 0;
  const rowCount = data?.rows?.length || 0;
  const colCount = data?.headers?.length || 0;

  // 意图对应的专项指令
  const intentInstructions: Record<string, string> = {
    query: `用户想查询具体数据。你必须：
1. 精确引用数据字段名和数值
2. 如果数据中不存在用户查询的字段，明确告知并建议相近字段
3. 给出计算过程，标注数据来源字段`,
    attribution: `用户想了解原因。你必须：
1. 先给出最可能的1-2个归因方向
2. 用数据交叉验证归因假设
3. 如果数据不足以确认归因，说明需要什么额外数据
4. 严禁凭空编造原因`,
    prediction: `用户想了解趋势。你必须：
1. 基于已有数据趋势做外推，明确标注"基于历史趋势外推"
2. 给出置信度范围
3. 列出可能影响预测的关键变量
4. 严禁给出精确到个位的预测数字`,
    comparison: `用户想做对比。你必须：
1. 明确对比维度和对比项
2. 给出差异的量化指标（百分比、倍数等）
3. 分析差异背后的可能原因
4. 如果数据不支持对比（如缺少时间维度），明确说明`,
    suggestion: `用户想要建议。你必须：
1. 建议必须基于数据发现，每条建议标注数据依据
2. 按本周/本月/本季度分层，优先低成本方案
3. 每条建议附带预期收益
4. 严禁泛泛而谈（如"加强管理""提高效率"），必须具体`,
    diagnosis: `用户想诊断问题。你必须：
1. 系统检查数据质量：缺失率、异常值、一致性
2. 定位问题字段和问题行
3. 评估问题对分析结果的影响
4. 给出修复建议和处理优先级`,
  };

  const intentInstruction = intentInstructions[intent] || intentInstructions.query;

  return `你是专业数据洞察专家。用户意图识别：${intentLabel}。

## 核心约束（铁律）
1. **数据范围强约束**：仅基于当前数据集回答，禁止编造数据。如果数据不足以回答，必须明确说明
2. **标注数据来源**：所有引用数值必须标注来源字段名，如"销售额字段显示..."
3. **幻觉拦截**：如果不确定某个结论，标注置信度（高/中/低），低置信度结论必须标注验证条件
4. **禁止暴露推理过程**：不要写"让我算一下""不对哦""我看错了"等内部思考
5. **结论先行**：先给核心结论（≤4点），再展开分析
6. **数字精确**：所有数值必须基于数据计算，保留2位小数
7. **结构化输出**：用标题+列表，不用长段落

## 【关键】数据精确性规范（2024-11-12 升级）

❌ 禁止的模糊表达：
- "近千人" → ✅ 精确值："986人"
- "环比增长显著" → ✅ 精确值："环比+23.5%"
- "同比增长明显" → ✅ 精确值："同比+15.2%"
- "表现亮眼" → ✅ 精确描述："环比+23.5%，高于均值15个百分点"
- "需要关注" → ✅ 精确描述："客流环比-8.2%，连续2周下降"
- "头部效应明显" → ✅ 精确描述："Top3门店占比68.5%，较上月+3.2pp"
- "受XX带动" → ✅ 精确描述："受'手机'品类增长带动（该品类销售额+45.3%，贡献整体增长的62%）"

✅ 正确的数值表达：
- 金额："85.6万元"（非"约86万"）
- 百分比："23.5%"（非"接近四分之一"）
- 人数："986人"（非"近千人"）
- 变化："环比+23.5%（上周801人→本周986人）"

## ${intentInstruction}

## 输出格式（强制 JSON + Markdown）

你必须同时输出【结构化 JSON】和【Markdown 详细分析】。

### 结构化 JSON（必须输出）

在回答开头用 \`\`\`json\`\`\` 输出以下 JSON：

\`\`\`json
{
  "meta": {
    "scenario": "一句话描述分析场景（行业+核心问题）",
    "dataRange": "数据范围（时间/门店/品类等）",
    "timestamp": "ISO时间戳"
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
        "verify": "需要什么数据验证（如果不确定）"
      },
      "dimensions": ["关联维度1", "关联维度2"]
    }
  ],
  "recommendations": [
    {
      "title": "建议标题（动词开头）",
      "urgency": "immediate|short_term|long_term",
      "actions": ["具体行动1", "具体行动2"],
      "dataBasis": "数据依据（如'科技园店坪效3,520元/㎡，领先均值40%'）",
      "expectedBenefit": "预期收益（如'预计提升销售额10-15%'）",
      "priority": 1
    }
  ],
  "limitations": ["数据局限性1", "数据局限性2"],
  "followUpQuestions": ["深度追问1", "深度追问2", "深度追问3"]
}
\`\`\`

### Markdown 详细分析

在 JSON 之后用 Markdown 输出详细分析。格式要求：

\`\`\`markdown
## 📊 一句话场景（不超过20字）

## 🔑 核心发现

### 1. [发现标题]
- **结论**：[一句话结论]
- **数据**：[精确数值+同比环比，格式：指标名 + 数值 + 单位 + 同比/环比]
- **原因**：[可能原因，如果不确定写"可能原因+需XX数据验证"]
- **维度**：[涉及的维度，如门店/区域/品类]

### 2. ...

## 💡 建议

### 🔴 立即行动
1. [建议标题]
   - 依据：[数据依据]
   - 行动：[具体步骤]
   - 预期：[收益估算]

## ⚠️ 数据局限性

## ❓ 推荐追问
\`\`\`

## 当前数据概要
- 数据规模：${rowCount}行 × ${colCount}列
- 数值字段${numericCount}个，文本字段${textCount}个
- 识别意图：${intentLabel}

不要说"无法判断"——给出最可能的情况和验证条件`;
}

function buildDataContext(
  data?: { headers: string[]; rows: Record<string, unknown>[]; rowCount?: number; columnCount?: number },
  fieldStats?: Array<Record<string, unknown>>
): string {
  if (!data || !fieldStats) return '（无数据）';

  const parts: string[] = [];
  parts.push(`字段统计：`);
  fieldStats.forEach(stat => {
    const field = stat.field as string;
    const type = stat.type as string;
    const ns = stat.numericStats as { min: number; max: number; mean: number; median: number; sum: number } | undefined;
    if (type === 'number' && ns) {
      parts.push(`- ${field}: 数值型, 范围${ns.min}~${ns.max}, 均值${ns.mean.toFixed(2)}, 中位数${ns.median}`);
    } else {
      const sampleVals = (stat.sampleValues as unknown[] || []).slice(0, 3).join(', ');
      parts.push(`- ${field}: ${type}型, 样例: ${sampleVals}`);
    }
  });

  if (data.rows.length > 0) {
    parts.push(`\n数据前${Math.min(10, data.rows.length)}行：`);
    data.rows.slice(0, 10).forEach((row, i) => {
      parts.push(`${i + 1}. ${data.headers.map(h => `${h}=${row[h]}`).join(', ')}`);
    });
  }

  return parts.join('\n');
}
