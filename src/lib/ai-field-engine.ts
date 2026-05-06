/**
 * AI字段引擎 - 融合飞书AI字段捷径+AI生成公式+单元格智能工具栏
 * 核心能力：可视化配置AI字段、自然语言生成公式、单元格文本AI处理
 */

import type { CellValue } from '@/lib/data-processor';

// ============================================
// 分类定义（用于筛选）- 9大类
// ============================================
export type AIFieldCategory =
  | 'extract' | 'classify' | 'summarize' | 'translate' | 'generate' | 'clean'
  | 'nlp' | 'convert' | 'calculate' | 'image';

export const AI_FIELD_CATEGORIES: { id: AIFieldCategory; label: string; icon: string }[] = [
  { id: 'extract', label: '信息提取', icon: '🔍' },
  { id: 'classify', label: '智能分类', icon: '🏷️' },
  { id: 'summarize', label: '内容总结', icon: '📝' },
  { id: 'translate', label: '智能翻译', icon: '🌐' },
  { id: 'generate', label: '内容生成', icon: '✨' },
  { id: 'clean', label: '数据清洗', icon: '🧹' },
  { id: 'nlp', label: 'NLP处理', icon: '📖' },
  { id: 'convert', label: '格式转换', icon: '🔧' },
  { id: 'calculate', label: '数据计算', icon: '🔢' },
  { id: 'image', label: '图片处理', icon: '🖼️' },
];

// ============================================
// AI字段类型定义（60+字段类型）
// ============================================
export type AIFieldType =
  | 'extract' | 'classify' | 'summarize' | 'translate' | 'generate' | 'clean'
  // NLP处理
  | 'sentiment' | 'nlp_extract' | 'keyword' | 'entity' | 'tone' | 'readability'
  | 'grammar' | 'spell' | 'abbreviation' | 'pii_mask' | 'lang_detect' | 'formality' | 'intent' | 'qa_generate'
  // 内容生成
  | 'summary_long' | 'bullet_summary' | 'headline' | 'description' | 'tag'
  // 智能分类
  | 'category' | 'rating' | 'priority' | 'risk' | 'status'
  // 信息提取
  | 'gender' | 'age_estimate' | 'location' | 'currency' | 'phone' | 'email'
  | 'url' | 'address' | 'date' | 'number' | 'unit_convert'
  // 数据计算
  | 'math' | 'percent' | 'average' | 'rank'
  // 数据清洗
  | 'normalize' | 'dedup' | 'fill' | 'merge' | 'split' | 'format' | 'unit_extract'
  | 'json_parse' | 'regex_extract'
  // 格式转换
  | 'to_lowercase' | 'to_uppercase' | 'trim' | 'pinyin' | 'char_count' | 'word_count'
  | 'template' | 'conditional' | 'comparison' | 'json_build' | 'json_extract'
  | 'array_join' | 'array_filter' | 'date_diff' | 'date_format'
  // 图片处理
  | 'image_ocr' | 'image_tag' | 'image_scene' | 'barcode' | 'qrcode';

export interface AIFieldConfig {
  // 信息提取
  extractTarget?: string;      // 提取目标：手机号/地址/日期/金额等
  // 智能分类
  classifyRules?: string;      // 分类规则：高/中/低 或 产品问题/物流问题
  // 内容总结
  summarizeLength?: number;    // 总结字数限制（默认100）
  // 智能翻译
  translateTarget?: string;    // 目标语言：中文/英文/日文
  // 内容生成
  generatePrompt?: string;     // 生成提示词
  // 数据清洗
  cleanStrategy?: string;      // 清洗策略：去重/格式化/补全
}

export interface AIField {
  id: string;
  name: string;                // 字段显示名称
  type: AIFieldType;
  sourceColumns: string[];     // 源数据列（支持多列）
  config: AIFieldConfig;
  status: 'pending' | 'preview' | 'running' | 'completed' | 'error';
  results: Record<number, CellValue>;  // 按行索引存储结果
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  autoUpdate: boolean;         // 源数据变化自动联动更新
  previewMode: boolean;        // 是否只预览前5行
}

// ============================================
// AI字段预设模板（开箱即用）
// ============================================
export interface AIFieldTemplate {
  id: string;
  name: string;
  description: string;
  type: AIFieldType;
  category: AIFieldCategory;   // 用于筛选
  tags: string[];              // 标签数组，用于关键词筛选
  icon: string;
  defaultConfig: AIFieldConfig;
  example: string;
}

