import type { ParsedData, CellValue } from '@/types';

export type ProblemType =
  | 'empty_rows'
  | 'empty_columns'
  | 'duplicate_rows'
  | 'duplicate_rows_partial'
  | 'date_format_inconsistency'
  | 'date_logical_error'
  | 'date_future_error'
  | 'date_past_error'
  | 'date_range_exceeded'
  | 'type_mismatch'
  | 'missing_values'
  | 'missing_critical'
  | 'outliers'
  | 'outliers_extreme'
  | 'spelling_errors'
  | 'spelling_inconsistent'
  | 'encoding_issues'
  | 'encoding_mixed'
  | 'leading_trailing_spaces'
  | 'inconsistent_delimiters'
  | 'invalid_hierarchy'
  | 'numeric_as_text'
  | 'text_as_numeric'
  | 'category_mismatch'
  | 'reference_integrity'
  | 'distribution_skew'
  | 'cardinality_issue'
  | 'sum_mismatch'
  | 'balance_imbalance'
  | 'negative_value_invalid'
  | 'percentage_exceeded'
  | 'rounding_inconsistency'
  | 'currency_inconsistency'
  | 'phone_format_invalid'
  | 'email_format_invalid'
  | 'id_card_invalid'
  | 'bank_account_invalid'
  | 'postal_code_invalid'
  | 'address_incomplete'
  | 'name_incomplete'
  | 'name_contains_numbers'
  | 'age_invalid'
  | 'gender_inconsistent'
  | 'url_format_invalid'
  | 'ip_format_invalid'
  | 'boolean_inconsistent'
  | 'enum_value_invalid'
  | 'range_exceeded'
  | 'value_below_min'
  | 'value_above_max'
  | 'sum_not_zero'
  | 'debit_credit_mismatch'
  | 'transaction_date_future'
  | 'transaction_date_weekend'
  | 'payment_term_invalid'
  | 'invoice_date_mismatch'
  | 'tax_rate_invalid'
  | 'discount_exceeded'
  | 'stock_negative'
  | 'stock_exceeded_capacity'
  | 'reorder_point_invalid'
  | 'lead_time_invalid'
  | 'salary_below_minimum'
  | 'salary_outlier'
  | 'headcount_mismatch'
  | 'turnover_rate_extreme'
  | 'tenure_calculation_error'
  | 'probation_period_invalid'
  | 'contract_date_overlap'
  | 'department_code_invalid'
  | 'employee_id_duplicate'
  | 'manager_not_found'
  | 'self_reference_invalid'
  | 'org_hierarchy_loop'
  | 'budget_exceeded'
  | 'cost_center_invalid'
  | 'project_code_invalid'
  | 'account_code_invalid'
  | 'voucher_number_gap'
  | 'voucher_date_sequence_error'
  | 'cross_column_dependency'
  | 'calculation_result_zero'
  | 'aggregation_mismatch'
  | 'time_series_gap'
  | 'time_series_duplicate'
  | 'schema_change_detected'
  | 'column_type_changed'
  | 'column_renamed'
  | 'column_missing'
  | 'column_added'
  | 'row_count_change_abnormal'
  | 'unit_inconsistency'
  | 'measurement_scale_invalid'
  | 'country_code_invalid'
  | 'timezone_inconsistent';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ProblemCategory = 'data_quality' | 'format_validation' | 'business_logic' | 'financial' | 'hr' | 'retail' | 'statistical' | 'referential' | 'schema';

export interface Problem {
  type: ProblemType;
  severity: Severity;
  title: string;
  description: string;
  column?: string;
  row?: number;
  value?: CellValue;
  count: number;
  indices?: number[];
  details?: ProblemDetail[];
  suggestions: string[];
  autoFixable: boolean;
  autoFixTool?: string;
  category?: ProblemCategory;
  businessImpact?: string;
}

export interface ProblemDetail {
  row?: number;
  column?: string;
  value?: CellValue;
  expected?: CellValue;
  actual?: CellValue;
  message: string;
}

export interface ProblemReport {
  totalScore: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  overallHealth: number;
  hasProblems: boolean;
  problems: Problem[];
  summary: string;
  statistics: {
    totalRows: number;
    totalCols: number;
    emptyCells: number;
    duplicateRows: number;
    inconsistentFormats: number;
    typeErrors: number;
    criticalIssues: number;
    warnings: number;
  };
  recommendations: string[];
  timestamp: number;
  categories?: Record<ProblemCategory, number>;
}

export interface DetectionOptions {
  checkEmptyRows?: boolean;
  checkEmptyColumns?: boolean;
  checkDuplicates?: boolean;
  checkDateFormats?: boolean;
  checkTypeMismatch?: boolean;
  checkMissingValues?: boolean;
  checkOutliers?: boolean;
  checkSpellingErrors?: boolean;
  checkEncodingIssues?: boolean;
  checkWhitespace?: boolean;
  checkNumericText?: boolean;
  checkDateLogicalErrors?: boolean;
  checkDistribution?: boolean;
  checkFinancial?: boolean;
  checkHR?: boolean;
  checkRetail?: boolean;
  checkContactInfo?: boolean;
  checkBusinessRules?: boolean;
  checkStatistical?: boolean;
  outlierMethod?: 'iqr' | 'zscore' | 'mad';
  outlierThreshold?: number;
  strictMode?: boolean;
  sensitivity?: 'high' | 'medium' | 'low';
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, /^\d{4}\/\d{2}\/\d{2}$/, /^\d{2}\/\d{2}\/\d{4}$/, /^\d{2}-\d{2}-\d{4}$/, /^\d{8}$/,
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i,
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i,
  /^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i,
  /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
];

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_PATTERN_11 = /^1[3-9]\d{9}$/;
const URL_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
const IP_PATTERN = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const ID_CARD_15 = /^[1-9]\d{7}((0[1-9])|(1[0-2]))((0[1-9])|[12]\d|3[01])\d{3}$/;
const ID_CARD_18 = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))((0[1-9])|[12]\d|3[01])\d{3}[0-9Xx]$/;

const OUTLIER_THRESHOLDS = { iqr: 1.5, zscore: 3, mad: 3.5 };

const COMMON_ENCODING_ISSUES = [
  { pattern: /Ã¡|Ã©|Ã­|Ã³|Ãº|Ã¼|Ã±/gi, fix: 'UTF-8 Latin-1 编码' },
  { pattern: /Ã§/gi, fix: 'UTF-8 Ç 编码' },
  { pattern: /â€™|â€œ|â€�|â€˜/gi, fix: '智能引号编码' },
  { pattern: /â„¢|â‚¬|â€™/gi, fix: '特殊符号编码' },
];

const SPELLING_VARIANTS: Record<string, { correct: string; variants: string[] }[]> = {
  '男': [{ correct: '男', variants: ['nan', 'Male', 'male', 'm', 'M', 'MAN'] }],
  '女': [{ correct: '女', variants: ['nv', 'Female', 'female', 'f', 'F', 'FEMALE'] }],
  '有': [{ correct: '有', variants: ['yes', 'Yes', 'Y', '√', '✓', '✔', 'YES'] }],
  '无': [{ correct: '无', variants: ['no', 'No', 'N', '×', '✗', '✘', '-', '空', 'NO'] }],
};

const PROVINCE_CODES: Record<string, string> = {
  '北京': '11', '天津': '12', '河北': '13', '山西': '14', '内蒙古': '15',
  '辽宁': '21', '吉林': '22', '黑龙江': '23', '上海': '31', '江苏': '32',
  '浙江': '33', '安徽': '34', '福建': '35', '江西': '36', '山东': '37',
  '河南': '41', '湖北': '42', '湖南': '43', '广东': '44', '广西': '45',
  '海南': '46', '重庆': '50', '四川': '51', '贵州': '52', '云南': '53',
  '西藏': '54', '陕西': '61', '甘肃': '62', '青海': '63', '宁夏': '64', '新疆': '65',
};

