import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

export const runtime = 'nodejs';

/**
 * 构建业务场景上下文
 * 从数据特征推断业务场景，为AI提供业务锚点
 */
function buildBusinessContext(data: ParsedData, analysis: DataAnalysis): string {
  const deep = analysis.deepAnalysis;
  const headers = data.headers;
  const rows = data.rows;

  // 1. 行业场景推断
  let industry = '通用业务';
  const headerText = headers.join(' ').toLowerCase();
  if (/sales|revenue|amount|price|order|customer|sku|product|gmv|transaction/i.test(headerText)) {
    industry = '零售/电商/销售';
  } else if (/employee|staff|salary|hr|hire|depart|position/i.test(headerText)) {
    industry = '人力资源';
  } else if (/cost|budget|expense|profit|income|asset|liability/i.test(headerText)) {
    industry = '财务/会计';
  } else if (/student|score|grade|course|teacher|class|exam/i.test(headerText)) {
    industry = '教育';
  } else if (/inventory|stock|warehouse|supply|purchase/i.test(headerText)) {
    industry = '供应链/库存';
  } else if (/user|login|session|click|conversion|retention|dau|mau/i.test(headerText)) {
    industry = '互联网/用户运营';
  }

  // 2. 数据周期特征
  let periodFeature = '';
  const dateHeaders = headers.filter(h => {
    const vals = rows.slice(0, 20).map(r => String(r[h]));
    const datePattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/;
    return vals.filter(v => datePattern.test(v)).length >= vals.length * 0.5;
  });

  if (dateHeaders.length > 0) {
    const dateCol = dateHeaders[0];
    const dates = rows.map(r => String(r[dateCol])).filter(d => d && d !== 'null' && d !== 'undefined');
    if (dates.length >= 2) {
      try {
        const sorted = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
        if (sorted.length >= 2) {
          const spanDays = (sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / (1000 * 60 * 60 * 24);
          if (spanDays < 7) periodFeature = '超短周期（<7天）';
          else if (spanDays < 30) periodFeature = '短周期（<1月）';
          else if (spanDays < 90) periodFeature = '中周期（1-3月）';
          else if (spanDays < 365) periodFeature = '中长周期（3-12月）';
          else periodFeature = '长周期（>1年）';
        }
      } catch { /* ignore */ }
    }
  }

  // 3. 数据规模特征
  let scaleFeature = '';
  if (data.rowCount < 50) scaleFeature = '极小样本（<50行）';
  else if (data.rowCount < 200) scaleFeature = '小样本（<200行）';
  else if (data.rowCount < 1000) scaleFeature = '中等样本';
  else scaleFeature = '大样本';

  // 4. 是否有大促/特殊事件特征
  let eventFeature = '';
  const textContent = rows.slice(0, 50).map(r => headers.map(h => String(r[h])).join(' ')).join(' ').toLowerCase();
  if (/双11|双十一|618|双12|黑五|大促|促销|活动|campaign|festival|holiday/i.test(textContent)) {
    eventFeature = '检测到促销/活动数据';
  }

  // 5. 关键业务指标推断
  const numericHeaders = analysis.fieldStats.filter(f => f.type === 'number').map(f => f.field);
  const keyMetrics: string[] = [];
  numericHeaders.forEach(h => {
    const lower = h.toLowerCase();
    if (/sales|revenue|amount|gmv|turnover/i.test(lower)) keyMetrics.push(`${h}(销售额指标)`);
    else if (/profit|margin|earning/i.test(lower)) keyMetrics.push(`${h}(利润指标)`);
    else if (/cost|expense|spend/i.test(lower)) keyMetrics.push(`${h}(成本指标)`);
    else if (/quantity|qty|count|volume|num/i.test(lower)) keyMetrics.push(`${h}(数量指标)`);
    else if (/price|unit|单价/i.test(lower)) keyMetrics.push(`${h}(价格指标)`);
    else if (/customer|user|client/i.test(lower)) keyMetrics.push(`${h}(客户指标)`);
    else if (/rate|ratio|percent|conversion/i.test(lower)) keyMetrics.push(`${h}(比率指标)`);
    else keyMetrics.push(`${h}(数值指标)`);
  });

  return `
【业务场景识别结果】
- 推断行业场景: ${industry}${deep ? ` / 系统识别: ${deep.dataProfile.suggestedIndustry}` : ''}
- 数据规模: ${scaleFeature}（${data.rowCount}行 x ${data.columnCount}列）
${periodFeature ? `- 数据周期: ${periodFeature}` : ''}
${eventFeature ? `- 特殊事件: ${eventFeature}` : ''}
- 关键业务指标: ${keyMetrics.slice(0, 6).join(', ') || '未识别'}
${deep ? `
【深度分析摘要】
- 数据健康评分: ${deep.healthScore.overall}/100（完整性${deep.healthScore.completeness} / 一致性${deep.healthScore.consistency} / 质量${deep.healthScore.quality} / 可用性${deep.healthScore.usability}）
- 数据类型: ${deep.dataProfile.dataType} / 成熟度: ${deep.dataProfile.dataMaturity} / 分析潜力: ${deep.dataProfile.analysisPotential}
- 关键发现: ${deep.keyFindings.length}项（严重${deep.keyFindings.filter(k => k.severity === 'critical').length} / 警告${deep.keyFindings.filter(k => k.severity === 'warning').length}）
- 趋势: ${deep.trends.length}项 / 相关性: ${deep.correlations.length}组 / 行动建议: ${deep.actionItems.length}项` : ''}`;
}

/**
 * 构建分层数据上下文
 */
function buildLayeredContext(data: ParsedData, analysis: DataAnalysis): string {
  // 原始数据结论
  const rawInsights = analysis.insights || [];

  // 清洗后数据结论（如果有深度分析）
  const cleanedInsights: string[] = [];
  if (analysis.deepAnalysis) {
    const deep = analysis.deepAnalysis;
    if (deep.keyFindings.length > 0) {
      cleanedInsights.push(...deep.keyFindings.slice(0, 5).map(k =>
        `[${k.severity === 'critical' ? '严重' : k.severity === 'warning' ? '警告' : k.severity === 'positive' ? '正面' : '提示'}] ${k.title}: ${k.detail}`
      ));
    }
    if (deep.trends.length > 0) {
      cleanedInsights.push(...deep.trends.slice(0, 3).map(t =>
        `[趋势] ${t.field}: ${t.direction === 'up' ? '上升' : t.direction === 'down' ? '下降' : t.direction === 'volatile' ? '波动' : '稳定'} ${t.changeRate !== 0 ? `(${t.changeRate}%)` : ''} - ${t.description}`
      ));
    }
  }

  return `
【原始数据层结论】（基于全部${data.rowCount}行原始数据）
${rawInsights.length > 0 ? rawInsights.map(i => `- ${i}`).join('\n') : '- 暂无自动洞察'}

${cleanedInsights.length > 0 ? `【清洗/分析后结论】（基于深度分析引擎）
${cleanedInsights.join('\n')}` : ''}`;
}

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

    const businessContext = buildBusinessContext(data, analysis);
    const layeredContext = buildLayeredContext(data, analysis);

    // 用户问题分类
    const questionLower = (question || '').toLowerCase();
    const isTrendQuery = /趋势|走势|变化|增长|下降|波动|trend|growth|decline/i.test(questionLower);
    const isQualityQuery = /质量|问题|缺失|异常|错误|quality|issue|missing|anomaly/i.test(questionLower);
    const isInsightQuery = /洞察|发现|机会|风险|insight|opportunity|risk|find/i.test(questionLower);
    const isActionQuery = /建议|怎么做|方案|优化|改进|action|recommend|how|optimize/i.test(questionLower);

    // 确定分析策略
    let analysisStrategy = '综合深度分析';
    if (isTrendQuery) analysisStrategy = '趋势与周期分析';
    if (isQualityQuery) analysisStrategy = '数据质量与根因分析';
    if (isInsightQuery) analysisStrategy = '业务洞察与机会挖掘';
    if (isActionQuery) analysisStrategy = '可落地方案与优先级排序';

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `你是一位资深业务数据分析师。基于数据给出精准、简洁、结构化的业务洞察。

## 铁律规则（必须严格遵守）

1. **禁止暴露内部推理过程**：不要在回答中展示计算过程、自我纠正、犹豫、"不对哦"、"哦等等"等思维链。先在脑中完成所有计算和校验，直接输出最终结论。
2. **禁止冗余**：每个观点只说一次，不重复、不换种说法再说一遍。能用1句话说清的不用2句。
3. **结论先行**：先给结论，再给支撑数据。不要先列一堆数据再总结。
4. **数字精确**：涉及金额用"万"为单位（如36.2万而非362000），百分比保留1位小数。
5. **结构化输出**：严格按下方模板输出，不增减章节。

## 输出模板

**场景**：1句话说明业务场景和数据概况

**结论**：
- 结论1（含关键数字）
- 结论2
- 结论3
（最多4点，每点不超过2行）

**分析**：
按需展开2-3个核心论点，每个论点1-3句话，包含具体数字

**建议**：
- 🔴 立即行动：1-2条（本周可落地，附预期效果）
- 🟡 短期优化：1-2条（本月内）
- 🟢 中期规划：1条（本季度）

**局限**：1句话说明数据局限

## 分析原则

- 业务锚点优先：先识别行业场景，分析绑定业务规则
- 分层标注置信度：每个核心结论后标注（置信度：高/中/低）
- 价值导向：20%现状 → 30%洞察 → 50%建议
- 小样本要明说"基于N条样本的初步判断"
- 不要说"无法判断"——给出最可能的情况和验证条件

## 推荐追问（必须输出）
在回答末尾必须输出"## 推荐追问"章节，包含3个深度追问。要求：
- 追问必须是具体的、有业务深度的问题，不是对回答内容的复述
- 每个追问要指向更深一层的分析维度（如：追问根因、追问交叉维度拆解、追问时间趋势验证、追问对标对比等）
- 格式：每行一个追问，用数字编号（1. 2. 3.），不加粗不加符号
- 示例❌："销售额为什么下降" → 示例✅："按区域拆分后，哪个区域的销售额降幅最大，是全品类下滑还是个别品类拖累"
- 示例❌："数据质量怎么样" → 示例✅："剔除退款订单和异常大单后，月初月末的变化率是多少，结论是否仍然成立"`
      },
      {
        role: 'user',
        content: `${businessContext}

${layeredContext}

【字段统计详情】
${analysis.fieldStats.map(f => {
  const base = `- ${f.field}: ${f.type}类型, 非空${f.count - f.nullCount}/${f.count}, 唯一值${f.uniqueCount}`;
  if (f.numericStats) {
    return `${base}, 最小${f.numericStats.min}, 最大${f.numericStats.max}, 均值${f.numericStats.mean.toFixed(2)}, 中位数${f.numericStats.median?.toFixed(2) ?? '-'}, 总和${f.numericStats.sum?.toFixed(0) ?? '-'}`;
  }
  return base;
}).join('\n')}

【用户分析需求】
分析策略: ${analysisStrategy}
具体问题: ${question || '请全面分析这份数据，给出业务洞察和可执行建议'}`
      }
    ];

    // 使用流式输出
    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.5
    });

    // 返回流式响应
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content.toString() }) }\n\n`));
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