export const AI_FIELD_TEMPLATES: AIFieldTemplate[] = [
  // ===== 信息提取 (extract) - 18个 =====
  { id: 'extract-phone', name: '提取手机号', description: '从文本中提取11位手机号码', type: 'extract', category: 'extract', tags: ['手机', '电话', '联系方式', '11位'], icon: 'Phone', defaultConfig: { extractTarget: '手机号' }, example: '从"客户备注"列提取手机号' },
  { id: 'extract-email', name: '提取邮箱', description: '从文本中提取电子邮箱地址', type: 'extract', category: 'extract', tags: ['邮箱', '邮件', 'email', '地址'], icon: 'Mail', defaultConfig: { extractTarget: '邮箱' }, example: '从"联系方式"列提取邮箱' },
  { id: 'extract-url', name: '提取网址', description: '从文本中提取URL链接', type: 'extract', category: 'extract', tags: ['网址', '链接', 'URL', '网站'], icon: 'Link', defaultConfig: { extractTarget: '网址' }, example: '从"备注"列提取网址链接' },
  { id: 'extract-idcard', name: '提取身份证号', description: '从文本中提取18位身份证号码', type: 'extract', category: 'extract', tags: ['身份证', '证件', 'ID', '18位'], icon: 'CreditCard', defaultConfig: { extractTarget: '身份证号' }, example: '从"证件信息"列提取身份证号' },
  { id: 'extract-address', name: '提取地址', description: '从文本中提取完整地址', type: 'extract', category: 'extract', tags: ['地址', '省市区', '收货地址'], icon: 'MapPin', defaultConfig: { extractTarget: '地址' }, example: '从"订单备注"提取收货地址' },
  { id: 'extract-date', name: '提取日期', description: '从文本中提取日期信息', type: 'extract', category: 'extract', tags: ['日期', '时间', '年月日'], icon: 'Calendar', defaultConfig: { extractTarget: '日期' }, example: '从"描述"列提取日期' },
  { id: 'extract-money', name: '提取金额', description: '从文本中提取金额数值', type: 'extract', category: 'extract', tags: ['金额', '价格', '钱', '¥'], icon: 'DollarSign', defaultConfig: { extractTarget: '金额' }, example: '从"交易描述"列提取金额' },
  { id: 'extract-qq', name: '提取QQ号', description: '从文本中提取QQ号码', type: 'extract', category: 'extract', tags: ['QQ', '企鹅号', '即时通讯'], icon: 'MessageSquare', defaultConfig: { extractTarget: 'QQ号' }, example: '从"联系方式"列提取QQ号' },
  { id: 'extract-wechat', name: '提取微信号', description: '从文本中提取微信号', type: 'extract', category: 'extract', tags: ['微信', 'WeChat', '联系方式'], icon: 'Smartphone', defaultConfig: { extractTarget: '微信号' }, example: '从"客户备注"提取微信号' },
  { id: 'extract-ip', name: '提取IP地址', description: '从文本中提取IPv4地址', type: 'extract', category: 'extract', tags: ['IP', '网络', '服务器'], icon: 'Wifi', defaultConfig: { extractTarget: 'IP地址' }, example: '从"日志"列提取IP地址' },
  { id: 'extract-postcode', name: '提取邮政编码', description: '从文本中提取6位邮政编码', type: 'extract', category: 'extract', tags: ['邮编', '邮政编码', 'Postal'], icon: 'Hash', defaultConfig: { extractTarget: '邮政编码' }, example: '从"地址"列提取邮编' },
  { id: 'extract-product-code', name: '提取商品编码', description: '从文本中提取SKU/货号/商品编码', type: 'extract', category: 'extract', tags: ['SKU', '货号', '编码', '商品代码'], icon: 'Package', defaultConfig: { extractTarget: '商品编码' }, example: '从"商品信息"列提取SKU编码' },
  { id: 'extract-name', name: '提取姓名', description: '从文本中提取人名', type: 'extract', category: 'extract', tags: ['姓名', '名字', '人名'], icon: 'User', defaultConfig: { extractTarget: '姓名' }, example: '从"详细信息"列提取姓名' },
  { id: 'extract-company', name: '提取公司名', description: '从文本中提取公司/企业名称', type: 'extract', category: 'extract', tags: ['公司', '企业', '机构', '商号'], icon: 'Building', defaultConfig: { extractTarget: '公司名' }, example: '从"业务合作"列提取公司名' },
  { id: 'extract-weather', name: '提取天气描述', description: '从文本中提取天气相关描述', type: 'extract', category: 'extract', tags: ['天气', '温度', '气候', '气象'], icon: 'Cloud', defaultConfig: { extractTarget: '天气描述' }, example: '从"日志"列提取天气描述' },
  { id: 'extract-hashtag', name: '提取话题标签', description: '从文本中提取#话题标签', type: 'extract', category: 'extract', tags: ['标签', '话题', 'Hashtag', '#'], icon: 'Hash', defaultConfig: { extractTarget: '话题标签' }, example: '从"内容"列提取#话题标签' },
  { id: 'extract-emotion', name: '提取情绪词', description: '从文本中提取情感词汇', type: 'extract', category: 'extract', tags: ['情绪', '情感', '心情', '感受'], icon: 'Heart', defaultConfig: { extractTarget: '情绪词' }, example: '从"评论"列提取情绪词' },
  { id: 'extract-keyword', name: '提取关键词', description: '从文本中提取核心关键词（最多5个）', type: 'extract', category: 'extract', tags: ['关键词', '核心词', '主题词'], icon: 'Tag', defaultConfig: { extractTarget: '关键词' }, example: '从"文章标题"列提取关键词' },

  // ===== 智能分类 (classify) - 18个 =====
  { id: 'classify-amount', name: '金额分级', description: '按金额区间自动分类', type: 'classify', category: 'classify', tags: ['金额', '分级', '高/中/低'], icon: 'TrendingUp', defaultConfig: { classifyRules: '高客单(>10000) / 中客单(3000-10000) / 低客单(<3000)' }, example: '订单金额 → 高/中/低客单' },
  { id: 'classify-feedback', name: '反馈分类', description: '自动分类客户反馈类型', type: 'classify', category: 'classify', tags: ['反馈', '评价', '投诉', '售后'], icon: 'MessageSquare', defaultConfig: { classifyRules: '产品问题 / 物流问题 / 服务问题 / 其他' }, example: '"物流太慢了" → 物流问题' },
  { id: 'classify-sentiment', name: '情感分析', description: '分析文本情感倾向', type: 'classify', category: 'classify', tags: ['情感', '正面', '负面', '中性', '情绪'], icon: 'Smile', defaultConfig: { classifyRules: '正面 / 负面 / 中性' }, example: '"产品非常好用" → 正面' },
  { id: 'classify-urgent', name: '紧急程度', description: '按紧急程度分类工单/任务', type: 'classify', category: 'classify', tags: ['紧急', '重要', '紧急程度', '优先级'], icon: 'AlertTriangle', defaultConfig: { classifyRules: '紧急 / 一般 / 缓急' }, example: '工单 → 紧急/一般/缓急' },
  { id: 'classify-risk', name: '风险等级', description: '评估并分类风险等级', type: 'classify', category: 'classify', tags: ['风险', '安全', '风险等级'], icon: 'Shield', defaultConfig: { classifyRules: '高风险 / 中风险 / 低风险' }, example: '交易记录 → 高/中/低风险' },
  { id: 'classify-stage', name: '销售阶段', description: '分类销售商机所处阶段', type: 'classify', category: 'classify', tags: ['销售', '商机', '阶段', '漏斗'], icon: 'Target', defaultConfig: { classifyRules: '线索 / 意向 / 报价 / 成交 / 失败' }, example: '商机 → 线索/意向/报价/成交' },
  { id: 'classify-product-type', name: '产品类型', description: '根据描述自动分类产品类别', type: 'classify', category: 'classify', tags: ['产品', '分类', '类型', '品类'], icon: 'Grid', defaultConfig: { classifyRules: '电子产品 / 服装 / 食品 / 家居 / 其他' }, example: '商品描述 → 产品类型分类' },
  { id: 'classify-channel', name: '渠道来源', description: '识别并分类客户来源渠道', type: 'classify', category: 'classify', tags: ['渠道', '来源', '获客'], icon: 'GitBranch', defaultConfig: { classifyRules: '线上推广 / 线下门店 / 朋友推荐 / 自然流量 / 其他' }, example: '客户来源 → 渠道分类' },
  { id: 'classify-region', name: '地区分类', description: '根据地址或IP分类所属地区', type: 'classify', category: 'classify', tags: ['地区', '区域', '省份', '城市'], icon: 'Map', defaultConfig: { classifyRules: '华北 / 华东 / 华南 / 华中 / 西南 / 西北 / 东北' }, example: '地址 → 地区分类' },
  { id: 'classify-gender', name: '性别识别', description: '根据姓名或描述判断性别', type: 'classify', category: 'classify', tags: ['性别', '男', '女', '未知'], icon: 'Users', defaultConfig: { classifyRules: '男 / 女 / 未知' }, example: '姓名 → 性别分类' },
  { id: 'classify-age', name: '年龄段', description: '根据出生年月或描述分类年龄段', type: 'classify', category: 'classify', tags: ['年龄', '年龄段', '青年', '中年'], icon: 'Calendar', defaultConfig: { classifyRules: '18岁以下 / 18-25岁 / 26-35岁 / 36-45岁 / 45岁以上' }, example: '年龄 → 年龄段分类' },
  { id: 'classify-payment', name: '支付方式', description: '识别并分类支付方式', type: 'classify', category: 'classify', tags: ['支付', '付款', '微信', '支付宝', '银行卡'], icon: 'CreditCard', defaultConfig: { classifyRules: '微信 / 支付宝 / 银行卡 / 现金 / 其他' }, example: '交易描述 → 支付方式分类' },
  { id: 'classify-dev-stage', name: '项目阶段', description: '分类项目所处开发阶段', type: 'classify', category: 'classify', tags: ['项目', '阶段', '开发', '进度'], icon: 'BarChart', defaultConfig: { classifyRules: '需求阶段 / 开发中 / 测试中 / 已上线 / 已结束' }, example: '项目名称 → 开发阶段分类' },
  { id: 'classify-loan', name: '贷款类型', description: '分类贷款产品类型', type: 'classify', category: 'classify', tags: ['贷款', '信贷', '类型'], icon: 'Banknote', defaultConfig: { classifyRules: '信用贷 / 抵押贷 / 经营贷 / 消费贷 / 房贷' }, example: '贷款申请 → 贷款类型分类' },
  { id: 'classify-disease', name: '疾病分类', description: '根据症状描述分类疾病类型', type: 'classify', category: 'classify', tags: ['疾病', '症状', '医疗', '健康'], icon: 'Stethoscope', defaultConfig: { classifyRules: '呼吸系统 / 消化系统 / 心血管 / 神经 / 其他' }, example: '症状描述 → 疾病分类' },
  { id: 'classify-edu-level', name: '学历层次', description: '识别并分类学历层次', type: 'classify', category: 'classify', tags: ['学历', '教育', '学位', '本科', '硕士'], icon: 'GraduationCap', defaultConfig: { classifyRules: '初中及以下 / 高中 / 大专 / 本科 / 硕士 / 博士' }, example: '教育信息 → 学历层次分类' },
  { id: 'classify-subscription', name: '订阅状态', description: '分类用户订阅状态', type: 'classify', category: 'classify', tags: ['订阅', '会员', '状态', '续费'], icon: 'Star', defaultConfig: { classifyRules: '活跃订阅 / 试用中 / 已过期 / 已取消' }, example: '用户 → 订阅状态分类' },
  { id: 'classify-compliance', name: '合规类型', description: '分类合规检查项目类型', type: 'classify', category: 'classify', tags: ['合规', '审计', '检查'], icon: 'CheckCircle', defaultConfig: { classifyRules: '财务合规 / 数据合规 / 运营合规 / 安全合规' }, example: '检查项 → 合规类型分类' },

  // ===== 内容总结 (summarize) - 17个 =====
  { id: 'summarize-text', name: '文本总结', description: '将长文本精简为核心摘要', type: 'summarize', category: 'summarize', tags: ['总结', '摘要', '精简', '概括'], icon: 'FileText', defaultConfig: { summarizeLength: 100 }, example: '项目进展 → 100字核心摘要' },
  { id: 'summarize-todo', name: '提取待办', description: '从聊天记录/会议纪要提取待办事项', type: 'summarize', category: 'summarize', tags: ['待办', '任务', 'TODO', '事项'], icon: 'CheckSquare', defaultConfig: { summarizeLength: 50 }, example: '会议纪要 → 待办事项清单' },
  { id: 'summarize-meeting', name: '会议纪要', description: '从会议记录提炼关键要点', type: 'summarize', category: 'summarize', tags: ['会议', '纪要', '要点'], icon: 'Users', defaultConfig: { summarizeLength: 150 }, example: '会议记录 → 关键要点' },
  { id: 'summarize-news', name: '新闻摘要', description: '将新闻内容提炼核心信息', type: 'summarize', category: 'summarize', tags: ['新闻', '摘要', '资讯'], icon: 'Newspaper', defaultConfig: { summarizeLength: 80 }, example: '新闻文章 → 80字摘要' },
  { id: 'summarize-product', name: '产品描述', description: '从原始描述生成规范产品介绍', type: 'summarize', category: 'summarize', tags: ['产品', '描述', '介绍'], icon: 'Package', defaultConfig: { summarizeLength: 60 }, example: '产品参数 → 60字产品描述' },
  { id: 'summarize-contract', name: '合同摘要', description: '从合同文本提取关键条款', type: 'summarize', category: 'summarize', tags: ['合同', '条款', '协议'], icon: 'FileSignature', defaultConfig: { summarizeLength: 120 }, example: '合同全文 → 关键条款摘要' },
  { id: 'summarize-report', name: '报告结论', description: '从数据报告提炼核心结论', type: 'summarize', category: 'summarize', tags: ['报告', '结论', '数据'], icon: 'BarChart2', defaultConfig: { summarizeLength: 100 }, example: '分析报告 → 核心结论' },
  { id: 'summarize-resume', name: '简历亮点', description: '从简历中提炼核心经历和技能', type: 'summarize', category: 'summarize', tags: ['简历', '亮点', '经历'], icon: 'Briefcase', defaultConfig: { summarizeLength: 80 }, example: '完整简历 → 核心亮点' },
  { id: 'summarize-review', name: '评论要点', description: '从多条评论中提炼共同观点', type: 'summarize', category: 'summarize', tags: ['评论', '要点', '观点'], icon: 'MessageCircle', defaultConfig: { summarizeLength: 60 }, example: '多条评论 → 核心观点' },
  { id: 'summarize-legal', name: '法律文书摘要', description: '从法律文书中提取关键信息', type: 'summarize', category: 'summarize', tags: ['法律', '文书', '摘要'], icon: 'Scale', defaultConfig: { summarizeLength: 100 }, example: '起诉书 → 关键信息摘要' },
  { id: 'summarize-medical', name: '病历摘要', description: '从病历中提炼诊断和医嘱要点', type: 'summarize', category: 'summarize', tags: ['病历', '医嘱', '诊断'], icon: 'Activity', defaultConfig: { summarizeLength: 80 }, example: '病历记录 → 诊断要点' },
  { id: 'summarize-policy', name: '政策要点', description: '从政策文件中提炼核心要点', type: 'summarize', category: 'summarize', tags: ['政策', '要点', '文件'], icon: 'BookOpen', defaultConfig: { summarizeLength: 100 }, example: '政策文件 → 核心要点' },
  { id: 'summarize-email', name: '邮件摘要', description: '从长邮件中提炼核心内容', type: 'summarize', category: 'summarize', tags: ['邮件', 'Email', '内容'], icon: 'Mail', defaultConfig: { summarizeLength: 50 }, example: '长邮件 → 核心内容摘要' },
  { id: 'summarize-article', name: '文章中心思想', description: '提炼文章或段落的核心思想', type: 'summarize', category: 'summarize', tags: ['文章', '思想', '主题'], icon: 'Book', defaultConfig: { summarizeLength: 60 }, example: '文章 → 中心思想' },
  { id: 'summarize-spec', name: '需求规格', description: '从需求描述生成规范规格说明', type: 'summarize', category: 'summarize', tags: ['需求', '规格', '说明'], icon: 'Clipboard', defaultConfig: { summarizeLength: 80 }, example: '需求描述 → 规格说明' },
  { id: 'summarize-commentary', name: '解说词提炼', description: '从解说/演讲词提炼核心观点', type: 'summarize', category: 'summarize', tags: ['解说', '演讲', '观点'], icon: 'Mic', defaultConfig: { summarizeLength: 60 }, example: '演讲稿 → 核心观点' },
  { id: 'summarize-error', name: '错误描述', description: '将错误日志精简为核心问题描述', type: 'summarize', category: 'summarize', tags: ['错误', '异常', 'Bug', '日志'], icon: 'AlertCircle', defaultConfig: { summarizeLength: 50 }, example: '错误日志 → 核心问题' },

  // ===== 智能翻译 (translate) - 15个 =====
  { id: 'translate-cn', name: '翻译为中文', description: '将外文自动翻译为中文', type: 'translate', category: 'translate', tags: ['中文', '翻译', 'Chinese'], icon: 'Languages', defaultConfig: { translateTarget: '中文' }, example: 'Customer Address → 客户地址' },
  { id: 'translate-en', name: '翻译为英文', description: '将中文自动翻译为英文', type: 'translate', category: 'translate', tags: ['英文', 'English', '翻译'], icon: 'Globe', defaultConfig: { translateTarget: '英文' }, example: '产品名称 → Product Name' },
  { id: 'translate-jp', name: '翻译为日文', description: '将中文翻译为日语', type: 'translate', category: 'translate', tags: ['日文', '日语', 'Japanese'], icon: 'Globe', defaultConfig: { translateTarget: '日文' }, example: '产品描述 → 日文描述' },
  { id: 'translate-kr', name: '翻译为韩文', description: '将中文翻译为韩语', type: 'translate', category: 'translate', tags: ['韩文', '韩语', 'Korean'], icon: 'Globe', defaultConfig: { translateTarget: '韩文' }, example: '商品名称 → 韩文名称' },
  { id: 'translate-fr', name: '翻译为法文', description: '将中文翻译为法语', type: 'translate', category: 'translate', tags: ['法文', '法语', 'French'], icon: 'Globe', defaultConfig: { translateTarget: '法文' }, example: '描述 → 法文翻译' },
  { id: 'translate-de', name: '翻译为德文', description: '将中文翻译为德语', type: 'translate', category: 'translate', tags: ['德文', '德语', 'German'], icon: 'Globe', defaultConfig: { translateTarget: '德文' }, example: '描述 → 德文翻译' },
  { id: 'translate-es', name: '翻译为西班牙文', description: '将中文翻译为西班牙语', type: 'translate', category: 'translate', tags: ['西班牙', '西语', 'Spanish'], icon: 'Globe', defaultConfig: { translateTarget: '西班牙文' }, example: '描述 → 西班牙文翻译' },
  { id: 'translate-pt', name: '翻译为葡萄牙文', description: '将中文翻译为葡萄牙语', type: 'translate', category: 'translate', tags: ['葡萄牙', '葡语', 'Portuguese'], icon: 'Globe', defaultConfig: { translateTarget: '葡萄牙文' }, example: '描述 → 葡萄牙文翻译' },
  { id: 'translate-ru', name: '翻译为俄文', description: '将中文翻译为俄语', type: 'translate', category: 'translate', tags: ['俄文', '俄语', 'Russian'], icon: 'Globe', defaultConfig: { translateTarget: '俄文' }, example: '描述 → 俄文翻译' },
  { id: 'translate-ar', name: '翻译为阿拉伯文', description: '将中文翻译为阿拉伯语', type: 'translate', category: 'translate', tags: ['阿拉伯', '阿语', 'Arabic'], icon: 'Globe', defaultConfig: { translateTarget: '阿拉伯文' }, example: '描述 → 阿拉伯文翻译' },
  { id: 'translate-th', name: '翻译为泰文', description: '将中文翻译为泰语', type: 'translate', category: 'translate', tags: ['泰文', '泰语', 'Thai'], icon: 'Globe', defaultConfig: { translateTarget: '泰文' }, example: '描述 → 泰文翻译' },
  { id: 'translate-vi', name: '翻译为越南文', description: '将中文翻译为越南语', type: 'translate', category: 'translate', tags: ['越南', '越语', 'Vietnamese'], icon: 'Globe', defaultConfig: { translateTarget: '越南文' }, example: '描述 → 越南文翻译' },
  { id: 'translate-formal', name: '正式语气', description: '将文本转换为正式商务语气', type: 'translate', category: 'translate', tags: ['正式', '商务', '语气', '书面'], icon: 'Award', defaultConfig: { translateTarget: '正式商务语气' }, example: '口语描述 → 正式商务语气' },
  { id: 'translate-casual', name: '口语化', description: '将文本转换为轻松口语风格', type: 'translate', category: 'translate', tags: ['口语', '轻松', '日常'], icon: 'Coffee', defaultConfig: { translateTarget: '轻松口语风格' }, example: '正式文本 → 口语化表达' },
  { id: 'translate-simplify', name: '简化中文', description: '将繁体中文转换为简体中文', type: 'translate', category: 'translate', tags: ['繁体', '简体', '简化'], icon: 'Type', defaultConfig: { translateTarget: '简体中文' }, example: '繁體中文 → 简体中文' },

  // ===== 内容生成 (generate) - 18个 =====
  { id: 'generate-copy', name: '生成推广文案', description: '基于产品信息生成推广文案', type: 'generate', category: 'generate', tags: ['推广', '文案', '营销', '广告'], icon: 'PenTool', defaultConfig: { generatePrompt: '基于产品名称、价格、卖点生成50字推广文案' }, example: '产品信息 → 推广文案' },
  { id: 'generate-review', name: '生成绩效评语', description: '基于考勤数据自动生成绩效评语', type: 'generate', category: 'generate', tags: ['绩效', '评语', '评价', 'KPI'], icon: 'Star', defaultConfig: { generatePrompt: '基于员工考勤数据生成季度绩效评语' }, example: '考勤数据 → 绩效评语' },
  { id: 'generate-title', name: '生成标题', description: '为文章/产品生成吸引人的标题', type: 'generate', category: 'generate', tags: ['标题', '标题党', '吸引人'], icon: 'Zap', defaultConfig: { generatePrompt: '基于内容生成3个吸引人的标题选项' }, example: '文章内容 → 吸引人标题' },
  { id: 'generate-tag', name: '生成标签', description: '为内容自动生成相关标签', type: 'generate', category: 'generate', tags: ['标签', 'Tag', '归类'], icon: 'Tag', defaultConfig: { generatePrompt: '基于内容生成3-5个相关标签，用逗号分隔' }, example: '文章内容 → 标签列表' },
  { id: 'generate-reply', name: '生成回复', description: '根据客户消息自动生成回复建议', type: 'generate', category: 'generate', tags: ['回复', '客服', '自动回复'], icon: 'MessageCircle', defaultConfig: { generatePrompt: '基于客户问题生成专业、友好的回复' }, example: '客户问题 → 回复建议' },
  { id: 'generate-daily', name: '生成日报', description: '基于工作记录自动生成日报', type: 'generate', category: 'generate', tags: ['日报', '日报表', '工作总结'], icon: 'FileText', defaultConfig: { generatePrompt: '基于今日工作内容生成结构化日报' }, example: '工作记录 → 日报表' },
  { id: 'generate-intro', name: '生成简介', description: '为人物/公司/产品生成简介', type: 'generate', category: 'generate', tags: ['简介', '介绍', '概述'], icon: 'Info', defaultConfig: { generatePrompt: '基于基本信息生成100字简介' }, example: '人物信息 → 个人简介' },
  { id: 'generate-slogan', name: '生成口号', description: '为品牌/活动生成宣传口号', type: 'generate', category: 'generate', tags: ['口号', 'Slogan', '标语', '品牌'], icon: 'Megaphone', defaultConfig: { generatePrompt: '基于品牌定位生成3条宣传口号' }, example: '品牌信息 → 宣传口号' },
  { id: 'generate-email', name: '生成邮件', description: '根据主题和要点生成规范邮件', type: 'generate', category: 'generate', tags: ['邮件', 'Email', '商务'], icon: 'Send', defaultConfig: { generatePrompt: '基于邮件主题和要点生成完整规范邮件正文' }, example: '邮件要点 → 完整邮件' },
  { id: 'generate-followup', name: '生成跟进计划', description: '基于客户信息生成跟进计划', type: 'generate', category: 'generate', tags: ['跟进', '计划', '客户管理'], icon: 'Clock', defaultConfig: { generatePrompt: '基于客户当前状态生成7天跟进计划' }, example: '客户信息 → 跟进计划' },
  { id: 'generate-remark', name: '生成备注', description: '根据订单/客户信息生成内部备注', type: 'generate', category: 'generate', tags: ['备注', '说明', '记录'], icon: 'Edit', defaultConfig: { generatePrompt: '基于订单信息生成简洁内部备注' }, example: '订单信息 → 内部备注' },
  { id: 'generate-desc', name: '生成描述', description: '为无描述的字段自动生成描述', type: 'generate', category: 'generate', tags: ['描述', '说明', '详情'], icon: 'AlignLeft', defaultConfig: { generatePrompt: '基于现有信息生成60字详细描述' }, example: '产品参数 → 产品描述' },
  { id: 'generate-seo', name: '生成SEO关键词', description: '为内容生成SEO优化关键词', type: 'generate', category: 'generate', tags: ['SEO', '搜索', '关键词'], icon: 'Search', defaultConfig: { generatePrompt: '基于内容生成10个SEO关键词' }, example: '文章内容 → SEO关键词' },
  { id: 'generate-question', name: '生成考题', description: '基于知识内容生成测试题目', type: 'generate', category: 'generate', tags: ['考题', '题目', '测试', '教育'], icon: 'HelpCircle', defaultConfig: { generatePrompt: '基于知识内容生成3道选择题和1道简答题' }, example: '教材内容 → 考题' },
  { id: 'generate-contract-clause', name: '生成合同条款', description: '根据业务场景生成合同条款', type: 'generate', category: 'generate', tags: ['合同', '条款', '法务'], icon: 'FileSignature', defaultConfig: { generatePrompt: '基于业务场景生成标准合同条款' }, example: '业务场景 → 合同条款' },
  { id: 'generate-analysis', name: '生成分析结论', description: '基于数据生成分析结论', type: 'generate', category: 'generate', tags: ['分析', '结论', '洞察'], icon: 'TrendingUp', defaultConfig: { generatePrompt: '基于数据生成3条关键分析结论' }, example: '数据 → 分析结论' },
  { id: 'generate-recommend', name: '生成推荐理由', description: '为商品/方案生成推荐理由', type: 'generate', category: 'generate', tags: ['推荐', '理由', '卖点'], icon: 'ThumbsUp', defaultConfig: { generatePrompt: '基于商品优势生成3条推荐理由' }, example: '商品 → 推荐理由' },
  { id: 'generate-holiday', name: '节日祝福', description: '自动生成节日祝福语', type: 'generate', category: 'generate', tags: ['祝福', '节日', '问候', '节日营销'], icon: 'Gift', defaultConfig: { generatePrompt: '基于节日名称和客户特点生成个性化祝福语' }, example: '节日+客户 → 祝福语' },

  // ===== 数据清洗 (clean) - 18个 =====
  { id: 'clean-format-date', name: '日期格式标准化', description: '统一日期格式为YYYY-MM-DD', type: 'clean', category: 'clean', tags: ['日期', '格式', '标准化'], icon: 'Calendar', defaultConfig: { cleanStrategy: '格式化日期为YYYY-MM-DD' }, example: '2024.1.5 → 2024-01-05' },
  { id: 'clean-format-money', name: '金额格式标准化', description: '统一金额格式（保留2位小数）', type: 'clean', category: 'clean', tags: ['金额', '格式', '货币'], icon: 'DollarSign', defaultConfig: { cleanStrategy: '格式化金额为标准货币格式' }, example: '1000 → ¥1,000.00' },
  { id: 'clean-phone', name: '手机号格式化', description: '将手机号统一为138****8888格式', type: 'clean', category: 'clean', tags: ['手机', '电话', '隐私', '脱敏'], icon: 'Phone', defaultConfig: { cleanStrategy: '手机号脱敏格式化' }, example: '13812345678 → 138****5678' },
  { id: 'clean-phone-full', name: '手机号完整格式化', description: '将手机号统一为标准格式(86-xxx-xxxx-xxxx)', type: 'clean', category: 'clean', tags: ['手机', '电话', '格式'], icon: 'Phone', defaultConfig: { cleanStrategy: '手机号标准化格式' }, example: '13812345678 → (86) 138-1234-5678' },
  { id: 'clean-email-mask', name: '邮箱脱敏', description: '将邮箱部分字符替换为星号', type: 'clean', category: 'clean', tags: ['邮箱', '脱敏', '隐私'], icon: 'Mail', defaultConfig: { cleanStrategy: '邮箱脱敏' }, example: 'test@example.com → t***@example.com' },
  { id: 'clean-idcard', name: '身份证脱敏', description: '将身份证号中间部分替换为星号', type: 'clean', category: 'clean', tags: ['身份证', '脱敏', '隐私'], icon: 'CreditCard', defaultConfig: { cleanStrategy: '身份证号脱敏' }, example: '110101199001011234 → 110101********1234' },
  { id: 'clean-trim', name: '去除多余空格', description: '去除文本首尾空格和多余空格', type: 'clean', category: 'clean', tags: ['空格', 'Trim', '清理'], icon: 'Minus', defaultConfig: { cleanStrategy: '去除多余空格' }, example: '  大家好  你好  → 大家好 你好' },
  { id: 'clean-case-upper', name: '转大写', description: '将英文文本全部转为大写', type: 'clean', category: 'clean', tags: ['大写', 'Uppercase', '英文'], icon: 'ArrowUp', defaultConfig: { cleanStrategy: '转大写' }, example: 'hello → HELLO' },
  { id: 'clean-case-lower', name: '转小写', description: '将英文文本全部转为小写', type: 'clean', category: 'clean', tags: ['小写', 'Lowercase', '英文'], icon: 'ArrowDown', defaultConfig: { cleanStrategy: '转小写' }, example: 'HELLO → hello' },
  { id: 'clean-case-title', name: '首字母大写', description: '将每个单词首字母大写', type: 'clean', category: 'clean', tags: ['首字母', 'Titlecase', '英文'], icon: 'Type', defaultConfig: { cleanStrategy: '首字母大写' }, example: 'hello world → Hello World' },
  { id: 'clean-remove-html', name: '去除HTML标签', description: '移除文本中的HTML标签', type: 'clean', category: 'clean', tags: ['HTML', '标签', '去除'], icon: 'Code', defaultConfig: { cleanStrategy: '去除HTML标签' }, example: '<b>内容</b> → 内容' },
  { id: 'clean-remove-emoji', name: '去除表情符号', description: '移除文本中的emoji表情符号', type: 'clean', category: 'clean', tags: ['表情', 'Emoji', '去除'], icon: 'Smile', defaultConfig: { cleanStrategy: '去除表情符号' }, example: '太棒了👍 → 太棒了' },
  { id: 'clean-fill-forward', name: '向下填充', description: '用上方非空值填充空单元格', type: 'clean', category: 'clean', tags: ['填充', '空值', '补全'], icon: 'ArrowDown', defaultConfig: { cleanStrategy: '向下填充空值' }, example: 'A列空值 → 用上一行值填充' },
  { id: 'clean-fill-mode', name: '众数填充', description: '用该列众数（最常见值）填充空值', type: 'clean', category: 'clean', tags: ['填充', '众数', '补全'], icon: 'BarChart', defaultConfig: { cleanStrategy: '用众数填充空值' }, example: '空值 → 该列众数' },
  { id: 'clean-fill-mean', name: '均值填充', description: '用数值列均值填充空值', type: 'clean', category: 'clean', tags: ['填充', '均值', '数值'], icon: 'Divide', defaultConfig: { cleanStrategy: '用均值填充空值' }, example: '空值 → 数值列均值' },
  { id: 'clean-dedup', name: '去除重复', description: '标记或去除重复的记录', type: 'clean', category: 'clean', tags: ['去重', '重复', '唯一'], icon: 'Copy', defaultConfig: { cleanStrategy: '标记重复记录' }, example: '重复行 → 标记或删除' },
  { id: 'clean-standardize', name: '文本标准化', description: '统一相似文本（去除标点差异等）', type: 'clean', category: 'clean', tags: ['标准化', '文本', '统一'], icon: 'CheckSquare', defaultConfig: { cleanStrategy: '文本内容标准化' }, example: '北京市/北京 → 北京市' },
  { id: 'clean-length-limit', name: '字数截断', description: '将文本截断到指定长度', type: 'clean', category: 'clean', tags: ['截断', '字数', '限制'], icon: 'Scissors', defaultConfig: { cleanStrategy: '截断到指定字数' }, example: '超长文本 → 指定长度+' },
];

