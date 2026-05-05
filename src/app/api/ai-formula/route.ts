/**
 * AI公式生成API
 * 基于自然语言描述生成标准表格公式
 */

import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { verifyAuth } from '@/lib/auth-middleware';

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user?.permissions?.ai_analyze) return NextResponse.json({ error: '无AI分析权限' }, { status: 403 });

  try {
    const body = await req.json();
    const { requirement, headers, sampleRows, modelConfig } = body;

    if (!requirement || !modelConfig) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const prompt = `你是一个Excel/表格公式专家。请根据用户的需求生成一个标准的Excel公式。

可用列名：${headers.join(', ')}
示例数据（前3行）：
${JSON.stringify(sampleRows, null, 2)}

用户需求：${requirement}

请生成一个Excel公式，并以JSON格式返回：
{
  "formula": "公式字符串",
  "explanation": "公式逻辑解释（中文）"
}

要求：
1. 公式必须是标准的Excel语法
2. 只返回JSON，不要其他内容
3. 解释要通俗易懂，让不懂公式的用户也能理解`;

    const content = await callLLM(
      {
        apiKey: modelConfig.apiKey,
        baseUrl: modelConfig.baseUrl,
        model: modelConfig.model,
      },
      [
        {
          role: 'system',
          content: '你是一个Excel公式专家，擅长将自然语言需求转化为精确的Excel公式。',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.3,
        max_tokens: 1000,
        timeout: 60000,
      }
    );

    // 尝试解析JSON
    let result: { formula: string; explanation: string };
    try {
      // 尝试直接解析
      result = JSON.parse(content);
    } catch {
      // 尝试提取JSON块
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // 无法解析，构造一个简单结果
        result = {
          formula: content.trim().split('\n')[0],
          explanation: '根据您的描述生成的公式',
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        formula: result.formula || '=A1',
        explanation: result.explanation || '公式已生成',
      },
    });
  } catch (error: unknown) {
    console.error('[AI Formula API Error]', error);
    const message = error instanceof Error ? error.message : '公式生成失败';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
