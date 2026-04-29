import { NextRequest } from 'next/server';
import { callLLM, validateModelConfig, type LLMModelConfig } from '@/lib/llm';

/**
 * AI 智能建表 API
 * 支持：
 * 1. 场景模板列表获取
 * 2. AI 生成表格方案（流式）
 * 3. AI 迭代修改方案（流式）
 * 4. 确认生成 Excel 文件
 */

// 场景模板定义
const SCENE_TEMPLATES = [
  // 通用场景
  { id: 'general-ledger', name: '通用收支台账', industry: '通用', usage: '日常收支记录与统计', category: 'general' },
  { id: 'general-inventory', name: '通用库存管理', industry: '通用', usage: '商品/物料出入库管理', category: 'general' },
  { id: 'general-project', name: '项目管理台账', industry: '通用', usage: '项目进度与成本跟踪', category: 'general' },
  { id: 'general-expense', name: '费用报销台账', industry: '通用', usage: '员工费用记录与审批', category: 'general' },
  { id: 'general-asset', name: '固定资产台账', industry: '通用', usage: '资产登记与折旧管理', category: 'general' },
  // 零售电商
  { id: 'retail-daily-sales', name: '日销跟踪表', industry: '零售电商', usage: '每日销售数据记录与分析', category: 'retail' },
  { id: 'retail-product-analysis', name: '商品分析表', industry: '零售电商', usage: '商品销售排行与毛利分析', category: 'retail' },
  { id: 'retail-purchase', name: '采购进货表', industry: '零售电商', usage: '供应商采购记录与成本管控', category: 'retail' },
  { id: 'retail-customer', name: '客户管理表', industry: '零售电商', usage: '客户信息与消费记录', category: 'retail' },
  { id: 'retail-promotion', name: '促销活动表', industry: '零售电商', usage: '活动效果与ROI分析', category: 'retail' },
  // 美业服务
  { id: 'beauty-appointment', name: '预约排班表', industry: '美业服务', usage: '客户预约与技师排班', category: 'beauty' },
  { id: 'beauty-member', name: '会员管理表', industry: '美业服务', usage: '会员信息与消费记录', category: 'beauty' },
  { id: 'beauty-service', name: '服务项目表', industry: '美业服务', usage: '服务项目定价与销量', category: 'beauty' },
  { id: 'beauty-consumable', name: '耗材管理表', industry: '美业服务', usage: '物料消耗与补货管理', category: 'beauty' },
  { id: 'beauty-revenue', name: '营收日报表', industry: '美业服务', usage: '日/周/月营收汇总', category: 'beauty' },
  // 小微团队
  { id: 'team-attendance', name: '考勤打卡表', industry: '小微团队', usage: '员工出勤与工时统计', category: 'team' },
  { id: 'team-payroll', name: '工资发放表', industry: '小微团队', usage: '薪资计算与发放记录', category: 'team' },
  { id: 'team-task', name: '任务分配表', industry: '小微团队', usage: '任务分配与完成跟踪', category: 'team' },
  { id: 'team-kpi', name: '绩效考核表', industry: '小微团队', usage: '员工绩效评分与排名', category: 'team' },
  { id: 'team-reimbursement', name: '费用审批表', industry: '小微团队', usage: '团队费用申请与审批', category: 'team' },
];

// 表格方案类型（兼容前后端两种字段命名：后端 name / 前端 key+title）
interface TableScheme {
  tableName: string;
  purpose?: string;
  columns: Array<{
    name?: string;
    key?: string;
    title?: string;
    type: 'text' | 'number' | 'date' | 'select';
    description?: string;
    required?: boolean;
    selectOptions?: string[];
    formula?: string;
  }>;
  sampleRows: Record<string, unknown>[];
  formulas?: Array<{
    cell: string;
    formula: string;
    description: string;
  }>;
  designNotes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, modelConfig } = body as {
      action: 'list-templates' | 'generate' | 'iterate' | 'confirm';
      modelConfig?: LLMModelConfig;
      [key: string]: unknown;
    };

    // 模板列表和确认生成不需要模型配置
    if (action === 'list-templates') {
      return Response.json({ success: true, data: SCENE_TEMPLATES });
    }
    if (action === 'confirm') {
      return handleConfirm(body);
    }

    // generate 和 iterate 需要验证模型配置
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      return Response.json({ success: false, error: validation.error }, { status: 400 });
    }

    switch (action) {
      case 'generate':
        return handleGenerate(body, modelConfig!);
      case 'iterate':
        return handleIterate(body, modelConfig!);
      default:
        return Response.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI table builder error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : '服务异常' },
      { status: 500 }
    );
  }
}