// ============================================
// 智能推荐：根据数据特征推荐AI字段类型
// ============================================
export interface ColumnFeature {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  sampleValues: CellValue[];
  avgLength?: number;
  nullRate?: number;
}

export function recommendAIFields(columns: ColumnFeature[]): AIFieldTemplate[] {
  const recommendations: AIFieldTemplate[] = [];
  const usedIds = new Set<string>();

  for (const col of columns) {
    // 长文本列 → 推荐总结/提取
    if (col.type === 'text' && (col.avgLength ?? 0) > 50) {
      if (!usedIds.has('summarize-text')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'summarize-text')!);
        usedIds.add('summarize-text');
      }
    }

    // 包含混合内容的文本 → 推荐提取
    if (col.type === 'text') {
      const samples = String(col.sampleValues[0] || '');
      if (/\d{11}/.test(samples) && !usedIds.has('extract-phone')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'extract-phone')!);
        usedIds.add('extract-phone');
      }
    }

    // 金额列 → 推荐分类
    if (col.type === 'number' && /金额|价格|销售额|收入|cost|price|amount/i.test(col.name)) {
      if (!usedIds.has('classify-amount')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'classify-amount')!);
        usedIds.add('classify-amount');
      }
    }

    // 反馈/备注列 → 推荐分类
    if (/反馈|备注|评价|评论|feedback|comment|review/i.test(col.name)) {
      if (!usedIds.has('classify-feedback')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'classify-feedback')!);
        usedIds.add('classify-feedback');
      }
    }

    // 英文列 → 推荐翻译
    if (col.type === 'text') {
      const samples = String(col.sampleValues[0] || '');
      if (/[a-zA-Z]{3,}/.test(samples) && !usedIds.has('translate-cn')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'translate-cn')!);
        usedIds.add('translate-cn');
      }
    }

    // 高缺失率 → 推荐补全
    if ((col.nullRate ?? 0) > 0.3 && !usedIds.has('clean-fill')) {
      recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'clean-fill')!);
      usedIds.add('clean-fill');
    }
  }

  return recommendations.slice(0, 5); // 最多推荐5个
}

