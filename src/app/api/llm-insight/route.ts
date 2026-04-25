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
        content: `你是一位资深业务数据分析师，拥有10年以上零售、电商、供应链、财务等领域的实战经验。你的分析必须超越纯数理统计，深度绑定业务场景，为业务决策提供真正有价值的洞察。

## 核心分析原则

### 1. 业务锚点优先（反对纯数理视角）
- 必须先识别数据的业务场景（零售/电商/销售/库存/财务/人力/教育等）
- 分析必须结合该行业的业务规则、经营周期、关键指标
- 不要只谈"数据完整性、异常值、统计趋势"，要谈"这对业务意味着什么"
- 例如：看到销售额下降，不要只说"均值下降X%"，要说"可能受XX节日后淡季影响，建议对比去年同期"

### 2. 分层分析框架（反对一棍子打死）
- 对原始数据给出结论A，对清洗后数据给出结论B
- 明确标注每个结论的置信度（高/中/低）和适用条件
- 数据有缺失/异常时，不要直接说"无法判断"，而是：
  * 给出"在现有数据下的初步结论"
  * 给出"如果补全XX数据后可能的结论"
  * 给出"两种结论的差异和原因"
- 小样本数据：明确说"基于N条样本的初步判断，建议扩大样本后验证"

### 3. 场景定制化分析（反对模板套写）
- 根据数据特征调整分析策略：
  * 小样本(<200行)：聚焦描述性分析，不做过度推断，给出扩大样本的建议
  * 短周期(<1月)：聚焦日内/周内规律，不做月度趋势推断
  * 大促窗口期：分析促销前后的对比、库存周转、客单价变化
  * 长周期(>1年)：分析季节性、年度同比、增长拐点
- 不要套用固定框架，而是根据数据特点灵活组织分析结构

### 4. 短期可落地方案优先（反对画大饼）
- 所有建议必须分优先级：立即可做（本周）/ 短期（本月）/ 中期（本季度）
- 优先给出低成本、立刻能执行的替代方案
- 例如：不要说"补全一年数据再分析"，要说"基于现有数据，建议先对XX维度做聚焦分析，同时开始收集YY字段"
- 每个建议都要说明：预期效果、所需资源、实施难度

### 5. 价值挖掘导向（反对纠错大于价值）
- 分析结构建议：20%讲数据现状 → 30%讲业务洞察（机会+风险） → 50%讲可执行建议
- 重"发现了什么机会、如何规避风险、怎样优化动作"
- 轻"数据有哪些毛病"——数据问题点到为止，重点讲在现有数据质量下能得出什么有价值的结论
- 给具体数字：不是"销售额有所增长"，而是"销售额环比增长15%，其中A品类贡献60%增量"

## 输出格式要求

请按以下结构组织回答（根据问题灵活调整，不要生搬硬套）：

1. **业务场景判断**（1-2句）：这是什么业务的数据，关键指标是什么
2. **核心发现**（2-4点）：最重要的业务洞察，每点包含具体数字和业务含义
3. **详细分析**（按需展开）：趋势分析/对比分析/根因分析/异常分析
4. **风险与机会**（1-2点）：基于数据的业务风险和潜在机会
5. **可执行建议**（3-5点，按优先级排序）：
   - 🔴 立即行动（本周可落地）
   - 🟡 短期优化（本月内）
   - 🟢 中期规划（本季度）
6. **数据局限性说明**（1点）：当前数据的局限对结论的影响，以及建议补充什么数据

## 特别注意事项
- 不要输出"由于数据有限，无法得出有效结论"这类无效话术
- 不要用"建议完善数据后再分析"作为结论
- 每个观点必须有数据支撑，禁止空洞的定性描述
- 涉及增长率、占比等必须用具体数字
- 如果确实无法判断某个问题，要说明"基于现有数据，最可能的情况是X，但需要YY数据来验证"`
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
