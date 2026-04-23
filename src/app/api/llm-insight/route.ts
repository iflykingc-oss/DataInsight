import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, analysis, question }: { data: ParsedData; analysis: DataAnalysis; question?: string } = body;
    
    if (!data || !analysis) {
      return NextResponse.json(
        { error: '缺少数据或分析结果' },
        { status: 400 }
      );
    }
    
    // 构建提示词
    const summaryText = `
数据概述：
- 文件名: ${data.fileName}
- 总行数: ${analysis.summary.totalRows}
- 总列数: ${analysis.summary.totalColumns}
- 数值列: ${analysis.summary.numericColumns}
- 文本列: ${analysis.summary.textColumns}
- 空值数: ${analysis.summary.nullValues}
- 重复行: ${analysis.summary.duplicateRows}

字段统计：
${analysis.fieldStats.map(f => `- ${f.field}: ${f.type}类型, ${f.uniqueCount}个唯一值${f.numericStats ? `, 范围: ${f.numericStats.min}~${f.numericStats.max}, 均值: ${f.numericStats.mean.toFixed(2)}` : ''}`).join('\n')}

${analysis.insights.length > 0 ? `自动洞察：\n${analysis.insights.map(i => `- ${i}`).join('\n')}` : ''}

${analysis.anomalies && analysis.anomalies.length > 0 ? `异常数据：\n${analysis.anomalies.slice(0, 5).map((a: { description: string }) => `- ${a.description}`).join('\n')}` : ''}
`;
    
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);
    
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `你是一个专业的数据分析师助手。请基于提供的数据和统计分析结果，回答用户的问题。
请用简洁专业的语言给出分析和建议。如果需要，可以提供数据可视化的建议。
重点关注：
1. 数据质量问题和改进建议
2. 数据趋势和模式识别
3. 业务洞察和发现
4. 可操作的分析建议`
      },
      {
        role: 'user',
        content: `${summaryText}\n\n用户问题: ${question || '请分析这个数据集，给出关键洞察和建议'}`
      }
    ];
    
    // 使用流式输出
    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.7
    });
    
    // 返回流式响应
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content.toString() })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
    
    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('LLM洞察生成错误:', error);
    return NextResponse.json(
      { error: '洞察生成失败' },
      { status: 500 }
    );
  }
}