// ============================================
// AI字段执行引擎
// ============================================
export interface AIFieldExecuteContext {
  rows: Record<string, CellValue>[];
  headers: string[];
  sourceColumns: string[];
  rowIndices: number[];        // 需要处理的行索引
}

export interface AIFieldExecuteResult {
  rowIndex: number;
  value: CellValue;
  confidence?: number;         // 置信度 0-1
}

/**
 * 构建AI字段执行的Prompt
 */
export function buildAIFieldPrompt(
  field: AIField,
  context: AIFieldExecuteContext,
  rowIndex: number
): string {
  const row = context.rows[rowIndex];
  const sourceData = context.sourceColumns.map(col => ({
    column: col,
    value: row[col],
  }));

  const dataStr = sourceData.map(d => `${d.column}: ${d.value}`).join('\n');

  const prompts: Partial<Record<AIFieldType, string>> = {
    extract: `从以下数据中提取"${field.config.extractTarget}"。只返回提取结果，不要解释。
数据：
${dataStr}`,

    classify: `你是一个数据分类助手。请根据分类规则对数据进行分类。

分类规则：${field.config.classifyRules || '高/中/低 三档分类'}
数据：
${dataStr}

请分析数值，按照规则输出对应的分类标签（如：高客单、中客单、低客单）。只返回分类结果，不要其他文字。`,

    summarize: `将以下内容总结为${field.config.summarizeLength || 100}字以内的核心摘要。只返回摘要。
内容：
${dataStr}`,

    translate: `将以下内容翻译为${field.config.translateTarget}。只返回翻译结果。
内容：
${dataStr}`,

    generate: `基于以下数据，${field.config.generatePrompt}。只返回生成结果。
数据：
${dataStr}`,

    clean: `对以下数据进行${field.config.cleanStrategy}处理。只返回处理后的结果。
数据：
${dataStr}`,
  };

  return prompts[field.type] ?? `对以下数据执行${field.type}操作。只返回结果。\n数据：\n${dataStr}`;
}