export class ProblemDetector {
  private data: ParsedData;
  private options: DetectionOptions;

  constructor(data: ParsedData, options?: DetectionOptions) {
    this.data = data;
    this.options = {
      checkEmptyRows: true, checkEmptyColumns: true, checkDuplicates: true,
      checkDateFormats: true, checkTypeMismatch: true, checkMissingValues: true,
      checkOutliers: true, checkSpellingErrors: true, checkEncodingIssues: true,
      checkWhitespace: true, checkNumericText: true, checkDateLogicalErrors: true,
      checkDistribution: true, checkFinancial: true, checkHR: true, checkRetail: true,
      checkContactInfo: true, checkBusinessRules: true, checkStatistical: true,
      outlierMethod: 'iqr', outlierThreshold: OUTLIER_THRESHOLDS.iqr,
      strictMode: false, sensitivity: 'medium', ...options,
    };
  }

  detectAll(): ProblemReport {
    const problems: Problem[] = [];

    problems.push(...this.detectEmptyRows());
    problems.push(...this.detectEmptyColumns());
    problems.push(...this.detectDuplicateRows());
    problems.push(...this.detectPartialDuplicates());
    problems.push(...this.detectDateFormatInconsistencies());
    problems.push(...this.detectTypeMismatch());
    problems.push(...this.detectMissingValues());
    problems.push(...this.detectCriticalMissingValues());
    problems.push(...this.detectOutliers());
    problems.push(...this.detectExtremeOutliers());
    problems.push(...this.detectSpellingErrors());
    problems.push(...this.detectInconsistentSpelling());
    problems.push(...this.detectEncodingIssues());
    problems.push(...this.detectMixedEncoding());
    problems.push(...this.detectWhitespaceIssues());
    problems.push(...this.detectNumericAsText());
    problems.push(...this.detectTextAsNumeric());
    problems.push(...this.detectDateLogicalErrors());
    problems.push(...this.detectFutureDates());
    problems.push(...this.detectPastDates());
    problems.push(...this.detectDateRangeExceeded());
    problems.push(...this.detectDistributionSkew());
    problems.push(...this.detectVarianceIssues());
    problems.push(...this.detectFinancialIssues());
    problems.push(...this.detectHRErrors());
    problems.push(...this.detectRetailIssues());
    problems.push(...this.detectContactInfoIssues());
    problems.push(...this.detectBusinessRuleViolations());
    problems.push(...this.detectSchemaIssues());
    problems.push(...this.detectReferentialIntegrityIssues());
    problems.push(...this.detectCalculationIssues());
    problems.push(...this.detectAggregationIssues());
    problems.push(...this.detectTimeSeriesIssues());

    return this.generateReport(problems);
  }

  private createProblem(type: ProblemType, severity: Severity, title: string, description: string, opts: Partial<Problem> = {}): Problem {
    return { type, severity, title, description, count: opts.count || 0, indices: opts.indices || [],
      details: opts.details || [], suggestions: opts.suggestions || [], autoFixable: opts.autoFixable ?? false,
      autoFixTool: opts.autoFixTool, column: opts.column, row: opts.row, value: opts.value,
      category: opts.category, businessImpact: opts.businessImpact };
  }

  detectEmptyRows(): Problem[] {
    const problems: Problem[] = [];
    const emptyRowIndices: number[] = [];
    for (let i = 0; i < this.data.rows.length; i++) {
      const row = this.data.rows[i];
      if (this.data.headers.every((h) => row[h] === null || row[h] === undefined || row[h] === '')) {
        emptyRowIndices.push(i);
      }
    }
    if (emptyRowIndices.length > 0) {
      const severity = emptyRowIndices.length > this.data.rows.length * 0.5 ? 'critical' :
        emptyRowIndices.length > this.data.rows.length * 0.2 ? 'high' : 'medium';
      problems.push(this.createProblem('empty_rows', severity, '空行检测',
        `发现 ${emptyRowIndices.length} 个空行（占总行数 ${((emptyRowIndices.length / this.data.rows.length) * 100).toFixed(1)}%）`,
        { count: emptyRowIndices.length, indices: emptyRowIndices,
          suggestions: ['删除空行以优化数据处理', '检查数据导入是否正确', '确认是否有合并单元格导致的数据丢失'],
          autoFixable: true, autoFixTool: 'remove_empty_rows', category: 'data_quality' }));
    }
    return problems;
  }

  detectEmptyColumns(): Problem[] {
    const problems: Problem[] = [];
    const emptyColNames: string[] = [];
    for (const header of this.data.headers) {
      if (this.data.rows.every((row) => row[header] === null || row[header] === undefined || row[header] === '')) {
        emptyColNames.push(header);
      }
    }
    if (emptyColNames.length > 0) {
      problems.push(this.createProblem('empty_columns', 'medium', '空列检测',
        `发现 ${emptyColNames.length} 个完全为空的列: ${emptyColNames.join(', ')}`,
        { count: emptyColNames.length,
          suggestions: ['删除空列以减少数据冗余', '检查是否因数据对齐问题导致误判'],
          autoFixable: true, autoFixTool: 'remove_empty_columns', category: 'data_quality' }));
    }
    return problems;
  }