// 生成表格方案（流式）
async function handleGenerate(body: Record<string, unknown>, modelConfig: LLMModelConfig) {
  const { sceneId, userRequirement, mode = 'simple' } = body as {
    sceneId?: string;
    userRequirement: string;
    mode?: 'simple' | 'expert';
  };

  const scene = sceneId ? SCENE_TEMPLATES.find(t => t.id === sceneId) : null;
  const sceneDesc = scene
    ? `行业：${scene.industry}，用途：${scene.usage}（${scene.name}）`
    : '用户自定义场景';

  const modeInstruction = mode === 'expert'
    ? `专家模式：用户需求较模糊，请主动设计完整的表格方案，包括：
1. 台账用途和业务价值说明
2. 完整字段清单（含字段类型、是否必填、枚举选项、计算公式说明）
3. 3-5条演示示例假数据
4. 统计公式设计（求和、计数、毛利等）
5. 表格结构设计说明`
    : `简易模式：根据用户需求生成表格方案，包含字段清单、示例数据和设计说明。`;

  const systemPrompt = `你是专业的表格设计专家，擅长为中小商家和个体户设计标准化经营台账。

## 核心原则
1. **字段命名规范**：使用通俗语言，不用专业术语（如用"金额"而非"AMT"）
2. **类型合理**：日期字段用date类型，金额用number类型，状态用select类型
3. **公式实用**：只添加实用的统计公式（求和、计数、毛利计算），不要复杂嵌套公式
4. **格式严禁**：禁止合并单元格、禁止多级表头、禁止特殊格式
5. **示例真实**：生成3-5条贴近真实业务的演示假数据，让用户一看就懂
6. **适配分析**：表格结构必须保证用户填入真实数据后可直接用于数据分析

## ${modeInstruction}

## 场景信息
${sceneDesc}

## 输出格式（严格JSON）
必须输出一个合法的JSON对象，结构如下：
\`\`\`json
{
  "tableName": "表格名称",
  "purpose": "台账用途说明",
  "columns": [
    {
      "name": "字段名",
      "type": "text/number/date/select",
      "description": "字段说明",
      "required": true/false,
      "selectOptions": ["选项1", "选项2"],
      "formula": null
    }
  ],
  "sampleRows": [
    {"字段名": "示例值", ...}
  ],
  "formulas": [
    {"cell": "如H2", "formula": "=SUM(D2:D100)", "description": "合计销售额"}
  ],
  "designNotes": "设计说明"
}
\`\`\`

注意：
- columns数组中，每个字段必须包含name/type/description/required
- select类型的字段必须提供selectOptions数组
- number类型字段如果有公式，在formula字段中填写
- sampleRows必须包含3-5条数据，字段与columns对应
- formulas中的公式必须是Excel兼容公式
- 只输出JSON，不要输出其他内容`;

  const userPrompt = `用户需求：${userRequirement}

请根据以上需求设计表格方案。`;

  try {
    const result = await callLLM(modelConfig, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.7, max_tokens: 4096 });

    // 解析JSON
    let scheme: TableScheme;
    try {
      const jsonMatch = result.match(/```json\s*([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI未返回有效的JSON方案');
      scheme = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (parseError) {
      return Response.json({
        success: false,
        error: `AI返回的方案格式异常，请重试。详情：${parseError instanceof Error ? parseError.message : '解析失败'}`,
        rawContent: result,
      }, { status: 200 });
    }

    // 校验方案基本结构
    if (!scheme.tableName || !scheme.columns || !Array.isArray(scheme.columns) || scheme.columns.length === 0) {
      return Response.json({
        success: false,
        error: 'AI生成的方案缺少必要字段（表格名称或字段列表），请重试',
        rawContent: result,
      }, { status: 200 });
    }

    return Response.json({ success: true, data: scheme });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '生成失败';
    return Response.json({ success: false, error: errorMsg }, { status: 200 });
  }
}

// 迭代修改方案（流式）
async function handleIterate(body: Record<string, unknown>, modelConfig: LLMModelConfig) {
  const { currentScheme, userFeedback } = body as {
    currentScheme: TableScheme;
    userFeedback: string;
  };

  const systemPrompt = `你是专业的表格设计专家，正在帮助用户迭代修改表格方案。

## 核心原则
1. 在当前方案基础上修改，保持已有的合理结构
2. 支持用户的口语化修改指令（如"删除XX列"、"增加保质期字段"、"简化表格"）
3. 修改后必须保证表格结构完整、字段类型合理
4. 修改后的示例数据要与字段对应
5. 禁止合并单元格、多级表头

## 输出格式
输出修改后的完整JSON方案（不是增量，是完整方案）：
\`\`\`json
{
  "tableName": "表格名称",
  "purpose": "台账用途说明",
  "columns": [...],
  "sampleRows": [...],
  "formulas": [...],
  "designNotes": "本次修改说明"
}
\`\`\`

只输出JSON，不要输出其他内容。`;

  const userPrompt = `当前表格方案：
${JSON.stringify(currentScheme, null, 2)}

用户修改要求：${userFeedback}

请根据用户要求修改方案，输出修改后的完整JSON。`;

  try {
    const result = await callLLM(modelConfig, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.7, max_tokens: 4096 });

    let scheme: TableScheme;
    try {
      const jsonMatch = result.match(/```json\s*([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI未返回有效的JSON方案');
      scheme = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (parseError) {
      return Response.json({
        success: false,
        error: `方案格式异常，请重试`,
        rawContent: result,
      }, { status: 200 });
    }

    return Response.json({ success: true, data: scheme });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '修改失败';
    return Response.json({ success: false, error: errorMsg }, { status: 200 });
  }
}

// 确认生成Excel文件
async function handleConfirm(body: Record<string, unknown>) {
  const { scheme } = body as { scheme: TableScheme };

  if (!scheme || typeof scheme !== 'object') {
    return Response.json({ success: false, error: '表格方案格式错误' }, { status: 400 });
  }
  if (!scheme.tableName || typeof scheme.tableName !== 'string') {
    return Response.json({ success: false, error: '表格方案缺少名称' }, { status: 400 });
  }
  if (!Array.isArray(scheme.columns) || scheme.columns.length === 0) {
    return Response.json({ success: false, error: '表格方案缺少字段定义' }, { status: 400 });
  }

  try {
    // 动态导入 xlsx（仅此功能需要）
    const XLSX = await import('xlsx');

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 构建表头行（兼容前端 scheme 格式：优先 name，其次 title，最后 key）
    const headers = scheme.columns.map(c => c.name ?? c.title ?? c.key ?? '');
    // 构建数据行（用 key 作为字段名访问 sampleRows）
    const colKeys = scheme.columns.map(c => c.key ?? c.name ?? c.title ?? '');
    const dataRows = (scheme.sampleRows || []).map(row =>
      colKeys.map(k => row[k] ?? '')
    );

    // 合并表头和数据
    const aoa: unknown[][] = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // 设置列宽（自适应）
    ws['!cols'] = headers.map(h => ({
      wch: Math.max(h.length * 2.5, 12),
    }));

    // 添加公式行（在示例数据下方）
    if (scheme.formulas && scheme.formulas.length > 0) {
      const formulaRowIndex = aoa.length;
      const formulaRow: unknown[] = new Array(headers.length).fill('');

      for (const f of scheme.formulas) {
        // 找到公式对应的列索引
        const colLetter = f.cell.replace(/\d/g, '');
        const colIndex = colLetter.charCodeAt(0) - 65; // A=0, B=1, ...
        if (colIndex >= 0 && colIndex < headers.length) {
          formulaRow[colIndex] = f.description;
        }
      }

      // 添加统计行标签
      formulaRow[0] = '统计汇总';
      aoa.push(formulaRow);

      // 重新构建工作表
      const newWs = XLSX.utils.aoa_to_sheet(aoa);
      newWs['!cols'] = ws['!cols'];

      // 为number类型列添加SUM公式
      scheme.columns.forEach((col, colIdx) => {
        if (col.type === 'number') {
          const colLetter = String.fromCharCode(65 + colIdx);
          const cellRef = `${colLetter}${aoa.length}`;
          newWs[cellRef] = {
            t: 'n',
            f: `SUM(${colLetter}2:${colLetter}${aoa.length - 1})`,
            v: 0,
          };
        }
      });

      XLSX.utils.book_append_sheet(wb, newWs, scheme.tableName.slice(0, 31));
    } else {
      XLSX.utils.book_append_sheet(wb, ws, scheme.tableName.slice(0, 31));
    }

    // 生成base64
    const buffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    return Response.json({
      success: true,
      data: {
        fileName: `${scheme.tableName}.xlsx`,
        fileContent: buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('Excel generation error:', error);
    return Response.json({
      success: false,
      error: `文件生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
    }, { status: 200 });
  }
}