// ============================================
// 本地存储管理
// ============================================
const STORAGE_KEY = 'datainsight_ai_fields';

export function saveAIFields(dataId: string, fields: AIField[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[dataId] = fields;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function loadAIFields(dataId: string): AIField[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[dataId] || [];
  } catch {
    return [];
  }
}

// ============================================
// 工具函数
// ============================================

/** 生成唯一ID */
export function generateFieldId(): string {
  return `aifield_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 创建AI字段 */
export function createAIField(
  name: string,
  type: AIFieldType,
  sourceColumns: string[],
  config: AIFieldConfig,
  options?: { autoUpdate?: boolean; previewMode?: boolean }
): AIField {
  return {
    id: generateFieldId(),
    name,
    type,
    sourceColumns,
    config,
    status: 'pending',
    results: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    autoUpdate: options?.autoUpdate ?? true,
    previewMode: options?.previewMode ?? true,
  };
}

/** 从模板创建AI字段 */
export function createAIFieldFromTemplate(
  template: AIFieldTemplate,
  sourceColumns: string[]
): AIField {
  return createAIField(
    template.name,
    template.type,
    sourceColumns,
    { ...template.defaultConfig },
    { previewMode: true, autoUpdate: true }
  );
}

/** 获取AI字段的显示图标 */
export function getAIFieldTypeIcon(type: AIFieldType): string {
  const icons: Record<string, string> = {
    extract: '🔍', classify: '🏷️', summarize: '📝', translate: '🌐',
    generate: '✨', clean: '🧹', sentiment: '💬', nlp_extract: '📖',
    keyword: '🔑', entity: '👤', tone: '🎯', readability: '📊',
    grammar: '✏️', spell: '🔤', abbreviation: '📌', pii_mask: '🔒',
    lang_detect: '🌍', formality: '💼', intent: '🎯', qa_generate: '❓',
    summary_long: '📄', bullet_summary: '📋', headline: '📰', description: '📃',
    tag: '🏷️', category: '📂', rating: '⭐', priority: '🔺',
    risk: '⚠️', status: '🔘', gender: '🚻', age_estimate: '🎂',
    location: '📍', currency: '💰', phone: '📞', email: '📧',
    url: '🔗', address: '🏠', date: '📅', number: '🔢',
    unit_convert: '🔄', math: '➕', percent: '💯', average: '📈',
    rank: '🏅', normalize: '📏', dedup: '🗂️', fill: '🖊️',
    merge: '🔗', split: '✂️', format: '🔧', unit_extract: '📐',
    json_parse: '{}', regex_extract: '🔎', to_lowercase: '🔽',
    to_uppercase: '🔼', trim: '✂️', pinyin: '🔤', char_count: '0️⃣',
    word_count: '1️⃣', template: '📝', conditional: '🔀', comparison: '⚖️',
    json_build: '🏗️', json_extract: '📤', array_join: '🔗', array_filter: '🔽',
    date_diff: '📆', date_format: '🗓️', image_ocr: '📷', image_tag: '🏞️',
    image_scene: '🎨', barcode: '📊', qrcode: '📱',
  };
  return icons[type] ?? '⚙️';
}

/** 获取AI字段类型的中文名 */
export function getAIFieldTypeLabel(type: AIFieldType): string {
  const labels: Record<string, string> = {
    extract: '信息提取', classify: '智能分类', summarize: '内容总结',
    translate: '智能翻译', generate: '内容生成', clean: '数据清洗',
    sentiment: '情感分析', nlp_extract: 'NLP提取', keyword: '关键词提取',
    entity: '实体识别', tone: '语气分析', readability: '可读性评分',
    grammar: '语法检查', spell: '错别字检测', abbreviation: '缩写解释',
    pii_mask: '隐私脱敏', lang_detect: '语言检测', formality: '正式度分析',
    intent: '意图识别', qa_generate: '问答生成', summary_long: '长文摘要',
    bullet_summary: '要点提炼', headline: '标题生成', description: '描述生成',
    tag: '标签生成', category: '类目归类', rating: '星级评分',
    priority: '优先级判定', risk: '风险评估', status: '状态判定',
    gender: '性别识别', age_estimate: '年龄估算', location: '地区识别',
    currency: '货币识别', phone: '电话提取', email: '邮箱提取',
    url: '链接提取', address: '地址解析', date: '日期提取',
    number: '数字提取', unit_convert: '单位换算', math: '数学计算',
    percent: '百分比计算', average: '平均值计算', rank: '排名计算',
    normalize: '数据标准化', dedup: '去重标记', fill: '智能填充',
    merge: '字段合并', split: '字段拆分', format: '格式转换',
    unit_extract: '单位提取', json_parse: 'JSON解析', regex_extract: '正则提取',
    to_lowercase: '转小写', to_uppercase: '转大写', trim: '去首尾空格',
    pinyin: '拼音转换', char_count: '字符统计', word_count: '词数统计',
    template: '模板填充', conditional: '条件判断', comparison: '对比分析',
    json_build: 'JSON构建', json_extract: 'JSON提取', array_join: '数组合并',
    array_filter: '数组过滤', date_diff: '日期间差', date_format: '日期格式化',
    image_ocr: '图片OCR', image_tag: '图片标签', image_scene: '场景识别',
    barcode: '条码识别', qrcode: '二维码解析',
  };
  return labels[type] ?? type;
}

export function getCategoryLabel(category: AIFieldCategory): string {
  const cat = AI_FIELD_CATEGORIES.find(c => c.id === category);
  return cat ? `${cat.icon} ${cat.label}` : category;
}

/** 获取AI字段类型的颜色 */
export function getAIFieldTypeColor(type: AIFieldType): string {
  const colors: Record<string, string> = {
    extract: 'bg-blue-100 text-blue-700', classify: 'bg-amber-100 text-amber-700',
    summarize: 'bg-green-100 text-green-700', translate: 'bg-purple-100 text-purple-700',
    generate: 'bg-pink-100 text-pink-700', clean: 'bg-cyan-100 text-cyan-700',
    sentiment: 'bg-rose-100 text-rose-700', nlp_extract: 'bg-indigo-100 text-indigo-700',
    keyword: 'bg-teal-100 text-teal-700', entity: 'bg-orange-100 text-orange-700',
    tone: 'bg-lime-100 text-lime-700', readability: 'bg-emerald-100 text-emerald-700',
    grammar: 'bg-sky-100 text-sky-700', spell: 'bg-red-100 text-red-700',
    abbreviation: 'bg-gray-100 text-gray-700', pii_mask: 'bg-yellow-100 text-yellow-700',
    lang_detect: 'bg-violet-100 text-violet-700', formality: 'bg-fuchsia-100 text-fuchsia-700',
    intent: 'bg-cyan-100 text-cyan-700', qa_generate: 'bg-slate-100 text-slate-700',
    summary_long: 'bg-green-100 text-green-700', bullet_summary: 'bg-teal-100 text-teal-700',
    headline: 'bg-blue-100 text-blue-700', description: 'bg-indigo-100 text-indigo-700',
    tag: 'bg-orange-100 text-orange-700', category: 'bg-amber-100 text-amber-700',
    rating: 'bg-yellow-100 text-yellow-700', priority: 'bg-red-100 text-red-700',
    risk: 'bg-rose-100 text-rose-700', status: 'bg-purple-100 text-purple-700',
    gender: 'bg-pink-100 text-pink-700', age_estimate: 'bg-gray-100 text-gray-700',
    location: 'bg-teal-100 text-teal-700', currency: 'bg-emerald-100 text-emerald-700',
    phone: 'bg-blue-100 text-blue-700', email: 'bg-cyan-100 text-cyan-700',
    url: 'bg-indigo-100 text-indigo-700', address: 'bg-orange-100 text-orange-700',
    date: 'bg-amber-100 text-amber-700', number: 'bg-green-100 text-green-700',
    unit_convert: 'bg-teal-100 text-teal-700', math: 'bg-blue-100 text-blue-700',
    percent: 'bg-yellow-100 text-yellow-700', average: 'bg-sky-100 text-sky-700',
    rank: 'bg-purple-100 text-purple-700', normalize: 'bg-gray-100 text-gray-700',
    dedup: 'bg-red-100 text-red-700', fill: 'bg-cyan-100 text-cyan-700',
    merge: 'bg-indigo-100 text-indigo-700', split: 'bg-orange-100 text-orange-700',
    format: 'bg-teal-100 text-teal-700', unit_extract: 'bg-emerald-100 text-emerald-700',
    json_parse: 'bg-blue-100 text-blue-700', regex_extract: 'bg-purple-100 text-purple-700',
    to_lowercase: 'bg-gray-100 text-gray-700', to_uppercase: 'bg-gray-100 text-gray-700',
    trim: 'bg-gray-100 text-gray-700', pinyin: 'bg-red-100 text-red-700',
    char_count: 'bg-blue-100 text-blue-700', word_count: 'bg-green-100 text-green-700',
    template: 'bg-indigo-100 text-indigo-700', conditional: 'bg-amber-100 text-amber-700',
    comparison: 'bg-teal-100 text-teal-700', json_build: 'bg-blue-100 text-blue-700',
    json_extract: 'bg-cyan-100 text-cyan-700', array_join: 'bg-purple-100 text-purple-700',
    array_filter: 'bg-orange-100 text-orange-700', date_diff: 'bg-amber-100 text-amber-700',
    date_format: 'bg-teal-100 text-teal-700', image_ocr: 'bg-gray-100 text-gray-700',
    image_tag: 'bg-pink-100 text-pink-700', image_scene: 'bg-violet-100 text-violet-700',
    barcode: 'bg-blue-100 text-blue-700', qrcode: 'bg-cyan-100 text-cyan-700',
  };
  return colors[type] ?? 'bg-gray-100 text-gray-700';
}