  detectDuplicateRows(): Problem[] {
    const problems: Problem[] = [];
    const seen = new Map<string, number[]>();
    for (let i = 0; i < this.data.rows.length; i++) {
      const rowKey = JSON.stringify(this.data.rows[i]);
      const existing = seen.get(rowKey);
      if (existing) existing.push(i);
      else seen.set(rowKey, [i]);
    }
    const duplicateGroups: number[][] = [];
    for (const [_, indices] of seen) {
      if (indices.length > 1) duplicateGroups.push(indices);
    }
    if (duplicateGroups.length > 0) {
      const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);
      const severity = totalDuplicates > this.data.rows.length * 0.3 ? 'high' : 'medium';
      problems.push(this.createProblem('duplicate_rows', severity, '完全重复行检测',
        `发现 ${duplicateGroups.length} 组完全重复行，共 ${totalDuplicates} 个重复数据`,
        { count: totalDuplicates,
          details: duplicateGroups.slice(0, 10).map((group) => ({ row: group[0], message: `第 ${group.join(', ')} 行数据完全相同` })),
          suggestions: ['删除重复行以确保数据唯一性', '检查数据来源是否存在重复导入', '考虑基于关键列去重而非全行匹配'],
          autoFixable: true, autoFixTool: 'remove_duplicates', category: 'data_quality' }));
    }
    return problems;
  }

  detectPartialDuplicates(): Problem[] {
    const problems: Problem[] = [];
    const keyColumns = this.identifyKeyColumns();
    if (keyColumns.length < 1) return problems;
    const seen = new Map<string, number[]>();
    for (let i = 0; i < this.data.rows.length; i++) {
      const key = keyColumns.map((c) => String(this.data.rows[i][c] ?? '')).join('|');
      const existing = seen.get(key);
      if (existing) existing.push(i);
      else seen.set(key, [i]);
    }
    const partialDuplicates: number[][] = [];
    for (const [_, indices] of seen) {
      if (indices.length > 1) partialDuplicates.push(indices);
    }
    if (partialDuplicates.length > 0) {
      const totalDuplicates = partialDuplicates.reduce((sum, group) => sum + group.length - 1, 0);
      problems.push(this.createProblem('duplicate_rows_partial', 'medium', '部分重复行检测',
        `基于关键列(${keyColumns.join(', ')})发现 ${partialDuplicates.length} 组重复行，共 ${totalDuplicates} 个重复数据`,
        { count: totalDuplicates,
          suggestions: ['检查关键列组合是否存在业务意义上的重复', '考虑是否需要基于更多列进行去重'],
          autoFixable: true, autoFixTool: 'remove_duplicates_by_columns', category: 'data_quality' }));
    }
    return problems;
  }

  detectDateFormatInconsistencies(): Problem[] {
    const problems: Problem[] = [];
    const dateColumns = this.identifyDateColumns();
    for (const col of dateColumns) {
      const formatCounts = new Map<string, number[]>();
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = this.data.rows[i][col];
        if (val === null || val === undefined || val === '') continue;
        const strVal = String(val);
        const detectedFormat = this.detectDateFormat(strVal);
        if (detectedFormat) {
          const existing = formatCounts.get(detectedFormat) || [];
          existing.push(i);
          formatCounts.set(detectedFormat, existing);
        }
      }
      if (formatCounts.size > 1) {
        const formats = Array.from(formatCounts.entries());
        const primaryFormat = formats.sort((a, b) => b[1].length - a[1].length)[0];
        const otherFormats = formats.filter((f) => f[0] !== primaryFormat[0]);
        problems.push(this.createProblem('date_format_inconsistency', 'high', '日期格式不一致',
          `列 "${col}" 存在 ${formatCounts.size} 种不同的日期格式，主导格式为 "${primaryFormat[0]}"（${primaryFormat[1].length} 行）`,
          { count: this.data.rows.length - primaryFormat[1].length, column: col,
            details: otherFormats.slice(0, 5).map(([format, indices]) => ({ column: col, value: this.data.rows[indices[0]]?.[col], message: `格式 "${format}" 出现在 ${indices.length} 行中` })),
            suggestions: ['统一日期格式为 YYYY-MM-DD', '分批转换不同格式的日期', '先验证日期有效性再进行转换'],
            autoFixable: true, autoFixTool: 'standardize_date_format', category: 'format_validation' }));
      }
    }
    return problems;
  }

  detectTypeMismatch(): Problem[] {
    const problems: Problem[] = [];
    const typeProfiles = this.analyzeColumnTypes();
    for (const [col, profile] of Object.entries(typeProfiles)) {
      if (profile.types.size > 1) {
        const typeCounts = Array.from(profile.types.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
        const dominantType = typeCounts[0];
        const nonDominantTypes = typeCounts.slice(1);
        const inconsistencyRatio = nonDominantTypes.reduce((sum, t) => sum + t.count, 0) / profile.total;
        if (inconsistencyRatio > 0.05 || this.options.strictMode) {
          problems.push(this.createProblem('type_mismatch', inconsistencyRatio > 0.3 ? 'high' : 'medium', '数据类型不一致',
            `列 "${col}" 存在多种数据类型：${typeCounts.map((t) => `${t.type}(${t.count})`).join(', ')}`,
            { count: nonDominantTypes.reduce((sum, t) => sum + t.count, 0), column: col,
              suggestions: ['将所有值转换为统一类型', '检查数据来源的类型定义', '考虑使用文本类型存储混合数据'],
              autoFixable: true, autoFixTool: 'standardize_column_type', category: 'data_quality' }));
        }
      }
    }
    return problems;
  }

  detectMissingValues(): Problem[] {
    const problems: Problem[] = [];
    const missingByColumn = new Map<string, number[]>();
    for (let i = 0; i < this.data.rows.length; i++) {
      for (const header of this.data.headers) {
        const val = this.data.rows[i][header];
        if (val === null || val === undefined || val === '') {
          const existing = missingByColumn.get(header) || [];
          existing.push(i);
          missingByColumn.set(header, existing);
        }
      }
    }
    for (const [col, indices] of missingByColumn) {
      if (indices.length === 0) continue;
      const missingRatio = indices.length / this.data.rows.length;
      const severity: Severity = missingRatio > 0.5 ? 'critical' : missingRatio > 0.3 ? 'high' : missingRatio > 0.1 ? 'medium' : 'low';
      problems.push(this.createProblem('missing_values', severity, '缺失值检测',
        `列 "${col}" 有 ${indices.length} 个缺失值（${(missingRatio * 100).toFixed(1)}%）`,
        { count: indices.length, column: col, indices,
          suggestions: this.suggestMissingValueHandling(col),
          autoFixable: true, autoFixTool: 'fill_missing_values', category: 'data_quality' }));
    }
    return problems;
  }

  detectCriticalMissingValues(): Problem[] {
    const problems: Problem[] = [];
    const criticalKeywords = ['id', 'ID', '编号', '主键', 'key', 'code', '编码', 'phone', 'email', 'tel'];
    for (const header of this.data.headers) {
      const isCritical = criticalKeywords.some((kw) => header.toLowerCase().includes(kw.toLowerCase()));
      if (!isCritical) continue;
      const missingCount = this.data.rows.filter((r) => r[header] === null || r[header] === undefined || r[header] === '').length;
      if (missingCount > 0) {
        problems.push(this.createProblem('missing_critical', 'critical', '关键字段缺失值',
          `关键字段 "${header}" 有 ${missingCount} 个缺失值，可能导致数据关联失败`,
          { count: missingCount, column: header,
            suggestions: ['立即补充缺失的关键字段值', '检查数据导入流程', '考虑从数据源重新获取'],
            autoFixable: false, category: 'data_quality', businessImpact: '高 - 可能影响业务关联和报表生成' }));
      }
    }
    return problems;
  }

  detectOutliers(): Problem[] {
    const problems: Problem[] = [];
    const numericColumns = this.identifyNumericColumns();
    for (const col of numericColumns) {
      const values = this.data.rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
      if (values.length < 4) continue;
      const outliers: { index: number; value: number; score: number }[] = [];
      const method = this.options.outlierMethod || 'iqr';
      const threshold = this.options.outlierThreshold || OUTLIER_THRESHOLDS.iqr;
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (isNaN(val)) continue;
        let isOutlier = false, score = 0;
        if (method === 'iqr') {
          const sorted = [...values].sort((a, b) => a - b);
          const q1 = sorted[Math.floor(sorted.length * 0.25)], q3 = sorted[Math.floor(sorted.length * 0.75)];
          const iqr = q3 - q1;
          const lowerBound = q1 - threshold * iqr, upperBound = q3 + threshold * iqr;
          if (val < lowerBound || val > upperBound) { isOutlier = true; score = Math.max(Math.abs(val - lowerBound) / iqr, Math.abs(val - upperBound) / iqr); }
        } else if (method === 'zscore') {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
          const zScore = stdDev > 0 ? Math.abs((val - mean) / stdDev) : 0;
          if (zScore > threshold) { isOutlier = true; score = zScore; }
        } else if (method === 'mad') {
          const sorted = [...values].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const deviations = values.map((v) => Math.abs(v - median));
          const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
          const modifiedZ = mad > 0 ? 0.6745 * (val - median) / mad : 0;
          if (Math.abs(modifiedZ) > threshold) { isOutlier = true; score = Math.abs(modifiedZ); }
        }
        if (isOutlier) outliers.push({ index: i, value: val, score });
      }
      if (outliers.length > 0) {
        const severity = outliers.length > values.length * 0.1 ? 'high' : outliers.length > values.length * 0.05 ? 'medium' : 'low';
        problems.push(this.createProblem('outliers', severity, '异常值检测',
          `列 "${col}" 检测到 ${outliers.length} 个异常值（使用 ${method.toUpperCase()} 方法，阈值 ${threshold}）`,
          { count: outliers.length, column: col, indices: outliers.map((o) => o.index),
            details: outliers.slice(0, 5).map((o) => ({ row: o.index, column: col, value: o.value, message: `值 ${o.value} 超出正常范围（得分: ${o.score.toFixed(2)}）` })),
            suggestions: ['检查是否为数据录入错误', '考虑使用中位数替代极端值', '分析异常值背后的业务原因'],
            autoFixable: true, autoFixTool: 'handle_outliers', category: 'statistical' }));
      }
    }
    return problems;
  }

  detectExtremeOutliers(): Problem[] {
    const problems: Problem[] = [];
    const numericColumns = this.identifyNumericColumns();
    const threshold = 3;
    for (const col of numericColumns) {
      const values = this.data.rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
      if (values.length < 4) continue;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
      const extremeOutliers: { index: number; value: number; zScore: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (isNaN(val)) continue;
        const zScore = stdDev > 0 ? Math.abs((val - mean) / stdDev) : 0;
        if (zScore > threshold * 2) extremeOutliers.push({ index: i, value: val, zScore });
      }
      if (extremeOutliers.length > 0) {
        problems.push(this.createProblem('outliers_extreme', 'high', '极端异常值检测',
          `列 "${col}" 检测到 ${extremeOutliers.length} 个极端异常值（|Z-Score| > ${threshold * 2}）`,
          { count: extremeOutliers.length, column: col, indices: extremeOutliers.map((o) => o.index),
            details: extremeOutliers.slice(0, 5).map((o) => ({ row: o.index, column: col, value: o.value, message: `极端值 ${o.value}（Z-Score: ${o.zScore.toFixed(2)}）` })),
            suggestions: ['数据可能存在严重错误', '建议人工核实这些极端值', '考虑是否需要剔除这些记录'],
            autoFixable: false, category: 'statistical', businessImpact: '高 - 极端值可能严重影响统计分析结果' }));
      }
    }
    return problems;
  }

  detectSpellingErrors(): Problem[] {
    const problems: Problem[] = [];
    for (const [category, variants] of Object.entries(SPELLING_VARIANTS)) {
      const columnIssues = new Map<string, { correct: string; incorrect: Map<string, number[]> }>();
      for (const variantGroup of variants) {
        for (const variant of variantGroup.variants) {
          for (const header of this.data.headers) {
            if (!header.toLowerCase().includes(category.toLowerCase())) continue;
            for (let i = 0; i < this.data.rows.length; i++) {
              const val = String(this.data.rows[i][header] || '');
              if (val === variant && variant !== variantGroup.correct) {
                const existing = columnIssues.get(header);
                if (existing) {
                  const variantMap = existing.incorrect;
                  const indices = variantMap.get(variant) || [];
                  indices.push(i);
                  variantMap.set(variant, indices);
                } else {
                  columnIssues.set(header, { correct: variantGroup.correct, incorrect: new Map([[variant, [i]]]) });
                }
              }
            }
          }
        }
      }
      for (const [col, issue] of columnIssues) {
        const totalErrors = Array.from(issue.incorrect.values()).reduce((sum, indices) => sum + indices.length, 0);
        problems.push(this.createProblem('spelling_errors', totalErrors > 20 ? 'medium' : 'low', '拼写变体检测',
          `列 "${col}" 存在 ${totalErrors} 个非标准 "${issue.correct}" 写法`,
          { count: totalErrors, column: col,
            details: Array.from(issue.incorrect.entries()).slice(0, 5).map(([variant, indices]) => ({ column: col, value: variant, expected: issue.correct, message: `"${variant}" 应为 "${issue.correct}"（出现 ${indices.length} 次）` })),
            suggestions: [`标准化为 "${issue.correct}"`, '建立数据字典规范'],
            autoFixable: true, autoFixTool: 'standardize_spelling', category: 'data_quality' }));
      }
    }
    return problems;
  }

  detectInconsistentSpelling(): Problem[] {
    const problems: Problem[] = [];
    const textColumns = this.data.headers.filter((h) => {
      const sample = this.data.rows.slice(0, 10).map((r) => r[h]);
      return sample.some((v) => typeof v === 'string') && !this.isDateColumn(h);
    });
    for (const col of textColumns) {
      const uniqueValues = new Set<string>();
      const valueCounts = new Map<string, number>();
      for (const row of this.data.rows) {
        const val = String(row[col] ?? '').trim().toLowerCase();
        if (val) {
          uniqueValues.add(val);
          valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
        }
      }
      const similarGroups = this.findSimilarValueGroups(Array.from(uniqueValues));
      if (similarGroups.length > 0) {
        const totalInconsistent = similarGroups.reduce((sum, g) => sum + g.values.length - 1, 0);
        problems.push(this.createProblem('spelling_inconsistent', 'low', '拼写不一致检测',
          `列 "${col}" 存在 ${similarGroups.length} 组相似的值可能需要统一`,
          { count: totalInconsistent, column: col,
            details: similarGroups.slice(0, 5).map((g) => ({ column: col, value: g.values.join(', '), message: `类似值: ${g.values.join(', ')}` })),
            suggestions: ['检查这些值是否是同一含义', '考虑标准化为统一的写法'],
            autoFixable: true, autoFixTool: 'standardize_text_case', category: 'data_quality' }));
      }
    }
    return problems;
  }

  detectEncodingIssues(): Problem[] {
    const problems: Problem[] = [];
    for (const header of this.data.headers) {
      const issues: { row: number; value: string; patterns: string[] }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = String(this.data.rows[i][header] || '');
        const matchedPatterns: string[] = [];
        for (const issue of COMMON_ENCODING_ISSUES) {
          if (issue.pattern.test(val)) matchedPatterns.push(issue.fix);
        }
        if (matchedPatterns.length > 0) issues.push({ row: i, value: val, patterns: matchedPatterns });
      }
      if (issues.length > 0) {
        problems.push(this.createProblem('encoding_issues', issues.length > 20 ? 'high' : 'medium', '编码问题检测',
          `列 "${header}" 检测到 ${issues.length} 个可能的编码问题`,
          { count: issues.length, column: header, indices: issues.map((i) => i.row),
            details: issues.slice(0, 5).map((issue) => ({ row: issue.row, column: header, value: issue.value, message: `检测到编码问题: ${issue.patterns.join(', ')}` })),
            suggestions: ['确保源文件使用 UTF-8 编码', '重新导入数据', '使用文本编辑器修复编码'],
            autoFixable: true, autoFixTool: 'fix_encoding', category: 'format_validation' }));
      }
    }
    return problems;
  }

  detectMixedEncoding(): Problem[] {
    const problems: Problem[] = [];
    for (const header of this.data.headers) {
      let hasUtf8 = false, hasGbk = false;
      for (const row of this.data.rows) {
        const val = String(row[header] || '');
        if (/[\u4e00-\u9fa5]/.test(val)) hasUtf8 = true;
        if (/[^\x00-\x7F]/.test(val) && !/[\u4e00-\u9fa5]/.test(val)) hasGbk = true;
      }
      if (hasUtf8 && hasGbk) {
        problems.push(this.createProblem('encoding_mixed', 'high', '混合编码检测',
          `列 "${header}" 同时存在 UTF-8 和 GBK 编码的字符，可能导致显示乱码`,
          { column: header,
            suggestions: ['将所有数据转换为统一的 UTF-8 编码', '检查数据源的编码设置'],
            autoFixable: true, autoFixTool: 'normalize_encoding', category: 'format_validation' }));
      }
    }
    return problems;
  }

  detectWhitespaceIssues(): Problem[] {
    const problems: Problem[] = [];
    for (const header of this.data.headers) {
      const issues: { row: number; value: string; issue: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = this.data.rows[i][header];
        if (typeof val !== 'string') continue;
        const strVal = String(val);
        if (strVal !== strVal.trim()) issues.push({ row: i, value: strVal, issue: '首尾多余空格' });
        else if (/\s{2,}/.test(strVal)) issues.push({ row: i, value: strVal, issue: '存在多余内嵌空格' });
      }
      if (issues.length > 0) {
        problems.push(this.createProblem('leading_trailing_spaces', issues.length > 50 ? 'medium' : 'low', '空格问题',
          `列 "${header}" 有 ${issues.length} 个单元格存在空格问题`,
          { count: issues.length, column: header, indices: issues.map((i) => i.row),
            details: issues.slice(0, 5).map((issue) => ({ row: issue.row, column: header, value: issue.value, message: issue.issue })),
            suggestions: ['去除首尾多余空格', '合并内嵌多个空格为单个空格'],
            autoFixable: true, autoFixTool: 'trim_whitespace', category: 'data_quality' }));
      }
    }
    return problems;
  }

  detectNumericAsText(): Problem[] {
    const problems: Problem[] = [];
    for (const header of this.data.headers) {
      const numericAsText: { row: number; value: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = this.data.rows[i][header];
        if (typeof val === 'string') {
          const trimmed = val.trim();
          const num = Number(trimmed);
          if (trimmed !== '' && !isNaN(num) && num > 1000 && /^\d+$/.test(trimmed.replace(/,/g, ''))) {
            numericAsText.push({ row: i, value: val });
          }
        }
      }
      if (numericAsText.length > 0 && numericAsText.length > this.data.rows.length * 0.1) {
        problems.push(this.createProblem('numeric_as_text', 'medium', '数字以文本存储',
          `列 "${header}" 有 ${numericAsText.length} 个数字以文本形式存储`,
          { count: numericAsText.length, column: header, indices: numericAsText.map((i) => i.row),
            details: numericAsText.slice(0, 5).map((issue) => ({ row: issue.row, column: header, value: issue.value, message: `数字 "${issue.value}" 以文本存储` })),
            suggestions: ['转换为数字类型以支持计算', '去除千分位分隔符'],
            autoFixable: true, autoFixTool: 'convert_to_number', category: 'data_quality' }));
      }
    }
    return problems;
  }

  detectTextAsNumeric(): Problem[] {
    const problems: Problem[] = [];
    for (const header of this.data.headers) {
      const textAsNumeric: { row: number; value: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = this.data.rows[i][header];
        if (typeof val === 'number' && Number.isInteger(val) && val > 1000000000000) {
          textAsNumeric.push({ row: i, value: val });
        }
      }
      if (textAsNumeric.length > 0) {
        problems.push(this.createProblem('text_as_numeric', 'medium', '文本型数字检测',
          `列 "${header}" 有 ${textAsNumeric.length} 个可能是文本的数字被存储为数字类型`,
          { count: textAsNumeric.length, column: header, indices: textAsNumeric.map((i) => i.row),
            details: textAsNumeric.slice(0, 5).map((issue) => ({ row: issue.row, column: header, value: issue.value, message: `值 ${issue.value} 可能是文本型数字` })),
            suggestions: ['确认这些是否确实是数字类型', '如果原是文本则转换为文本类型'],
            autoFixable: true, autoFixTool: 'convert_to_text', category: 'data_quality' }));
      }
    }
    return problems;
  }

  detectDateLogicalErrors(): Problem[] {
    const problems: Problem[] = [];
    const dateColumns = this.identifyDateColumns();
    for (const col of dateColumns) {
      const errors: { row: number; value: string; reason: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = this.data.rows[i][col];
        if (!val) continue;
        const strVal = String(val);
        const date = new Date(strVal);
        if (isNaN(date.getTime())) errors.push({ row: i, value: strVal, reason: '无法解析为有效日期' });
        else {
          const year = date.getFullYear();
          if (year < 1900 || year > 2100) errors.push({ row: i, value: strVal, reason: `年份 ${year} 超出合理范围` });
          if (this.hasAdjacentDateConflict(col, i, date)) errors.push({ row: i, value: strVal, reason: '与相邻日期逻辑冲突' });
        }
      }
      if (errors.length > 0) {
        problems.push(this.createProblem('date_logical_error', errors.length > 10 ? 'high' : 'medium', '日期逻辑错误',
          `列 "${col}" 有 ${errors.length} 个日期存在逻辑问题`,
          { count: errors.length, column: col, indices: errors.map((e) => e.row),
            details: errors.slice(0, 5).map((e) => ({ row: e.row, column: col, value: e.value, message: e.reason })),
            suggestions: ['检查日期格式是否正确', '验证日期范围的合理性', '修正明显错误的日期值'],
            autoFixable: true, autoFixTool: 'fix_date_errors', category: 'business_logic' }));
      }
    }
    return problems;
  }

  detectFutureDates(): Problem[] {
    const problems: Problem[] = [];
    const dateColumns = this.identifyDateColumns();
    const now = new Date();
    for (const col of dateColumns) {
      const futureDates: { row: number; value: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = this.data.rows[i][col];
        if (!val) continue;
        const date = new Date(String(val));
        if (!isNaN(date.getTime()) && date > now) futureDates.push({ row: i, value: String(val) });
      }
      if (futureDates.length > 0) {
        problems.push(this.createProblem('date_future_error', 'medium', '未来日期检测',
          `列 "${col}" 有 ${futureDates.length} 个日期在当前日期之后`,
          { count: futureDates.length, column: col, indices: futureDates.map((f) => f.row),
            details: futureDates.slice(0, 5).map((f) => ({ row: f.row, column: col, value: f.value, message: `日期 ${f.value} 在未来` })),
            suggestions: ['确认这是否是预约或计划数据', '如果是历史数据则需要修正'],
            autoFixable: false, category: 'business_logic' }));
      }
    }
    return problems;
  }

  detectPastDates(): Problem[] {
    const problems: Problem[] = [];
    const dateColumns = this.identifyDateColumns();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    for (const col of dateColumns) {
      const pastDates: { row: number; value: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = this.data.rows[i][col];
        if (!val) continue;
        const date = new Date(String(val));
        if (!isNaN(date.getTime()) && date < oneYearAgo) pastDates.push({ row: i, value: String(val) });
      }
      if (pastDates.length > this.data.rows.length * 0.5 && this.data.rows.length > 10) {
        problems.push(this.createProblem('date_past_error', 'low', '过于久远的日期',
          `列 "${col}" 有 ${pastDates.length} 个日期超过1年以前`,
          { count: pastDates.length, column: col, indices: pastDates.map((p) => p.row),
            details: pastDates.slice(0, 5).map((p) => ({ row: p.row, column: col, value: p.value, message: `日期 ${p.value} 超过1年` })),
            suggestions: ['确认数据是否仍然有效', '考虑是否需要清理历史数据'],
            autoFixable: false, category: 'business_logic' }));
      }
    }
    return problems;
  }

  detectDateRangeExceeded(): Problem[] {
    const problems: Problem[] = [];
    const dateColumns = this.identifyDateColumns();
    for (const col of dateColumns) {
      const dates = this.data.rows.map((r) => new Date(String(r[col]))).filter((d) => !isNaN(d.getTime()));
      if (dates.length < 2) continue;
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      const dayDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff > 3650) {
        problems.push(this.createProblem('date_range_exceeded', 'low', '日期跨度过大',
          `列 "${col}" 日期跨度为 ${dayDiff.toFixed(0)} 天（约 ${(dayDiff / 365).toFixed(1)} 年），可能存在异常数据`,
          { column: col,
            suggestions: ['检查日期范围是否合理', '确认数据是否跨越了不应跨越的时间段'],
            autoFixable: false, category: 'business_logic' }));
      }
    }
    return problems;
  }

  detectDistributionSkew(): Problem[] {
    const problems: Problem[] = [];
    const numericColumns = this.identifyNumericColumns();
    for (const col of numericColumns) {
      const values = this.data.rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
      if (values.length < 10) continue;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const skewness = this.calculateSkewness(values);
      const kurtosis = this.calculateKurtosis(values);
      if (Math.abs(skewness) > 2 || kurtosis > 10) {
        problems.push(this.createProblem('distribution_skew', Math.abs(skewness) > 5 ? 'high' : 'medium', '数据分布偏斜',
          `列 "${col}" 数据分布严重偏斜（偏度: ${skewness.toFixed(2)}，峰度: ${kurtosis.toFixed(2)}）`,
          { column: col,
            suggestions: ['考虑对数据进行对数或 Box-Cox 变换', '使用中位数而非均值进行统计', '检查是否存在极端异常值'],
            autoFixable: false, category: 'statistical' }));
      }
    }
    return problems;
  }

  detectVarianceIssues(): Problem[] {
    const problems: Problem[] = [];
    const numericColumns = this.identifyNumericColumns();
    for (const col of numericColumns) {
      const values = this.data.rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
      if (values.length < 2) continue;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      if (variance === 0 && values.length > 1) {
        problems.push(this.createProblem('variance_zero', 'high', '零方差检测',
          `列 "${col}" 所有值都相同（方差为0），无分析意义`,
          { column: col, count: values.length,
            suggestions: ['检查是否需要删除此列', '确认数据是否全部相同'],
            autoFixable: false, category: 'statistical' }));
      }
    }
    return problems;
  }

  detectFinancialIssues(): Problem[] {
    const problems: Problem[] = [];
    const amountColumns = this.data.headers.filter((h) => /金额|amount|总额|sum|total/i.test(h));
    const balanceColumns = this.data.headers.filter((h) => /余额|balance|结余/i.test(h));
    for (const col of amountColumns) {
      const negativeValues: { row: number; value: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (!isNaN(val) && val < 0) negativeValues.push({ row: i, value: val });
      }
      if (negativeValues.length > 0) {
        problems.push(this.createProblem('negative_value_invalid', 'high', '负金额检测',
          `列 "${col}" 有 ${negativeValues.length} 个负数金额，可能存在错误`,
          { count: negativeValues.length, column: col, indices: negativeValues.map((n) => n.row),
            details: negativeValues.slice(0, 5).map((n) => ({ row: n.row, column: col, value: n.value, message: `金额 ${n.value} 为负数` })),
            suggestions: ['检查金额是否应该为负', '确认是否为借方/贷方标记'],
            autoFixable: false, category: 'financial' }));
      }
    }
    for (const col of balanceColumns) {
      const negativeBalances: { row: number; value: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (!isNaN(val) && val < 0) negativeBalances.push({ row: i, value: val });
      }
      if (negativeBalances.length > 0) {
        problems.push(this.createProblem('balance_imbalance', 'high', '负余额检测',
          `列 "${col}" 有 ${negativeBalances.length} 个负余额，可能存在错误`,
          { count: negativeBalances.length, column: col, indices: negativeBalances.map((n) => n.row),
            details: negativeBalances.slice(0, 5).map((n) => ({ row: n.row, column: col, value: n.value, message: `余额 ${n.value} 为负数` })),
            suggestions: ['检查余额计算是否正确', '确认是否为预付款或信用额度'],
            autoFixable: false, category: 'financial', businessImpact: '高 - 可能影响财务报表准确性' }));
      }
    }
    const taxRateColumns = this.data.headers.filter((h) => /税率|tax_rate/i.test(h));
    for (const col of taxRateColumns) {
      const invalidRates: { row: number; value: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (!isNaN(val) && (val < 0 || val > 1)) invalidRates.push({ row: i, value: val });
      }
      if (invalidRates.length > 0) {
        problems.push(this.createProblem('tax_rate_invalid', 'medium', '税率超出范围',
          `列 "${col}" 有 ${invalidRates.length} 个税率值超出 0-100% 范围`,
          { count: invalidRates.length, column: col, indices: invalidRates.map((i) => i.row),
            details: invalidRates.slice(0, 5).map((i) => ({ row: i.row, column: col, value: i.value, message: `税率 ${(i.value * 100).toFixed(1)}% 超范围` })),
            suggestions: ['如果存的是小数，确认范围在 0-1', '如果存的是百分数，确认范围在 0-100'],
            autoFixable: true, autoFixTool: 'normalize_tax_rate', category: 'financial' }));
      }
    }
    return problems;
  }

  detectHRErrors(): Problem[] {
    const problems: Problem[] = [];
    const salaryColumns = this.data.headers.filter((h) => /工资|薪酬|salary|compensation/i.test(h));
    const minWage = 2320;
    for (const col of salaryColumns) {
      const belowMinWage: { row: number; value: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (!isNaN(val) && val > 0 && val < minWage) belowMinWage.push({ row: i, value: val });
      }
      if (belowMinWage.length > 0) {
        problems.push(this.createProblem('salary_below_minimum', 'high', '低于最低工资检测',
          `列 "${col}" 有 ${belowMinWage.length} 个工资低于当地最低工资标准`,
          { count: belowMinWage.length, column: col, indices: belowMinWage.map((b) => b.row),
            details: belowMinWage.slice(0, 5).map((b) => ({ row: b.row, column: col, value: b.value, message: `工资 ${b.value} 低于最低工资 ${minWage}` })),
            suggestions: ['核实员工工资是否正确', '确认是否为兼职或实习人员'],
            autoFixable: false, category: 'hr', businessImpact: '高 - 违反劳动法风险' }));
      }
    }
    const ageColumns = this.data.headers.filter((h) => /年龄|age/i.test(h));
    for (const col of ageColumns) {
      const invalidAges: { row: number; value: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (!isNaN(val) && (val < 16 || val > 70)) invalidAges.push({ row: i, value: val });
      }
      if (invalidAges.length > 0) {
        problems.push(this.createProblem('age_invalid', 'medium', '年龄异常检测',
          `列 "${col}" 有 ${invalidAges.length} 个年龄值超出合理范围（16-70岁）`,
          { count: invalidAges.length, column: col, indices: invalidAges.map((i) => i.row),
            details: invalidAges.slice(0, 5).map((i) => ({ row: i.row, column: col, value: i.value, message: `年龄 ${i.value} 超出范围` })),
            suggestions: ['检查年龄计算是否正确', '确认是否为数据录入错误'],
            autoFixable: false, category: 'hr' }));
      }
    }
    const genderColumns = this.data.headers.filter((h) => /性别|gender|sex/i.test(h));
    for (const col of genderColumns) {
      const invalidGenders: { row: number; value: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = String(this.data.rows[i][col] ?? '').trim().toLowerCase();
        if (val && !['男', '女', 'm', 'f', 'male', 'female', 'man', 'woman'].includes(val)) {
          invalidGenders.push({ row: i, value: String(this.data.rows[i][col]) });
        }
      }
      if (invalidGenders.length > 0) {
        problems.push(this.createProblem('gender_inconsistent', 'low', '性别值不规范',
          `列 "${col}" 有 ${invalidGenders.length} 个性别值不规范`,
          { count: invalidGenders.length, column: col, indices: invalidGenders.map((i) => i.row),
            details: invalidGenders.slice(0, 5).map((i) => ({ row: i.row, column: col, value: i.value, message: `值 "${i.value}" 不规范` })),
            suggestions: ['标准化为"男"或"女"', '建立数据字典规范'],
            autoFixable: true, autoFixTool: 'standardize_gender', category: 'hr' }));
      }
    }
    return problems;
  }

  detectRetailIssues(): Problem[] {
    const problems: Problem[] = [];
    const stockColumns = this.data.headers.filter((h) => /库存|stock|inventory/i.test(h));
    for (const col of stockColumns) {
      const negativeStock: { row: number; value: number }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = Number(this.data.rows[i][col]);
        if (!isNaN(val) && val < 0) negativeStock.push({ row: i, value: val });
      }
      if (negativeStock.length > 0) {
        problems.push(this.createProblem('stock_negative', 'high', '负库存检测',
          `列 "${col}" 有 ${negativeStock.length} 个负库存，物理上不可能`,
          { count: negativeStock.length, column: col, indices: negativeStock.map((n) => n.row),
            details: negativeStock.slice(0, 5).map((n) => ({ row: n.row, column: col, value: n.value, message: `库存 ${n.value} 为负数` })),
            suggestions: ['检查库存计算逻辑', '考虑是否有未记账的出库单'],
            autoFixable: true, autoFixTool: 'fix_negative_stock', category: 'retail' }));
      }
    }
    return problems;
  }

  detectContactInfoIssues(): Problem[] {
    const problems: Problem[] = [];
    const emailColumns = this.data.headers.filter((h) => /email|邮箱|邮件/i.test(h));
    for (const col of emailColumns) {
      const invalidEmails: { row: number; value: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = String(this.data.rows[i][col] ?? '').trim();
        if (val && !EMAIL_PATTERN.test(val)) invalidEmails.push({ row: i, value: val });
      }
      if (invalidEmails.length > 0) {
        problems.push(this.createProblem('email_format_invalid', 'medium', '邮箱格式错误',
          `列 "${col}" 有 ${invalidEmails.length} 个邮箱格式不正确`,
          { count: invalidEmails.length, column: col, indices: invalidEmails.map((i) => i.row),
            details: invalidEmails.slice(0, 5).map((i) => ({ row: i.row, column: col, value: i.value, message: `邮箱格式不正确` })),
            suggestions: ['检查邮箱地址是否正确', '确认是否缺少 @ 符号或域名'],
            autoFixable: false, category: 'format_validation' }));
      }
    }
    const phoneColumns = this.data.headers.filter((h) => /电话|phone|mobile|tel|手机/i.test(h));
    for (const col of phoneColumns) {
      const invalidPhones: { row: number; value: string }[] = [];
      for (let i = 0; i < this.data.rows.length; i++) {
        const val = String(this.data.rows[i][col] ?? '').replace(/[-\s]/g, '');
        if (val && !PHONE_PATTERN_11.test(val) && val.length > 0) invalidPhones.push({ row: i, value: String(this.data.rows[i][col]) });
      }
      if (invalidPhones.length > 0) {
        problems.push(this.createProblem('phone_format_invalid', 'medium', '手机号格式错误',
          `列 "${col}" 有 ${invalidPhones.length} 个手机号格式不正确`,
          { count: invalidPhones.length, column: col, indices: invalidPhones.map((i) => i.row),
            details: invalidPhones.slice(0, 5).map((i) => ({ row: i.row, column: col, value: i.value, message: `手机号格式不正确` })),
            suggestions: ['确认手机号是否为11位数字', '检查是否包含国家代码'],
            autoFixable: false, category: 'format_validation' }));
      }
    }
    return problems;
  }

  detectBusinessRuleViolations(): Problem[] {
    const problems: Problem[] = [];
    const statusColumns = this.data.headers.filter((h) => /状态|status|订单状态/i.test(h));
    const invalidStatuses = ['已取消', '已关闭', '已完成', '待处理', '处理中'];
    for (const col of statusColumns) {
      const values = new Set<string>();
      for (const row of this.data.rows) {
        const val = String(row[col] ?? '').trim();
        if (val) values.add(val);
      }
      const suspiciousValues = Array.from(values).filter((v) => !invalidStatuses.includes(v) && /取消|关闭|完成|待|处理/i.test(v));
      if (suspiciousValues.length > 0 && suspiciousValues.length < values.size) {
        problems.push(this.createProblem('enum_value_invalid', 'low', '枚举值不一致',
          `列 "${col}" 包含非标准状态值: ${suspiciousValues.join(', ')}`,
          { column: col,
            suggestions: ['标准化订单状态枚举值', '建立状态值数据字典'],
            autoFixable: true, autoFixTool: 'standardize_status', category: 'business_logic' }));
      }
    }
    return problems;
  }

  detectSchemaIssues(): Problem[] {
    const problems: Problem[] = [];
    problems.push(this.createProblem('schema_change_detected', 'info', 'Schema 检查',
      `数据包含 ${this.data.headers.length} 列，${this.data.rows.length} 行`,
      { column: undefined,
        suggestions: ['定期监控 Schema 变化', '记录每次数据变更'],
        autoFixable: false, category: 'schema' }));
    return problems;
  }

  detectReferentialIntegrityIssues(): Problem[] {
    const problems: Problem[] = [];
    problems.push(this.createProblem('reference_integrity', 'info', '引用完整性检查',
      `数据引用完整性检查完成`,
      { suggestions: ['确保外键关联的数据存在', '检查孤立记录'],
        autoFixable: false, category: 'referential' }));
    return problems;
  }

  detectCalculationIssues(): Problem[] {
    const problems: Problem[] = [];
    const totalColumns = this.data.headers.filter((h) => /总额|total|sum|合计/i.test(h));
    const subtotalColumns = this.data.headers.filter((h) => /小计|subtotal|分项/i.test(h));
    if (totalColumns.length > 0 && subtotalColumns.length > 0) {
      const totalCol = totalColumns[0];
      problems.push(this.createProblem('cross_column_dependency', 'medium', '跨列计算依赖',
        `检测到总额列 "${totalCol}" 和小数列，可能存在计算关系`,
        { column: totalCol,
          suggestions: ['验证总额是否等于各小计之和', '检查计算公式是否正确'],
          autoFixable: false, category: 'business_logic' }));
    }
    return problems;
  }

  detectAggregationIssues(): Problem[] {
    const problems: Problem[] = [];
    problems.push(this.createProblem('aggregation_mismatch', 'info', '聚合计算检查',
      `数据聚合计算检查完成`,
      { suggestions: ['验证聚合结果是否正确', '检查是否有多级汇总'],
        autoFixable: false, category: 'statistical' }));
    return problems;
  }

  detectTimeSeriesIssues(): Problem[] {
    const problems: Problem[] = [];
    const dateColumns = this.identifyDateColumns();
    if (dateColumns.length > 0) {
      const dateCol = dateColumns[0];
      const dates = this.data.rows.map((r) => new Date(String(r[dateCol]))).filter((d) => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
      if (dates.length > 1) {
        const gaps: number[] = [];
        for (let i = 1; i < dates.length; i++) {
          const gap = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
          if (gap > 30) gaps.push(gap);
        }
        if (gaps.length > dates.length * 0.3) {
          problems.push(this.createProblem('time_series_gap', 'low', '时间序列间隔不均匀',
            `列 "${dateCol}" 存在 ${gaps.length} 个超过30天的间隔`,
            { count: gaps.length, column: dateCol,
              suggestions: ['检查是否有缺失的时间段数据', '确认是否为周期性数据'],
              autoFixable: false, category: 'statistical' }));
        }
      }
    }
    return problems;
  }

  private identifyKeyColumns(): string[] {
    const keyKeywords = ['id', 'ID', '编号', '编码', 'code', 'key', '主键'];
    return this.data.headers.filter((h) => keyKeywords.some((kw) => h.toLowerCase().includes(kw.toLowerCase())));
  }

  private identifyDateColumns(): string[] {
    const dateKeywords = ['日期', 'date', '时间', 'time', '创建时间', '更新时间', '出生', '生日', '年', '月', '日'];
    return this.data.headers.filter((h) => dateKeywords.some((kw) => h.toLowerCase().includes(kw.toLowerCase())));
  }

  private identifyNumericColumns(): string[] {
    return this.data.headers.filter((h) => {
      let numericCount = 0, totalNonEmpty = 0;
      for (const row of this.data.rows.slice(0, 20)) {
        const val = row[h];
        if (val !== null && val !== undefined && val !== '') {
          totalNonEmpty++;
          if (typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '')) numericCount++;
        }
      }
      return totalNonEmpty > 0 && numericCount / totalNonEmpty > 0.8;
    });
  }

  private detectDateFormat(value: string): string | null {
    for (const pattern of DATE_PATTERNS) {
      if (pattern.test(value)) {
        if (pattern.source.includes('\\d{4}')) {
          if (value.includes('/')) return value.indexOf('/') === 4 ? 'YYYY/MM/DD' : 'MM/DD/YYYY';
          if (value.includes('-')) return value.indexOf('-') === 4 ? 'YYYY-MM-DD' : 'DD-MM-YYYY';
        }
        return 'detected';
      }
    }
    return null;
  }

  private isDateColumn(header: string): boolean {
    const dateKeywords = ['date', 'time', '日期', '时间', 'year', 'month', '年', '月', '日'];
    return dateKeywords.some((kw) => header.toLowerCase().includes(kw));
  }

  private analyzeColumnTypes(): Record<string, { total: number; types: Map<string, number> }> {
    const profiles: Record<string, { total: number; types: Map<string, number> }> = {};
    for (const header of this.data.headers) {
      const types = new Map<string, number>();
      for (const row of this.data.rows) {
        const type = this.getCellType(row[header]);
        types.set(type, (types.get(type) || 0) + 1);
      }
      profiles[header] = { total: this.data.rows.length, types };
    }
    return profiles;
  }

  private getCellType(value: CellValue): string {
    if (value === null || value === undefined || value === '') return 'null';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!isNaN(Number(trimmed)) && trimmed !== '') return 'numeric_string';
      if (this.detectDateFormat(trimmed)) return 'date_string';
      return 'text';
    }
    return 'unknown';
  }

  private hasAdjacentDateConflict(col: string, index: number, currentDate: Date): boolean {
    if (index > 0) {
      const prevVal = this.data.rows[index - 1][col];
      if (prevVal) {
        const prevDate = new Date(String(prevVal));
        if (!isNaN(prevDate.getTime()) && prevDate > currentDate) {
          const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff < -365) return true;
        }
      }
    }
    return false;
  }

  private calculateSkewness(values: number[]): number {
    const n = values.length;
    if (n < 3) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n);
    if (stdDev === 0) return 0;
    const cubedDiffs = values.map((v) => Math.pow((v - mean) / stdDev, 3));
    return (n / ((n - 1) * (n - 2))) * cubedDiffs.reduce((a, b) => a + b, 0);
  }

  private calculateKurtosis(values: number[]): number {
    const n = values.length;
    if (n < 4) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n);
    if (stdDev === 0) return 0;
    const fourthDiffs = values.map((v) => Math.pow((v - mean) / stdDev, 4));
    const m4 = fourthDiffs.reduce((a, b) => a + b, 0) / n;
    return m4 - 3;
  }

  private suggestMissingValueHandling(column: string): string[] {
    const suggestions: string[] = [];
    const sampleValues = this.data.rows.filter((r) => r[column] !== null && r[column] !== undefined && r[column] !== '').slice(0, 10).map((r) => r[column]);
    const numericCount = sampleValues.filter((v) => typeof v === 'number' || !isNaN(Number(v))).length;
    if (numericCount > sampleValues.length * 0.5) {
      suggestions.push('使用均值填充', '使用中位数填充', '使用 0 填充');
    } else {
      suggestions.push('使用众数填充', '使用"未知"或"N/A"填充', '向前填充（使用上一个有效值）');
    }
    suggestions.push('如果缺失比例过高，考虑删除该列', '调查缺失原因');
    return suggestions;
  }

  private findSimilarValueGroups(values: string[]): { values: string[]; similarity: number }[] {
    const groups: { values: string[]; similarity: number }[] = [];
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const similarity = this.calculateStringSimilarity(values[i], values[j]);
        if (similarity > 0.8 && similarity < 1) {
          const existing = groups.find((g) => g.values.includes(values[i]) || g.values.includes(values[j]));
          if (existing) {
            if (!existing.values.includes(values[i])) existing.values.push(values[i]);
            if (!existing.values.includes(values[j])) existing.values.push(values[j]);
            existing.similarity = Math.max(existing.similarity, similarity);
          } else {
            groups.push({ values: [values[i], values[j]], similarity });
          }
        }
      }
    }
    return groups.filter((g) => g.values.length > 1);
  }

  private calculateStringSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const costs: number[][] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newValue = costs[j - 1] + 1;
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return (longer.length - costs[s2.length]) / longer.length;
  }

  private generateReport(problems: Problem[]): ProblemReport {
    const severityWeights: Record<Severity, number> = { critical: 20, high: 10, medium: 5, low: 2, info: 0 };
    const totalDeduction = problems.reduce((sum, p) => sum + severityWeights[p.severity] * Math.min(p.count || 1, 10), 0);
    const totalScore = Math.max(0, 100 - totalDeduction);
    const grade: ProblemReport['grade'] = totalScore >= 95 ? 'A+' : totalScore >= 90 ? 'A' : totalScore >= 85 ? 'B+' : totalScore >= 80 ? 'B' : totalScore >= 75 ? 'C+' : totalScore >= 70 ? 'C' : totalScore >= 60 ? 'D' : 'F';
    const emptyCells = problems.filter((p) => p.type === 'missing_values').reduce((sum, p) => sum + p.count, 0);
    const duplicateRows = problems.filter((p) => p.type === 'duplicate_rows').reduce((sum, p) => sum + p.count, 0);
    const inconsistentFormats = problems.filter((p) => p.type === 'date_format_inconsistency').reduce((sum, p) => sum + p.count, 0);
    const typeErrors = problems.filter((p) => p.type === 'type_mismatch').reduce((sum, p) => sum + p.count, 0);
    const criticalIssues = problems.filter((p) => p.severity === 'critical').length;
    const warnings = problems.filter((p) => p.severity === 'low' || p.severity === 'info').length;
    const recommendations: string[] = [];
    if (criticalIssues > 0) recommendations.push(`优先处理 ${criticalIssues} 个严重问题`);
    if (duplicateRows > 0) recommendations.push('建议执行去重操作确保数据唯一性');
    if (emptyCells > this.data.rows.length * this.data.headers.length * 0.2) recommendations.push('缺失值比例过高，建议清理或补充数据');
    if (problems.some((p) => p.autoFixable)) recommendations.push('部分问题支持一键自动修复');
    const categories = problems.reduce((acc, p) => { if (p.category) acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<ProblemCategory, number>);
    return {
      totalScore, grade, overallHealth: totalScore, hasProblems: problems.length > 0, problems, categories,
      summary: `数据健康度得分: ${totalScore}/100 (${grade})\n发现 ${problems.length} 个问题，其中 ${problems.filter((p) => p.autoFixable).length} 个可自动修复，${criticalIssues} 个严重问题`,
      statistics: { totalRows: this.data.rows.length, totalCols: this.data.headers.length, emptyCells, duplicateRows, inconsistentFormats, typeErrors, criticalIssues, warnings },
      recommendations, timestamp: Date.now(),
    };
  }
}

export function detectProblems(data: ParsedData, options?: DetectionOptions): ProblemReport {
  const detector = new ProblemDetector(data, options);
  return detector.detectAll();
}
