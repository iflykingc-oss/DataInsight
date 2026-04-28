import { NextRequest } from 'next/server';
import { callLLMStream, validateModelConfig, type LLMModelConfig } from '@/lib/llm';

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

    // 验证模型配置
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: `⚠️ ${validation.error}` })}\n\n`));
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
    const questionLower = question.toLowerCase();

    // 问候语/闲聊检测 - 不需要数据分析
    const isGreeting = /^(你好|hi|hello|嗨|hey|在吗|在不在|您好|早上好|下午好|晚上好|早|晚安)\s*[!！。.？?]*$/i.test(questionLower.trim());
    const isSmallTalk = /^(谢谢|感谢|thanks|ok|好的|明白了|知道|懂了|嗯|哦|是的|对)\s*[!！。.？?]*$/i.test(questionLower.trim());

    if (isGreeting) {
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

    if (isSmallTalk) {
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

    const isTrendQuery = /趋势|走势|变化|增长|下降|波动|trend|growth|decline/i.test(questionLower);
    const activeMode = isTrendQuery ? 'trend' : analysisMode;

    // 构建数据上下文
    const dataContext = buildDataContext(data, fieldStats);

    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(activeMode, data, fieldStats);

    // 构建消息（含多轮对话上下文）
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // 注入最近5轮对话上下文
    if (chatHistory && chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-10); // 最近5轮=10条消息
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: `数据概要：\n${dataContext}\n\n用户问题：${question}` });

    // 流式调用 LLM
    try {
      const stream = await callLLMStream(modelConfig!, messages, { temperature: 0.7, max_tokens: 4096 });

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

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: `❌ ${errorMsg}\n\n请检查模型配置是否正确（API Key、Base URL、模型名称）。` })}\n\n`));
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

function buildSystemPrompt(mode: string, data?: { headers: string[]; rows: Record<string, unknown>[] }, fieldStats?: Array<Record<string, unknown>>) {
  const numericCount = fieldStats?.filter(f => f.type === 'number').length || 0;
  const textCount = fieldStats?.filter(f => f.type === 'string').length || 0;
  const rowCount = data?.rows?.length || 0;

  const modeInstructions: Record<string, string> = {
    trend: '重点关注趋势变化、周期规律、异常拐点',
    insight: '重点关注业务洞察、数据异动、关键发现',
    optimization: '重点关注优化方向、效率提升、成本降低',
    risk: '重点关注风险预警、异常检测、损失评估',
    diagnosis: '重点关注数据诊断、质量评估、问题定位',
    comprehensive: '全面分析数据，覆盖趋势、洞察、风险和建议',
  };

  return `你是专业数据分析师，根据数据回答用户问题。

## 铁律
1. 禁止暴露推理过程（不要写"让我算一下""不对哦""我看错了"等内部思考）
2. 禁止冗余：每句话都要有信息增量，不重复已知信息
3. 结论先行：先给核心结论（≤4点），再展开分析
4. 数字精确：所有数值必须基于数据计算，标注置信度
5. 结构化输出：用标题+列表，不用长段落

## 输出格式（严格5段）
1. **场景**（1句话：行业+数据规模+核心指标）
2. **核心发现**（≤4点，每点1行结论+1行数据支撑）
3. **分析**（按维度展开，每个维度2-3行）
4. **建议**（🔴本周 🟡本月 🟢本季度，各1-2条，含预期收益）
5. **局限**（1句话说明数据局限性）

## 推荐追问（必须输出）
在回答末尾必须输出"## 推荐追问"章节，包含3个深度追问。要求：
- 追问必须是具体的、有业务深度的问题，不是对回答内容的复述
- 每个追问要指向更深一层的分析维度（如：追问根因、追问交叉维度拆解、追问时间趋势验证、追问对标对比等）
- 格式：每行一个追问，用数字编号（1. 2. 3.），不加粗不加符号
- 示例❌："销售额为什么下降" → 示例✅："按区域拆分后，哪个区域的销售额降幅最大，是全品类下滑还是个别品类拖累"

## 当前数据概要
- 数据规模：${rowCount}行 × ${(data?.headers?.length || 0)}列
- 数值字段${numericCount}个，文本字段${textCount}个
- 分析模式：${modeInstructions[mode] || modeInstructions.comprehensive}

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

  // 添加前10行数据示例
  if (data.rows.length > 0) {
    parts.push(`\n数据前${Math.min(10, data.rows.length)}行：`);
    data.rows.slice(0, 10).forEach((row, i) => {
      parts.push(`${i + 1}. ${data.headers.map(h => `${h}=${row[h]}`).join(', ')}`);
    });
  }

  return parts.join('\n');
}
