/**
 * 标准化指标管理体系 - 指标计算引擎
 * 200+ 预置指标，覆盖 20+ 业务场景
 */

import { CellValue } from '@/lib/data-processor';

// 指标定义
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: 'kpi' | 'process' | 'composite' | 'trend' | 'custom';
  scenario: string[]; // 适用场景标签
  formula: string; // 计算公式表达式
  unit?: string; // 单位
  format?: 'number' | 'percent' | 'currency' | 'ratio'; // 显示格式
  precision?: number; // 小数位数
  thresholds?: {
    warning?: number;
    critical?: number;
    target?: number;
  };
  dependencies: string[]; // 依赖的原始字段
  createdAt: number;
  updatedAt: number;
  isPreset: boolean;
  isCustom: boolean;
  version: number;
  tags: string[];
}

// 业务场景定义 (20+)
export const BUSINESS_SCENARIOS: Record<string, { name: string; icon: string; color: string; keywords: string[] }> = {
  retail: { name: '零售/门店', icon: '🛒', color: 'orange', keywords: ['销售', '门店', '商品', '库存', '采购', '营收', '客单价'] },
  ecommerce: { name: '电商/平台', icon: '🛍️', color: 'purple', keywords: ['订单', '转化率', '流量', 'GMV', '退款', 'SKU'] },
  user_operation: { name: '用户运营', icon: '👥', color: 'blue', keywords: ['用户', '会员', 'DAU', '留存', 'ARPU', '活跃'] },
  finance: { name: '财务/成本', icon: '💰', color: 'green', keywords: ['成本', '利润', '预算', '收入', 'ROI', '支出'] },
  hr: { name: '人力/组织', icon: '👔', color: 'indigo', keywords: ['员工', '招聘', '绩效', '考勤', '人效', '编制'] },
  marketing: { name: '市场营销', icon: '📢', color: 'pink', keywords: ['营销', '推广', '广告', 'ROI', '曝光', '获客'] },
  supply_chain: { name: '供应链/库存', icon: '📦', color: 'amber', keywords: ['库存', '周转', '补货', '物流', '仓储', '配送'] },
  education: { name: '教育/培训', icon: '🎓', color: 'cyan', keywords: ['学员', '课程', '续班', '师资', '培训', '成绩'] },
  healthcare: { name: '医疗/健康', icon: '🏥', color: 'red', keywords: ['门诊', '住院', '患者', '药品', '手术', '医保'] },
  manufacturing: { name: '制造/生产', icon: '🏭', color: 'gray', keywords: ['产量', '质量', '设备', '工艺', '能耗', '良品率'] },
  logistics: { name: '物流/运输', icon: '🚚', color: 'emerald', keywords: ['配送', '时效', '签收', '运费', '车队', '线路'] },
  restaurant: { name: '餐饮/连锁', icon: '🍜', color: 'yellow', keywords: ['翻台', '客流', '菜品', '客单价', '食材', '门店'] },
  tourism: { name: '旅游/出行', icon: '✈️', color: 'sky', keywords: ['预订', '入住', '景区', '门票', '客房', '游客'] },
  realestate: { name: '地产/物业', icon: '🏗️', color: 'stone', keywords: ['楼盘', '签约', '回款', '物业', '车位', '中介'] },
  media: { name: '媒体/娱乐', icon: '🎬', color: 'fuchsia', keywords: ['播放', '会员', '时长', '互动', '内容', 'UP主'] },
  telecom: { name: '通信/运营商', icon: '📡', color: 'violet', keywords: ['用户', '流量', '套餐', '宽带', 'ARPU', '漫游'] },
  energy: { name: '能源/电力', icon: '⚡', color: 'yellow', keywords: ['发电', '用电', '负荷', '电价', '线损', '能耗'] },
  automotive: { name: '汽车/出行', icon: '🚗', color: 'slate', keywords: ['销量', '4S店', '售后', '线索', '试驾', '置换'] },
  agriculture: { name: '农业/畜牧', icon: '🌾', color: 'lime', keywords: ['产量', '出栏', '存栏', '饲料', '出栏率', '存栏量'] },
  legal: { name: '法律/咨询', icon: '⚖️', color: 'neutral', keywords: ['案件', '诉讼', '咨询', '律师', '胜诉', '收费'] },
  government: { name: '政府/公共', icon: '🏛️', color: 'rose', keywords: ['办件', '审批', '投诉', '满意', '办结', '网办'] },
  sports: { name: '体育/健身', icon: '🏃', color: 'orange', keywords: ['会员', '课时', '签到', '续费', '团课', '私教'] },
  environmental: { name: '环保/环卫', icon: '🌿', color: 'teal', keywords: ['垃圾', '分类', '保洁', '清运', '焚烧', '填埋'] },
  publishing: { name: '出版/传媒', icon: '📖', color: 'amber', keywords: ['发行', '码洋', '退货', '印数', '版税', '版权'] },
  general: { name: '通用业务', icon: '📊', color: 'gray', keywords: ['数据', '统计', '分析', '报表', '指标'] },
};

// 预置指标库 - 20+场景 × 10+指标 = 200+ 预置指标
export const PRESET_METRICS: MetricDefinition[] = [
  // ========== 零售/门店场景 (30个) ==========
  { id: 'preset_retail_gmv', name: 'GMV（成交总额）', description: '统计周期内所有订单的总金额', category: 'kpi', scenario: ['retail', 'ecommerce'], formula: 'SUM(销售额)', unit: '元', format: 'currency', precision: 2, dependencies: ['销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['销售', '核心指标'] },
  { id: 'preset_retail_avg_order_value', name: '客单价', description: '平均每个订单的金额', category: 'kpi', scenario: ['retail', 'ecommerce'], formula: 'SUM(销售额) / COUNT(订单ID)', unit: '元', format: 'currency', precision: 2, dependencies: ['销售额', '订单ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['销售', '核心指标'] },
  { id: 'preset_retail_conversion_rate', name: '转化率', description: '成交订单数占总访问量的比例', category: 'process', scenario: ['retail', 'ecommerce', 'marketing'], formula: 'COUNT(订单ID) / COUNT(访问量) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 2, critical: 1, target: 5 }, dependencies: ['订单ID', '访问量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['转化', '过程指标'] },
  { id: 'preset_retail_gross_margin', name: '毛利率', description: '毛利占销售额的比例', category: 'kpi', scenario: ['retail', 'ecommerce', 'finance'], formula: '(SUM(销售额) - SUM(成本)) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 15, critical: 10, target: 30 }, dependencies: ['销售额', '成本'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['盈利', '核心指标'] },
  { id: 'preset_retail_inventory_turnover', name: '库存周转率', description: '销售成本与平均库存的比值', category: 'process', scenario: ['retail', 'supply_chain'], formula: 'SUM(销售成本) / AVG(库存金额)', unit: '次', format: 'number', precision: 2, dependencies: ['销售成本', '库存金额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['库存', '供应链'] },
  { id: 'preset_retail_order_count', name: '订单数量', description: '统计周期内的订单总数', category: 'kpi', scenario: ['retail', 'ecommerce'], formula: 'COUNT(订单ID)', unit: '单', format: 'number', precision: 0, dependencies: ['订单ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['销售', '订单'] },
  { id: 'preset_retail_new_customer_rate', name: '新客占比', description: '新客户订单占总订单的比例', category: 'process', scenario: ['retail', 'ecommerce', 'marketing'], formula: 'COUNT(新客户订单) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['新客户订单', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['客户', '获客'] },
  { id: 'preset_retail_repurchase_rate', name: '复购率', description: '有复购的客户占总客户的比例', category: 'kpi', scenario: ['retail', 'ecommerce'], formula: 'COUNT(复购客户) / COUNT(总客户) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 20, critical: 10, target: 40 }, dependencies: ['复购客户', '总客户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['客户', '留存'] },
  { id: 'preset_retail_refund_rate', name: '退款率', description: '退款订单占总订单的比例', category: 'process', scenario: ['retail', 'ecommerce'], formula: 'SUM(退款金额) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 5, critical: 10, target: 2 }, dependencies: ['退款金额', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['售后', '质量'] },
  { id: 'preset_retail_avg_sku', name: '品单价', description: '平均每个SKU的销售额', category: 'process', scenario: ['retail', 'supply_chain'], formula: 'SUM(销售额) / COUNT(SKU)', unit: '元', format: 'currency', precision: 2, dependencies: ['销售额', 'SKU'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['商品', '分析'] },
  { id: 'preset_retail_sell_through', name: '售罄率', description: '已售数量占总备货量的比例', category: 'process', scenario: ['retail', 'supply_chain'], formula: 'SUM(已售数量) / SUM(备货数量) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['已售数量', '备货数量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['商品', '库存'] },
  { id: 'preset_retail_discount_rate', name: '折扣率', description: '平均折扣力度', category: 'process', scenario: ['retail', 'ecommerce'], formula: 'AVG(折扣)', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 70, critical: 50, target: 100 }, dependencies: ['折扣'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['促销', '价格'] },
  { id: 'preset_retail_sku_count', name: 'SKU动销率', description: '有销售的SKU占总SKU的比例', category: 'process', scenario: ['retail', 'supply_chain'], formula: 'COUNT(有销售SKU) / COUNT(总SKU) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['有销售SKU', '总SKU'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['商品', '动销'] },
  { id: 'preset_retail_store_traffic', name: '进店客流', description: '统计周期内的进店人数', category: 'kpi', scenario: ['retail'], formula: 'SUM(进店人数)', unit: '人', format: 'number', precision: 0, dependencies: ['进店人数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['客流', '门店'] },
  { id: 'preset_retail_basket_size', name: '客件数', description: '平均每个订单的商品件数', category: 'process', scenario: ['retail', 'ecommerce'], formula: 'SUM(商品件数) / COUNT(订单ID)', unit: '件', format: 'number', precision: 1, dependencies: ['商品件数', '订单ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['订单', '深度'] },
  { id: 'preset_retail_rfm_score', name: 'RFM得分', description: '客户最近购买、购买频率、消费金额综合评分', category: 'composite', scenario: ['retail', 'user_operation'], formula: 'R(最近) + F(频率) + M(金额)', unit: '分', format: 'number', precision: 0, dependencies: ['最近购买', '购买频率', '消费金额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['客户', '价值'] },
  { id: 'preset_retail_channel_mix_online', name: '线上渠道占比', description: '线上订单占总订单的比例', category: 'process', scenario: ['retail', 'ecommerce'], formula: 'COUNT(线上订单) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['线上订单', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['渠道', '线上'] },
  { id: 'preset_retail_channel_mix_offline', name: '线下渠道占比', description: '线下订单占总订单的比例', category: 'process', scenario: ['retail'], formula: 'COUNT(线下订单) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['线下订单', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['渠道', '线下'] },
  { id: 'preset_retail_category_sales_top1', name: '品类销售冠军', description: '销售额最高的品类', category: 'kpi', scenario: ['retail'], formula: 'MAX(品类销售额)', unit: '元', format: 'currency', precision: 2, dependencies: ['品类销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['品类', '排名'] },
  { id: 'preset_retail_inventory_days', name: '库存天数', description: '按当前销售速度的库存可销售天数', category: 'process', scenario: ['retail', 'supply_chain'], formula: '库存金额 / (日均销售额)', unit: '天', format: 'number', precision: 1, dependencies: ['库存金额', '日均销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['库存', '周转'] },
  { id: 'preset_retail_coupon_usage', name: '优惠券使用率', description: '使用优惠券的订单占总订单的比例', category: 'process', scenario: ['retail', 'marketing'], formula: 'COUNT(使用优惠券订单) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['使用优惠券订单', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['促销', '优惠券'] },
  { id: 'preset_retail_coupon_cost', name: '券成本率', description: '优惠券优惠金额占销售额的比例', category: 'process', scenario: ['retail', 'marketing'], formula: 'SUM(券优惠金额) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['券优惠金额', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['促销', '成本'] },
  { id: 'preset_retail_promotion_roi', name: '促销ROI', description: '促销活动带来的销售额与投入的比值', category: 'kpi', scenario: ['retail', 'marketing'], formula: 'SUM(促销带来销售) / SUM(促销投入)', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 2, critical: 1, target: 5 }, dependencies: ['促销带来销售', '促销投入'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['促销', 'ROI'] },
  { id: 'preset_retail_net_margin', name: '净利润率', description: '净利润占销售额的比例', category: 'kpi', scenario: ['retail', 'finance'], formula: 'SUM(净利润) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 5, critical: 2, target: 15 }, dependencies: ['净利润', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['盈利', '财务'] },
  { id: 'preset_retail_same_store_growth', name: '同店增长率', description: '可比门店销售额同比增长率', category: 'trend', scenario: ['retail'], formula: '(本期同店销售 - 上期同店销售) / 上期同店销售 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['本期同店销售', '上期同店销售'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['增长', '同店'] },
  { id: 'preset_retail_peak_hour_sales', name: '峰时段销售额', description: '销售高峰时段的销售额', category: 'process', scenario: ['retail'], formula: 'SUM(峰时段销售)', unit: '元', format: 'currency', precision: 2, dependencies: ['峰时段销售'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['时段', '分析'] },
  { id: 'preset_retail_cash_flow', name: '现金比率', description: '现金及等价物与流动负债的比值', category: 'kpi', scenario: ['retail', 'finance'], formula: '现金及等价物 / 流动负债 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['现金及等价物', '流动负债'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['财务', '偿债'] },
  { id: 'preset_retail_debt_ratio', name: '资产负债率', description: '负债总额与资产总额的比值', category: 'kpi', scenario: ['retail', 'finance'], formula: '负债总额 / 资产总额 * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 70, critical: 85, target: 50 }, dependencies: ['负债总额', '资产总额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['财务', '杠杆'] },
  { id: 'preset_retail_collection_days', name: '应收账款周转天数', description: '收回应收账款的平均天数', category: 'process', scenario: ['retail', 'finance'], formula: '应收账款 / (销售额 / 365)', unit: '天', format: 'number', precision: 1, dependencies: ['应收账款', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['财务', '周转'] },
  { id: 'preset_retail_payment_days', name: '应付账款周转天数', description: '支付应付账款的平均天数', category: 'process', scenario: ['retail', 'finance'], formula: '应付账款 / (采购额 / 365)', unit: '天', format: 'number', precision: 1, dependencies: ['应付账款', '采购额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['财务', '周转'] },

  // ========== 电商/平台场景 (25个) ==========
  { id: 'preset_ecomm_gmv', name: '电商GMV', description: '平台成交总额', category: 'kpi', scenario: ['ecommerce'], formula: 'SUM(成交金额)', unit: '元', format: 'currency', precision: 2, dependencies: ['成交金额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '核心'] },
  { id: 'preset_ecomm_gmv_yoy', name: 'GMV同比增长率', description: '本期GMV相对去年同期的增长', category: 'trend', scenario: ['ecommerce'], formula: '(本期GMV - 去年同期GMV) / 去年同期GMV * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['本期GMV', '去年同期GMV'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '增长'] },
  { id: 'preset_ecomm_pay_rate', name: '支付转化率', description: '完成支付的订单占下单订单的比例', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(已支付订单) / COUNT(已下单订单) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 60, critical: 50, target: 80 }, dependencies: ['已支付订单', '已下单订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '转化'] },
  { id: 'preset_ecomm_cart_rate', name: '加购率', description: '加购人数占访客数的比例', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(加购人数) / COUNT(访客数) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['加购人数', '访客数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '行为'] },
  { id: 'preset_ecomm_browse_pv', name: '浏览量PV', description: '页面总浏览次数', category: 'kpi', scenario: ['ecommerce'], formula: 'SUM(PV)', unit: '次', format: 'number', precision: 0, dependencies: ['PV'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '流量'] },
  { id: 'preset_ecomm_browse_uv', name: '访客数UV', description: '独立访客数', category: 'kpi', scenario: ['ecommerce'], formula: 'COUNT_DISTINCT(访客ID)', unit: '人', format: 'number', precision: 0, dependencies: ['访客ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '流量'] },
  { id: 'preset_ecomm_avg_browse', name: '人均浏览量', description: '每个访客的平均浏览页面数', category: 'process', scenario: ['ecommerce'], formula: 'SUM(PV) / COUNT_DISTINCT(访客ID)', unit: '页', format: 'number', precision: 1, dependencies: ['PV', '访客ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '深度'] },
  { id: 'preset_ecomm_bounce_rate', name: '跳失率', description: '只浏览一页就离开的访客比例', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(跳出) / COUNT(总访客) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 70, critical: 85, target: 50 }, dependencies: ['跳出', '总访客'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '质量'] },
  { id: 'preset_ecomm_refund_rate', name: '退款率', description: '退款金额占销售额的比例', category: 'process', scenario: ['ecommerce'], formula: 'SUM(退款金额) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 5, critical: 10, target: 2 }, dependencies: ['退款金额', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '售后'] },
  { id: 'preset_ecomm_refund_reason_top1', name: '退款原因TOP1', description: '最主要的退款原因', category: 'process', scenario: ['ecommerce'], formula: 'MAX(退款原因)', unit: '', format: 'number', precision: 0, dependencies: ['退款原因'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '分析'] },
  { id: 'preset_ecomm_sku_count', name: '动销SKU数', description: '有销售的SKU数量', category: 'kpi', scenario: ['ecommerce'], formula: 'COUNT(有销售SKU)', unit: '个', format: 'number', precision: 0, dependencies: ['有销售SKU'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '商品'] },
  { id: 'preset_ecomm_cpc_cost', name: 'CPC广告成本', description: '按点击付费的广告总成本', category: 'process', scenario: ['ecommerce', 'marketing'], formula: 'SUM(CPC成本)', unit: '元', format: 'currency', precision: 2, dependencies: ['CPC成本'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '推广'] },
  { id: 'preset_ecomm_cpc_roi', name: 'CPC广告ROI', description: 'CPC广告带来的销售额与成本的比值', category: 'kpi', scenario: ['ecommerce', 'marketing'], formula: 'SUM(广告带来销售) / SUM(CPC成本)', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 2, critical: 1, target: 5 }, dependencies: ['广告带来销售', 'CPC成本'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '推广'] },
  { id: 'preset_ecomm_cpm', name: '千次展现成本', description: '每千次广告展现的成本', category: 'process', scenario: ['ecommerce', 'marketing'], formula: 'SUM(CPC成本) / SUM(展现量) * 1000', unit: '元', format: 'currency', precision: 2, dependencies: ['CPC成本', '展现量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '推广'] },
  { id: 'preset_ecomm_cpc_ctr', name: '点击率CTR', description: '广告点击次数占展现次数的比例', category: 'process', scenario: ['ecommerce', 'marketing'], formula: 'SUM(点击次数) / SUM(展现次数) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['点击次数', '展现次数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '推广'] },
  { id: 'preset_ecomm_new_vs_old', name: '新客占比', description: '新客户订单占比', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(新客订单) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['新客订单', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '客户'] },
  { id: 'preset_ecomm_member_rate', name: '会员转化率', description: '注册用户占总访客的比例', category: 'process', scenario: ['ecommerce', 'user_operation'], formula: 'COUNT(新增会员) / COUNT(访客数) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['新增会员', '访客数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '会员'] },
  { id: 'preset_ecomm_active_rate', name: '活跃率', description: '活跃用户占注册用户的比例', category: 'process', scenario: ['ecommerce', 'user_operation'], formula: 'COUNT(活跃用户) / COUNT(注册用户) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['活跃用户', '注册用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '活跃'] },
  { id: 'preset_ecomm_avg_order_freq', name: '平均订单频次', description: '有消费用户平均订单数', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(总订单) / COUNT(消费用户)', unit: '单', format: 'number', precision: 2, dependencies: ['总订单', '消费用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '频次'] },
  { id: 'preset_ecomm_category_gmv', name: '品类GMV结构', description: '各品类GMV占比', category: 'process', scenario: ['ecommerce'], formula: 'SUM(品类GMV) / SUM(总GMV) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['品类GMV', '总GMV'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '品类'] },
  { id: 'preset_ecomm_area_top', name: '区域销售TOP', description: '销售占比最高的区域', category: 'process', scenario: ['ecommerce'], formula: 'MAX(区域销售占比)', unit: '%', format: 'percent', precision: 2, dependencies: ['区域销售占比'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '区域'] },
  { id: 'preset_ecomm_search_rate', name: '搜索利用率', description: '使用搜索功能的访客比例', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(搜索访客) / COUNT(总访客) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['搜索访客', '总访客'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '搜索'] },
  { id: 'preset_ecomm_recommend_ctr', name: '推荐点击率', description: '推荐位点击率', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(推荐点击) / COUNT(推荐曝光) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['推荐点击', '推荐曝光'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '推荐'] },
  { id: 'preset_ecomm_seckill_rate', name: '秒杀转化率', description: '秒杀商品下单转化率', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(秒杀订单) / COUNT(秒杀浏览) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['秒杀订单', '秒杀浏览'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '秒杀'] },
  { id: 'preset_ecomm_group_buy_rate', name: '拼团成功率', description: '拼团成功订单占开团订单的比例', category: 'process', scenario: ['ecommerce'], formula: 'COUNT(拼团成功) / COUNT(开团数) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['拼团成功', '开团数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['电商', '拼团'] },

  // ========== 用户运营场景 (20个) ==========
  { id: 'preset_user_dau', name: 'DAU（日活跃用户）', description: '每日活跃用户数', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT_DISTINCT(用户ID)', unit: '人', format: 'number', precision: 0, dependencies: ['用户ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['用户', '核心'] },
  { id: 'preset_user_retention_d1', name: '次日留存率', description: '新增用户次日仍活跃的比例', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT(D+1留存) / COUNT(新增用户) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 30, critical: 20, target: 50 }, dependencies: ['D+1留存', '新增用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['留存', '核心'] },
  { id: 'preset_user_retention_d7', name: '7日留存率', description: '新增用户7天后仍活跃的比例', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT(D+7留存) / COUNT(新增用户) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 20, critical: 10, target: 40 }, dependencies: ['D+7留存', '新增用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['留存', '核心'] },
  { id: 'preset_user_retention_d30', name: '30日留存率', description: '新增用户30天后仍活跃的比例', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT(D+30留存) / COUNT(新增用户) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 10, critical: 5, target: 20 }, dependencies: ['D+30留存', '新增用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['留存', '核心'] },
  { id: 'preset_user_arpu', name: 'ARPU（每用户平均收入）', description: '总收入除以活跃用户数', category: 'kpi', scenario: ['user_operation', 'ecommerce'], formula: 'SUM(收入) / COUNT_DISTINCT(用户ID)', unit: '元', format: 'currency', precision: 2, dependencies: ['收入', '用户ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['收入', '用户价值'] },
  { id: 'preset_user_arpu_daily', name: '日ARPU', description: '每日每用户平均收入', category: 'kpi', scenario: ['user_operation'], formula: 'SUM(日收入) / COUNT_DISTINCT(日活跃用户)', unit: '元', format: 'currency', precision: 2, dependencies: ['日收入', '日活跃用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['收入', '用户价值'] },
  { id: 'preset_user_ltv', name: 'LTV（用户生命周期价值）', description: '用户在整个生命周期内贡献的总价值', category: 'kpi', scenario: ['user_operation', 'marketing'], formula: 'ARPU × 平均生命周期(月)', unit: '元', format: 'currency', precision: 2, dependencies: ['ARPU', '平均生命周期'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['用户', '价值'] },
  { id: 'preset_user_mau', name: 'MAU（月活跃用户）', description: '月活跃用户数', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT_DISTINCT(月活跃用户)', unit: '人', format: 'number', precision: 0, dependencies: ['月活跃用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['用户', '规模'] },
  { id: 'preset_user_dau_mau_ratio', name: 'DAU/MAU比值', description: '用户活跃度指标', category: 'process', scenario: ['user_operation'], formula: 'DAU / MAU * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['DAU', 'MAU'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['活跃', '粘性'] },
  { id: 'preset_user_new_add', name: '新增用户数', description: '每日新增注册用户', category: 'kpi', scenario: ['user_operation', 'marketing'], formula: 'COUNT(新增用户)', unit: '人', format: 'number', precision: 0, dependencies: ['新增用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['用户', '增长'] },
  { id: 'preset_user_churn_rate', name: '用户流失率', description: '流失用户占上期用户的比例', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT(流失用户) / COUNT(上期用户) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 10, critical: 20, target: 5 }, dependencies: ['流失用户', '上期用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['流失', '留存'] },
  { id: 'preset_user_session_count', name: '会话次数', description: '用户发起会话的总次数', category: 'process', scenario: ['user_operation'], formula: 'SUM(会话次数)', unit: '次', format: 'number', precision: 0, dependencies: ['会话次数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['行为', '活跃'] },
  { id: 'preset_user_avg_session_duration', name: '平均会话时长', description: '每次会话的平均时长', category: 'process', scenario: ['user_operation'], formula: 'SUM(会话时长) / COUNT(会话次数)', unit: '秒', format: 'number', precision: 0, dependencies: ['会话时长', '会话次数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['行为', '深度'] },
  { id: 'preset_user_feature_usage', name: '功能使用率', description: '使用某功能的用户占比', category: 'process', scenario: ['user_operation'], formula: 'COUNT(使用功能用户) / COUNT(活跃用户) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['使用功能用户', '活跃用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['功能', '使用'] },
  { id: 'preset_user_pay_user_count', name: '付费用户数', description: '有付费行为的用户数', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT_DISTINCT(付费用户)', unit: '人', format: 'number', precision: 0, dependencies: ['付费用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['付费', '核心'] },
  { id: 'preset_user_pay_rate', name: '付费率', description: '付费用户占活跃用户的比例', category: 'kpi', scenario: ['user_operation'], formula: 'COUNT(付费用户) / COUNT(活跃用户) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 3, critical: 1, target: 10 }, dependencies: ['付费用户', '活跃用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['付费', '转化'] },
  { id: 'preset_user_avg_pay', name: 'ARPP（每付费用户平均收入）', description: '付费用户的平均收入', category: 'kpi', scenario: ['user_operation'], formula: 'SUM(收入) / COUNT_DISTINCT(付费用户)', unit: '元', format: 'currency', precision: 2, dependencies: ['收入', '付费用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['付费', '价值'] },
  { id: 'preset_user_upgrade_rate', name: '升级率', description: '从低等级升级到高等级的用户比例', category: 'process', scenario: ['user_operation'], formula: 'COUNT(升级用户) / COUNT(总用户) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['升级用户', '总用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['会员', '升级'] },
  { id: 'preset_user_push_open_rate', name: '推送打开率', description: '消息推送的打开率', category: 'process', scenario: ['user_operation', 'marketing'], formula: 'COUNT(打开消息) / COUNT(发送消息) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['打开消息', '发送消息'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['推送', '触达'] },
  { id: 'preset_user_share_rate', name: '分享率', description: '发起分享的用户比例', category: 'process', scenario: ['user_operation'], formula: 'COUNT(分享用户) / COUNT(活跃用户) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['分享用户', '活跃用户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['传播', '分享'] },

  // ========== 财务/成本场景 (15个) ==========
  { id: 'preset_finance_roi', name: 'ROI（投资回报率）', description: '净利润与投资成本的比值', category: 'kpi', scenario: ['finance', 'marketing'], formula: '(SUM(收入) - SUM(成本)) / SUM(成本) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 50, critical: 0, target: 100 }, dependencies: ['收入', '成本'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['投资', '核心'] },
  { id: 'preset_finance_profit_margin', name: '净利率', description: '净利润占收入的比例', category: 'kpi', scenario: ['finance', 'retail'], formula: 'SUM(净利润) / SUM(收入) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 5, critical: 0, target: 15 }, dependencies: ['净利润', '收入'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['盈利', '财务'] },
  { id: 'preset_finance_cost_ratio', name: '成本占比', description: '各项成本占总收入的比例', category: 'process', scenario: ['finance'], formula: 'SUM(成本) / SUM(收入) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 80, critical: 90, target: 60 }, dependencies: ['成本', '收入'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['成本', '财务'] },
  { id: 'preset_finance_ebitda', name: 'EBITDA', description: '息税折旧摊销前利润', category: 'kpi', scenario: ['finance'], formula: '净利润 + 所得税 + 利息支出 + 折旧摊销', unit: '元', format: 'currency', precision: 2, dependencies: ['净利润', '所得税', '利息支出', '折旧摊销'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['盈利', '财务'] },
  { id: 'preset_finance_ebitda_margin', name: 'EBITDA利润率', description: 'EBITDA占收入的比例', category: 'kpi', scenario: ['finance'], formula: 'EBITDA / 收入 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['EBITDA', '收入'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['盈利', '效率'] },
  { id: 'preset_finance_current_ratio', name: '流动比率', description: '流动资产与流动负债的比值', category: 'kpi', scenario: ['finance'], formula: '流动资产 / 流动负债', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 1.5, critical: 1, target: 2 }, dependencies: ['流动资产', '流动负债'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['偿债', '财务'] },
  { id: 'preset_finance_quick_ratio', name: '速动比率', description: '速动资产与流动负债的比值', category: 'kpi', scenario: ['finance'], formula: '(流动资产 - 存货) / 流动负债', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 1, critical: 0.5, target: 1.5 }, dependencies: ['流动资产', '存货', '流动负债'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['偿债', '财务'] },
  { id: 'preset_finance_turnover_assets', name: '资产周转率', description: '销售收入与平均资产的比值', category: 'process', scenario: ['finance'], formula: '销售收入 / 平均资产总额', unit: '次', format: 'number', precision: 2, dependencies: ['销售收入', '平均资产总额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['周转', '效率'] },
  { id: 'preset_finance_turnover_receivable', name: '应收账款周转率', description: '赊销收入与平均应收账款的比值', category: 'process', scenario: ['finance'], formula: '赊销收入 / 平均应收账款', unit: '次', format: 'number', precision: 2, dependencies: ['赊销收入', '平均应收账款'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['周转', '财务'] },
  { id: 'preset_finance_turnover_inventory', name: '存货周转率', description: '销售成本与平均存货的比值', category: 'process', scenario: ['finance', 'retail'], formula: '销售成本 / 平均存货', unit: '次', format: 'number', precision: 2, dependencies: ['销售成本', '平均存货'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['周转', '库存'] },
  { id: 'preset_finance_debt_equity', name: '产权比率', description: '负债总额与所有者权益的比值', category: 'kpi', scenario: ['finance'], formula: '负债总额 / 所有者权益', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 2, critical: 3, target: 1 }, dependencies: ['负债总额', '所有者权益'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['杠杆', '财务'] },
  { id: 'preset_finance_interest_coverage', name: '利息保障倍数', description: 'EBIT与利息费用的比值', category: 'kpi', scenario: ['finance'], formula: 'EBIT / 利息费用', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 3, critical: 1, target: 5 }, dependencies: ['EBIT', '利息费用'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['偿债', '财务'] },
  { id: 'preset_finance_gross_margin', name: '毛利率', description: '毛利占销售收入的比例', category: 'kpi', scenario: ['finance', 'retail'], formula: '(销售收入 - 销售成本) / 销售收入 * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 20, critical: 10, target: 40 }, dependencies: ['销售收入', '销售成本'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['盈利', '毛利'] },
  { id: 'preset_finance_opex_ratio', name: '运营费用率', description: '运营费用占收入的比例', category: 'process', scenario: ['finance'], formula: '运营费用 / 收入 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['运营费用', '收入'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['费用', '效率'] },
  { id: 'preset_finance_free_cash_flow', name: '自由现金流', description: '经营现金流减去资本支出', category: 'kpi', scenario: ['finance'], formula: '经营现金流 - 资本支出', unit: '元', format: 'currency', precision: 2, dependencies: ['经营现金流', '资本支出'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['现金流', '财务'] },

  // ========== 人力资源场景 (15个) ==========
  { id: 'preset_hr_headcount', name: '在职人数', description: '当前在职员工总数', category: 'kpi', scenario: ['hr'], formula: 'COUNT(员工ID)', unit: '人', format: 'number', precision: 0, dependencies: ['员工ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['人力', '核心'] },
  { id: 'preset_hr_turnover_rate', name: '员工流失率', description: '离职员工占在职员工的比例', category: 'kpi', scenario: ['hr'], formula: 'COUNT(离职员工) / COUNT(在职员工) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 15, critical: 25, target: 5 }, dependencies: ['离职员工', '在职员工'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['人力', '流失'] },
  { id: 'preset_hr_per_capita_output', name: '人均产出', description: '总收入除以在职员工数', category: 'kpi', scenario: ['hr', 'finance'], formula: 'SUM(收入) / COUNT(员工ID)', unit: '元', format: 'currency', precision: 2, dependencies: ['收入', '员工ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['人力', '效率'] },
  { id: 'preset_hr_per_capita_profit', name: '人均利润', description: '净利润除以在职员工数', category: 'kpi', scenario: ['hr', 'finance'], formula: 'SUM(净利润) / COUNT(员工ID)', unit: '元', format: 'currency', precision: 2, dependencies: ['净利润', '员工ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['人力', '效率'] },
  { id: 'preset_hr_salary_cost_ratio', name: '人力成本占比', description: '工资总额占总成本的比例', category: 'process', scenario: ['hr'], formula: 'SUM(工资总额) / SUM(总成本) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 30, critical: 50, target: 20 }, dependencies: ['工资总额', '总成本'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['人力', '成本'] },
  { id: 'preset_hr_avg_salary', name: '人均工资', description: '工资总额除以员工人数', category: 'kpi', scenario: ['hr'], formula: 'SUM(工资总额) / COUNT(员工ID)', unit: '元', format: 'currency', precision: 2, dependencies: ['工资总额', '员工ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['人力', '薪酬'] },
  { id: 'preset_hr_recruit_time', name: '平均招聘周期', description: '从发布职位到入职的平均天数', category: 'process', scenario: ['hr'], formula: 'AVG(招聘周期)', unit: '天', format: 'number', precision: 0, thresholds: { warning: 45, critical: 60, target: 30 }, dependencies: ['招聘周期'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['招聘', '效率'] },
  { id: 'preset_hr_offer_accept_rate', name: 'Offer接受率', description: '接受Offer的人数占发放数量的比例', category: 'process', scenario: ['hr'], formula: 'COUNT(接受Offer) / COUNT(发放Offer) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 70, critical: 60, target: 90 }, dependencies: ['接受Offer', '发放Offer'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['招聘', '效率'] },
  { id: 'preset_hr_performance_a_rate', name: 'A绩效占比', description: '获得A绩效评级的员工比例', category: 'process', scenario: ['hr'], formula: 'COUNT(A级绩效) / COUNT(总人数) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['A级绩效', '总人数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['绩效', '分布'] },
  { id: 'preset_hr_absenteeism_rate', name: '缺勤率', description: '缺勤天数占总应出勤天数的比例', category: 'process', scenario: ['hr'], formula: 'SUM(缺勤天数) / SUM(应出勤天数) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 5, critical: 10, target: 2 }, dependencies: ['缺勤天数', '应出勤天数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['考勤', '出勤'] },
  { id: 'preset_hr_training_hours', name: '人均培训时长', description: '培训总时长除以员工人数', category: 'process', scenario: ['hr'], formula: 'SUM(培训时长) / COUNT(员工ID)', unit: '小时', format: 'number', precision: 1, dependencies: ['培训时长', '员工ID'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['培训', '发展'] },
  { id: 'preset_hr_internal_promote_rate', name: '内部晋升率', description: '内部晋升人数占晋升总数的比例', category: 'process', scenario: ['hr'], formula: 'COUNT(内部晋升) / COUNT(总晋升) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['内部晋升', '总晋升'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['晋升', '发展'] },
  { id: 'preset_hr_new_hire_retention', name: '新员工留存率', description: '入职一年后仍在职的新员工比例', category: 'process', scenario: ['hr'], formula: 'COUNT(一年后在职) / COUNT(新入职) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['一年后在职', '新入职'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['招聘', '留存'] },
  { id: 'preset_hr_salary_growth', name: '薪酬增长率', description: '本期平均薪酬相对上期的增长', category: 'trend', scenario: ['hr'], formula: '(本期平均薪酬 - 上期平均薪酬) / 上期平均薪酬 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['本期平均薪酬', '上期平均薪酬'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['薪酬', '增长'] },
  { id: 'preset_hr_labor_productivity', name: '劳动生产率', description: '总产出除以劳动投入', category: 'kpi', scenario: ['hr', 'manufacturing'], formula: '总产出 / 劳动投入', unit: '元/人', format: 'number', precision: 2, dependencies: ['总产出', '劳动投入'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['效率', '生产'] },

  // ========== 市场营销场景 (15个) ==========
  { id: 'preset_marketing_mql_count', name: 'MQL数量', description: '市场认可线索数量', category: 'kpi', scenario: ['marketing'], formula: 'COUNT(MQL)', unit: '条', format: 'number', precision: 0, dependencies: ['MQL'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '线索'] },
  { id: 'preset_marketing_mql_to_sql', name: 'MQL转SQL率', description: '市场线索转为销售线索的比例', category: 'process', scenario: ['marketing'], formula: 'COUNT(SQL) / COUNT(MQL) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 30, critical: 20, target: 50 }, dependencies: ['SQL', 'MQL'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '转化'] },
  { id: 'preset_marketing_sql_to_opportunity', name: 'SQL转机会率', description: '销售线索转为商机的比例', category: 'process', scenario: ['marketing'], formula: 'COUNT(商机) / COUNT(SQL) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['商机', 'SQL'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '转化'] },
  { id: 'preset_marketing_opportunity_to_close', name: '商机赢单率', description: '商机最终成交的比例', category: 'kpi', scenario: ['marketing'], formula: 'COUNT(赢单) / COUNT(商机) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 30, critical: 20, target: 50 }, dependencies: ['赢单', '商机'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '成交'] },
  { id: 'preset_marketing_campaign_roi', name: '营销活动ROI', description: '营销活动带来的收入与投入的比值', category: 'kpi', scenario: ['marketing'], formula: 'SUM(活动带来收入) / SUM(活动成本)', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 2, critical: 1, target: 5 }, dependencies: ['活动带来收入', '活动成本'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', 'ROI'] },
  { id: 'preset_marketing_cac', name: 'CAC（获客成本）', description: '获取一个新客户的平均成本', category: 'kpi', scenario: ['marketing', 'user_operation'], formula: 'SUM(营销成本) / COUNT(新客户)', unit: '元', format: 'currency', precision: 2, dependencies: ['营销成本', '新客户'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '获客'] },
  { id: 'preset_marketing_ltv_cac_ratio', name: 'LTV/CAC比值', description: '用户生命周期价值与获客成本的比值', category: 'composite', scenario: ['marketing', 'user_operation'], formula: 'LTV / CAC', unit: '倍', format: 'number', precision: 2, thresholds: { warning: 3, critical: 1, target: 5 }, dependencies: ['LTV', 'CAC'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '价值'] },
  { id: 'preset_marketing_impression', name: '广告曝光量', description: '广告展示的总次数', category: 'kpi', scenario: ['marketing'], formula: 'SUM(曝光次数)', unit: '次', format: 'number', precision: 0, dependencies: ['曝光次数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '投放'] },
  { id: 'preset_marketing_click', name: '广告点击量', description: '广告被点击的总次数', category: 'kpi', scenario: ['marketing'], formula: 'SUM(点击次数)', unit: '次', format: 'number', precision: 0, dependencies: ['点击次数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '投放'] },
  { id: 'preset_marketing_ctr', name: '点击率CTR', description: '点击次数占曝光次数的比例', category: 'process', scenario: ['marketing'], formula: 'SUM(点击次数) / SUM(曝光次数) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['点击次数', '曝光次数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '效果'] },
  { id: 'preset_marketing_cpc', name: '点击成本CPC', description: '每获得一次点击的平均成本', category: 'process', scenario: ['marketing'], formula: 'SUM(广告成本) / SUM(点击次数)', unit: '元', format: 'currency', precision: 2, dependencies: ['广告成本', '点击次数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '成本'] },
  { id: 'preset_marketing_cpa', name: '行动成本CPA', description: '每获得一次转化的平均成本', category: 'process', scenario: ['marketing'], formula: 'SUM(广告成本) / COUNT(转化)', unit: '元', format: 'currency', precision: 2, dependencies: ['广告成本', '转化'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '成本'] },
  { id: 'preset_marketing_reach', name: '触达率', description: '广告触达人数占目标人群的比例', category: 'process', scenario: ['marketing'], formula: 'COUNT(触达人数) / COUNT(目标人群) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['触达人数', '目标人群'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '覆盖'] },
  { id: 'preset_marketing_frequency', name: '触达频次', description: '广告对同一人的平均展示次数', category: 'process', scenario: ['marketing'], formula: 'SUM(曝光次数) / COUNT(触达人数)', unit: '次', format: 'number', precision: 1, dependencies: ['曝光次数', '触达人数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['营销', '频次'] },
  { id: 'preset_marketing_brand_share', name: '品牌份额', description: '品牌声量占行业总量的比例', category: 'process', scenario: ['marketing'], formula: '品牌声量 / 行业声量 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['品牌声量', '行业声量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['品牌', '份额'] },

  // ========== 供应链/库存场景 (10个) ==========
  { id: 'preset_supply_inventory_turnover', name: '库存周转率', description: '销售成本与平均库存的比值', category: 'process', scenario: ['supply_chain'], formula: 'SUM(销售成本) / AVG(平均库存)', unit: '次', format: 'number', precision: 2, dependencies: ['销售成本', '平均库存'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['库存', '周转'] },
  { id: 'preset_supply_inventory_days', name: '库存周转天数', description: '库存平均停留的天数', category: 'process', scenario: ['supply_chain'], formula: '365 / 库存周转率', unit: '天', format: 'number', precision: 1, dependencies: ['库存周转率'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['库存', '周转'] },
  { id: 'preset_supply_stockout_rate', name: '缺货率', description: '缺货SKU数占在售SKU总数的比例', category: 'process', scenario: ['supply_chain'], formula: 'COUNT(缺货SKU) / COUNT(在售SKU) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 5, critical: 10, target: 2 }, dependencies: ['缺货SKU', '在售SKU'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['库存', '缺货'] },
  { id: 'preset_supply_order_fill_rate', name: '订单满足率', description: '现货订单占总订单的比例', category: 'kpi', scenario: ['supply_chain'], formula: 'COUNT(现货订单) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 90, critical: 80, target: 98 }, dependencies: ['现货订单', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['订单', '满足'] },
  { id: 'preset_supply_lead_time', name: '采购交期', description: '从下单到收货的平均天数', category: 'process', scenario: ['supply_chain'], formula: 'AVG(交期天数)', unit: '天', format: 'number', precision: 1, dependencies: ['交期天数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['采购', '交期'] },
  { id: 'preset_supply_safety_stock', name: '安全库存达标率', description: '实际库存达到安全库存的SKU比例', category: 'process', scenario: ['supply_chain'], formula: 'COUNT(达标SKU) / COUNT(总SKU) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['达标SKU', '总SKU'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['库存', '安全'] },
  { id: 'preset_supply_inbound_accuracy', name: '入库准确率', description: '准确入库的SKU数占总入库数的比例', category: 'process', scenario: ['supply_chain'], formula: 'COUNT(准确入库) / COUNT(总入库) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['准确入库', '总入库'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['仓储', '准确'] },
  { id: 'preset_supply_outbound_accuracy', name: '出库准确率', description: '准确出库的订单数占总出库订单的比例', category: 'process', scenario: ['supply_chain'], formula: 'COUNT(准确出库) / COUNT(总出库) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['准确出库', '总出库'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['仓储', '准确'] },
  { id: 'preset_supply_delivery_on_time', name: '准时交货率', description: '按时交货的订单占总订单的比例', category: 'kpi', scenario: ['supply_chain', 'logistics'], formula: 'COUNT(准时交货) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 90, critical: 85, target: 98 }, dependencies: ['准时交货', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['交付', '时效'] },
  { id: 'preset_supply_shipment_accuracy', name: '发货准确率', description: '正确发货的订单占总订单的比例', category: 'process', scenario: ['supply_chain'], formula: 'COUNT(正确发货) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['正确发货', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['发货', '准确'] },

  // ========== 教育/培训场景 (10个) ==========
  { id: 'preset_edu_enrollment', name: '招生人数', description: '新增报名学员数量', category: 'kpi', scenario: ['education'], formula: 'COUNT(报名学员)', unit: '人', format: 'number', precision: 0, dependencies: ['报名学员'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '招生'] },
  { id: 'preset_edu_renewal_rate', name: '续班率', description: '续班学员占应续班学员的比例', category: 'kpi', scenario: ['education'], formula: 'COUNT(续班学员) / COUNT(应续班学员) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 60, critical: 50, target: 80 }, dependencies: ['续班学员', '应续班学员'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '续费'] },
  { id: 'preset_edu_avg_score', name: '平均成绩', description: '所有学员的平均分数', category: 'kpi', scenario: ['education'], formula: 'AVG(成绩)', unit: '分', format: 'number', precision: 1, dependencies: ['成绩'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '成绩'] },
  { id: 'preset_edu_pass_rate', name: '及格率', description: '及格学员占参考学员的比例', category: 'kpi', scenario: ['education'], formula: 'COUNT(及格学员) / COUNT(参考学员) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 70, critical: 60, target: 90 }, dependencies: ['及格学员', '参考学员'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '质量'] },
  { id: 'preset_edu_excellent_rate', name: '优秀率', description: '获得优秀成绩的学员比例', category: 'process', scenario: ['education'], formula: 'COUNT(优秀学员) / COUNT(总学员) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['优秀学员', '总学员'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '质量'] },
  { id: 'preset_edu_attendance_rate', name: '出勤率', description: '实际出勤人次占应出勤人次的比例', category: 'process', scenario: ['education'], formula: 'SUM(出勤人次) / SUM(应出勤人次) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 85, critical: 80, target: 95 }, dependencies: ['出勤人次', '应出勤人次'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '考勤'] },
  { id: 'preset_edu_teacher_student_ratio', name: '师生比', description: '教师人数与学员人数的比值', category: 'process', scenario: ['education'], formula: '教师人数 / 学员人数', unit: '比1', format: 'number', precision: 2, dependencies: ['教师人数', '学员人数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '配置'] },
  { id: 'preset_edu_tuition_per_student', name: '人均学费', description: '学费总额除以学员人数', category: 'kpi', scenario: ['education'], formula: 'SUM(学费) / COUNT(学员)', unit: '元', format: 'currency', precision: 2, dependencies: ['学费', '学员'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '收入'] },
  { id: 'preset_edu_course_completion', name: '课程完成率', description: '完成课程的学员占报名学员的比例', category: 'process', scenario: ['education'], formula: 'COUNT(完成课程) / COUNT(报名课程) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['完成课程', '报名课程'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '完成'] },
  { id: 'preset_edu_satisfaction', name: '满意度', description: '学员满意度评分', category: 'process', scenario: ['education'], formula: 'AVG(满意度评分)', unit: '分', format: 'number', precision: 1, thresholds: { warning: 4, critical: 3, target: 4.8 }, dependencies: ['满意度评分'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['教育', '口碑'] },

  // ========== 医疗/健康场景 (10个) ==========
  { id: 'preset_health_outpatient_count', name: '门诊人次', description: '统计周期内的门诊就诊人数', category: 'kpi', scenario: ['healthcare'], formula: 'COUNT(门诊患者)', unit: '人次', format: 'number', precision: 0, dependencies: ['门诊患者'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '门诊'] },
  { id: 'preset_health_inpatient_count', name: '住院人次', description: '统计周期内的新入院人数', category: 'kpi', scenario: ['healthcare'], formula: 'COUNT(新入院)', unit: '人次', format: 'number', precision: 0, dependencies: ['新入院'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '住院'] },
  { id: 'preset_health_bed_occupancy', name: '床位使用率', description: '实际占用床日数占开放床日数的比例', category: 'process', scenario: ['healthcare'], formula: 'SUM(占用床日) / SUM(开放床日) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 85, critical: 95, target: 93 }, dependencies: ['占用床日', '开放床日'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '效率'] },
  { id: 'preset_health_avg_stay', name: '平均住院日', description: '患者平均住院天数', category: 'process', scenario: ['healthcare'], formula: 'SUM(住院天数) / COUNT(出院患者)', unit: '天', format: 'number', precision: 1, thresholds: { warning: 12, critical: 15, target: 8 }, dependencies: ['住院天数', '出院患者'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '效率'] },
  { id: 'preset_health_drug_ratio', name: '药占比', description: '药品收入占医疗收入的比例', category: 'process', scenario: ['healthcare'], formula: 'SUM(药品收入) / SUM(医疗收入) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 40, critical: 50, target: 30 }, dependencies: ['药品收入', '医疗收入'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '控费'] },
  { id: 'preset_health_insurance_claim', name: '医保结算率', description: '医保结算金额占总费用的比例', category: 'process', scenario: ['healthcare'], formula: 'SUM(医保结算) / SUM(总费用) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['医保结算', '总费用'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '医保'] },
  { id: 'preset_health_surgery_count', name: '手术量', description: '统计周期内的手术例数', category: 'kpi', scenario: ['healthcare'], formula: 'COUNT(手术)', unit: '例', format: 'number', precision: 0, dependencies: ['手术'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '手术'] },
  { id: 'preset_health_cure_rate', name: '治愈率', description: '治愈患者占出院患者的比例', category: 'kpi', scenario: ['healthcare'], formula: 'COUNT(治愈) / COUNT(出院) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['治愈', '出院'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '质量'] },
  { id: 'preset_health_revisit_rate', name: '复诊率', description: '复诊患者占初诊患者的比例', category: 'process', scenario: ['healthcare'], formula: 'COUNT(复诊) / COUNT(初诊) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['复诊', '初诊'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '随访'] },
  { id: 'preset_health_revenue_per_patient', name: '人均医疗收入', description: '医疗收入除以患者人数', category: 'kpi', scenario: ['healthcare'], formula: 'SUM(医疗收入) / COUNT(患者)', unit: '元', format: 'currency', precision: 2, dependencies: ['医疗收入', '患者'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['医疗', '收入'] },

  // ========== 制造/生产场景 (10个) ==========
  { id: 'preset_mfg_output', name: '产量', description: '统计周期内的产品产量', category: 'kpi', scenario: ['manufacturing'], formula: 'SUM(产量)', unit: '件', format: 'number', precision: 0, dependencies: ['产量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '产出'] },
  { id: 'preset_mfg_qualified_rate', name: '合格率', description: '合格产品占生产总量的比例', category: 'kpi', scenario: ['manufacturing'], formula: 'COUNT(合格) / COUNT(总产品) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 95, critical: 90, target: 99 }, dependencies: ['合格', '总产品'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '质量'] },
  { id: 'preset_mfg_yield_rate', name: '良品率', description: '一次通过检验的良品比例', category: 'kpi', scenario: ['manufacturing'], formula: 'COUNT(一次良品) / COUNT(总检验) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 90, critical: 85, target: 98 }, dependencies: ['一次良品', '总检验'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '质量'] },
  { id: 'preset_mfg_oee', name: 'OEE设备综合效率', description: '设备可用率、性能率、良品率的乘积', category: 'kpi', scenario: ['manufacturing'], formula: '可用率 × 性能率 × 良品率 × 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 70, critical: 60, target: 85 }, dependencies: ['可用率', '性能率', '良品率'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '设备'] },
  { id: 'preset_mfg_capacity_utilization', name: '产能利用率', description: '实际产量占设计产能的比例', category: 'process', scenario: ['manufacturing'], formula: '实际产量 / 设计产能 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['实际产量', '设计产能'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '产能'] },
  { id: 'preset_mfg_downtime_rate', name: '停机率', description: '设备停机时间占总生产时间的比例', category: 'process', scenario: ['manufacturing'], formula: 'SUM(停机时间) / SUM(总时间) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 10, critical: 20, target: 5 }, dependencies: ['停机时间', '总时间'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '设备'] },
  { id: 'preset_mfg_cycle_time', name: '生产周期', description: '产品从投料到完成的时间', category: 'process', scenario: ['manufacturing'], formula: 'AVG(生产周期)', unit: '分钟', format: 'number', precision: 1, dependencies: ['生产周期'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '效率'] },
  { id: 'preset_mfg_scrap_rate', name: '报废率', description: '报废品数量占总产量的比例', category: 'process', scenario: ['manufacturing'], formula: 'COUNT(报废) / COUNT(总产量) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['报废', '总产量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '质量'] },
  { id: 'preset_mfg_unit_cost', name: '单位成本', description: '总成本除以产量', category: 'kpi', scenario: ['manufacturing', 'finance'], formula: 'SUM(总成本) / SUM(产量)', unit: '元/件', format: 'currency', precision: 2, dependencies: ['总成本', '产量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '成本'] },
  { id: 'preset_mfg_labor_productivity', name: '人均产量', description: '产量除以作业人数', category: 'process', scenario: ['manufacturing', 'hr'], formula: 'SUM(产量) / COUNT(作业人员)', unit: '件/人', format: 'number', precision: 2, dependencies: ['产量', '作业人员'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['制造', '人效'] },

  // ========== 物流/运输场景 (10个) ==========
  { id: 'preset_logistics_delivery_volume', name: '配送量', description: '统计周期内的配送单量', category: 'kpi', scenario: ['logistics'], formula: 'COUNT(配送单)', unit: '单', format: 'number', precision: 0, dependencies: ['配送单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '规模'] },
  { id: 'preset_logistics_on_time_rate', name: '准时率', description: '按时配送的订单占总订单的比例', category: 'kpi', scenario: ['logistics'], formula: 'COUNT(准时) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 90, critical: 85, target: 98 }, dependencies: ['准时', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '时效'] },
  { id: 'preset_logistics_sign_rate', name: '签收率', description: '成功签收的订单占总订单的比例', category: 'kpi', scenario: ['logistics'], formula: 'COUNT(签收) / COUNT(总订单) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 95, critical: 90, target: 99 }, dependencies: ['签收', '总订单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '签收'] },
  { id: 'preset_logistics_delivery_cost', name: '单票配送成本', description: '配送总成本除以配送单量', category: 'kpi', scenario: ['logistics', 'finance'], formula: 'SUM(配送成本) / COUNT(配送单)', unit: '元', format: 'currency', precision: 2, dependencies: ['配送成本', '配送单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '成本'] },
  { id: 'preset_logistics_avg_delivery_time', name: '平均配送时长', description: '从发货到签收的平均时间', category: 'process', scenario: ['logistics'], formula: 'AVG(配送时长)', unit: '小时', format: 'number', precision: 1, dependencies: ['配送时长'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '时效'] },
  { id: 'preset_logistics_vehicle_utilization', name: '车辆装载率', description: '实际装载体积占车辆容量的比例', category: 'process', scenario: ['logistics'], formula: 'SUM(装载体积) / SUM(车辆容量) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['装载体积', '车辆容量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '效率'] },
  { id: 'preset_logistics_fleet_utilization', name: '车队利用率', description: '在运行车辆占总车辆的比例', category: 'process', scenario: ['logistics'], formula: 'COUNT(运行车辆) / COUNT(总车辆) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['运行车辆', '总车辆'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '运力'] },
  { id: 'preset_logistics_complaint_rate', name: '投诉率', description: '投诉单数占配送单数的比例', category: 'process', scenario: ['logistics'], formula: 'COUNT(投诉) / COUNT(配送单) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 1, critical: 2, target: 0.5 }, dependencies: ['投诉', '配送单'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '质量'] },
  { id: 'preset_logistics_damage_rate', name: '货损率', description: '损坏货物占配送货物的比例', category: 'process', scenario: ['logistics'], formula: 'SUM(损坏数量) / SUM(总数量) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['损坏数量', '总数量'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '质量'] },
  { id: 'preset_logistics_return_rate', name: '退货率', description: '退回的订单占总配送订单的比例', category: 'process', scenario: ['logistics', 'ecommerce'], formula: 'COUNT(退货) / COUNT(总配送) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['退货', '总配送'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['物流', '退货'] },

  // ========== 餐饮/连锁场景 (10个) ==========
  { id: 'preset_rest_sales', name: '营业额', description: '统计周期内的销售收入总额', category: 'kpi', scenario: ['restaurant'], formula: 'SUM(销售额)', unit: '元', format: 'currency', precision: 2, dependencies: ['销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '收入'] },
  { id: 'preset_rest_table_turnover', name: '翻台率', description: '每桌服务客人数除以座位数', category: 'kpi', scenario: ['restaurant'], formula: '服务客人数 / 座位数', unit: '次', format: 'number', precision: 2, thresholds: { warning: 2, critical: 1.5, target: 3 }, dependencies: ['服务客人数', '座位数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '效率'] },
  { id: 'preset_rest_customer_count', name: '客流量', description: '统计周期内的到店客人数', category: 'kpi', scenario: ['restaurant'], formula: 'SUM(到店人数)', unit: '人', format: 'number', precision: 0, dependencies: ['到店人数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '客流'] },
  { id: 'preset_rest_avg_check', name: '人均消费', description: '营业额除以客流量', category: 'kpi', scenario: ['restaurant'], formula: 'SUM(销售额) / SUM(到店人数)', unit: '元', format: 'currency', precision: 2, dependencies: ['销售额', '到店人数'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '消费'] },
  { id: 'preset_rest_dish_sales_top', name: '菜品销售TOP', description: '销售额最高的菜品', category: 'kpi', scenario: ['restaurant'], formula: 'MAX(菜品销售额)', unit: '元', format: 'currency', precision: 2, dependencies: ['菜品销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '菜品'] },
  { id: 'preset_rest_food_cost_ratio', name: '食材成本率', description: '食材成本占销售额的比例', category: 'process', scenario: ['restaurant', 'finance'], formula: 'SUM(食材成本) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 35, critical: 40, target: 30 }, dependencies: ['食材成本', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '成本'] },
  { id: 'preset_rest_labor_cost_ratio', name: '人力成本率', description: '人力成本占销售额的比例', category: 'process', scenario: ['restaurant', 'hr'], formula: 'SUM(人力成本) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 25, critical: 30, target: 20 }, dependencies: ['人力成本', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '成本'] },
  { id: 'preset_rest_store_profit', name: '门店利润率', description: '门店利润占销售额的比例', category: 'kpi', scenario: ['restaurant', 'finance'], formula: 'SUM(门店利润) / SUM(销售额) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 10, critical: 5, target: 20 }, dependencies: ['门店利润', '销售额'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '盈利'] },
  { id: 'preset_rest_new_customer_ratio', name: '新客占比', description: '新客户占客流量的比例', category: 'process', scenario: ['restaurant', 'marketing'], formula: 'COUNT(新客户) / COUNT(总客流) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['新客户', '总客流'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '客户'] },
  { id: 'preset_rest_reservation_rate', name: '预订率', description: '预订座位占可供预订座位的比例', category: 'process', scenario: ['restaurant'], formula: 'COUNT(预订) / COUNT(可供预订) * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['预订', '可供预订'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['餐饮', '预订'] },

  // ========== 通用业务场景 (10个) ==========
  { id: 'preset_general_growth_rate', name: '增长率', description: '本期相对上期的增长百分比', category: 'trend', scenario: ['general', 'retail', 'ecommerce', 'finance'], formula: '(本期值 - 上期值) / 上期值 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['本期值', '上期值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['增长', '趋势'] },
  { id: 'preset_general_completion_rate', name: '完成率', description: '实际完成值占目标值的比例', category: 'kpi', scenario: ['general', 'retail', 'finance', 'hr'], formula: 'SUM(实际值) / SUM(目标值) * 100', unit: '%', format: 'percent', precision: 2, thresholds: { warning: 80, critical: 60, target: 100 }, dependencies: ['实际值', '目标值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['完成', '目标'] },
  { id: 'preset_general_yoy', name: '同比增长率', description: '本期相对去年同期的增长百分比', category: 'trend', scenario: ['general', 'retail', 'ecommerce', 'finance'], formula: '(本期值 - 去年同期值) / 去年同期值 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['本期值', '去年同期值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['增长', '同比'] },
  { id: 'preset_general_mom', name: '环比增长率', description: '本期相对上期的增长百分比', category: 'trend', scenario: ['general'], formula: '(本期值 - 上期值) / 上期值 * 100', unit: '%', format: 'percent', precision: 2, dependencies: ['本期值', '上期值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['增长', '环比'] },
  { id: 'preset_general_avg', name: '平均值', description: '指标的算术平均值', category: 'process', scenario: ['general'], formula: 'AVG(数值)', unit: '', format: 'number', precision: 2, dependencies: ['数值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['统计', '平均'] },
  { id: 'preset_general_sum', name: '累计值', description: '指标的累计总和', category: 'kpi', scenario: ['general'], formula: 'SUM(数值)', unit: '', format: 'number', precision: 2, dependencies: ['数值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['统计', '累计'] },
  { id: 'preset_general_max', name: '最大值', description: '指标的最大值', category: 'process', scenario: ['general'], formula: 'MAX(数值)', unit: '', format: 'number', precision: 2, dependencies: ['数值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['统计', '极值'] },
  { id: 'preset_general_min', name: '最小值', description: '指标的最小值', category: 'process', scenario: ['general'], formula: 'MIN(数值)', unit: '', format: 'number', precision: 2, dependencies: ['数值'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['统计', '极值'] },
  { id: 'preset_general_count', name: '计数', description: '记录总数', category: 'kpi', scenario: ['general'], formula: 'COUNT(记录)', unit: '条', format: 'number', precision: 0, dependencies: ['记录'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['统计', '计数'] },
  { id: 'preset_general_distinct_count', name: '去重计数', description: '去重后的记录数', category: 'kpi', scenario: ['general'], formula: 'COUNT_DISTINCT(记录)', unit: '个', format: 'number', precision: 0, dependencies: ['记录'], createdAt: 0, updatedAt: 0, isPreset: true, isCustom: false, version: 1, tags: ['统计', '去重'] },
];

// 获取所有场景
export function getAllScenarios(): string[] {
  return Object.keys(BUSINESS_SCENARIOS);
}

// 按场景筛选指标
export function getMetricsByScenario(scenario: string): MetricDefinition[] {
  return PRESET_METRICS.filter(m => m.scenario.includes(scenario));
}

// 搜索指标
export function searchMetrics(keyword: string): MetricDefinition[] {
  const kw = keyword.toLowerCase();
  return PRESET_METRICS.filter(m =>
    m.name.toLowerCase().includes(kw) ||
    m.description.toLowerCase().includes(kw) ||
    m.tags.some(t => t.toLowerCase().includes(kw))
  );
}

// 计算指标值
export function calculateMetricValue(
  metric: MetricDefinition,
  data: { headers: string[]; rows: Record<string, CellValue>[] }
): number | null {
  const { formula, dependencies } = metric;
  
  // 简单实现，实际需要更复杂的表达式解析
  try {
    if (dependencies.length === 0) return null;
    
    const firstDep = dependencies[0];
    const firstField = data.headers.find(h => 
      h.toLowerCase().includes(firstDep.toLowerCase()) ||
      firstDep.toLowerCase().includes(h.toLowerCase())
    );
    
    if (!firstField) return null;
    
    const values = data.rows.map(r => Number(r[firstField]) || 0);
    
    if (formula.startsWith('SUM')) {
      return values.reduce((a, b) => a + b, 0);
    } else if (formula.startsWith('AVG')) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    } else if (formula.startsWith('COUNT')) {
      return values.length;
    } else if (formula.startsWith('MAX')) {
      return Math.max(...values);
    } else if (formula.startsWith('MIN')) {
      return Math.min(...values);
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============================================
// 以下为 metric-manager.tsx 需要的兼容导出
// ============================================

// 场景标签映射
export const SCENARIO_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(BUSINESS_SCENARIOS).map(([key, val]) => [key, val.name])
);

// 指标类别标签
export const CATEGORY_LABELS: Record<string, string> = {
  kpi: 'KPI指标',
  process: '过程指标',
  composite: '复合指标',
  trend: '趋势指标',
  custom: '自定义',
};

// 计算上下文类型
export interface ComputeContext {
  data: { headers: string[]; rows: Record<string, CellValue>[] };
  fieldStats?: import('./data-processor').FieldStat[];
}

// 检测适用的指标
export function detectApplicableMetrics(
  headers: string[],
  fieldStats: import('./data-processor').FieldStat[]
): MetricDefinition[] {
  return PRESET_METRICS.filter(metric => {
    // 检查依赖字段是否在表头中
    return metric.dependencies.some(dep => 
      headers.some(h => 
        h.toLowerCase().includes(dep.toLowerCase()) ||
        dep.toLowerCase().includes(h.toLowerCase())
      )
    );
  }).slice(0, 20); // 返回最多20个推荐指标
}

// 计算指标值
export function computeMetric(
  metric: MetricDefinition,
  context: ComputeContext
): number | null {
  return calculateMetricValue(metric, context.data);
}

// 格式化指标值显示
export function formatMetricValue(
  value: number | null,
  metric: MetricDefinition
): string {
  if (value === null) return '-';
  
  const { format, precision = 2, unit } = metric;
  
  let formatted: string;
  switch (format) {
    case 'percent':
      formatted = `${value.toFixed(precision)}%`;
      break;
    case 'currency':
      formatted = `¥${value.toFixed(precision)}`;
      break;
    case 'ratio':
      formatted = `${value.toFixed(precision)}x`;
      break;
    default:
      formatted = value.toFixed(precision);
  }
  
  return unit ? `${formatted} ${unit}` : formatted;
}

// 检查阈值状态
export function checkThresholdStatus(
  value: number | null,
  metric: MetricDefinition
): 'normal' | 'warning' | 'critical' | 'success' {
  if (value === null) return 'normal';
  
  const { thresholds } = metric;
  if (!thresholds) return 'normal';
  
  // 有目标值
  if ('target' in thresholds && thresholds.target !== undefined) {
    const ratio = value / thresholds.target;
    if (ratio >= 0.9) return 'success';
    if (ratio >= 0.7) return 'warning';
    return 'critical';
  }
  
  // 有警告和危急阈值
  if ('warning' in thresholds && 'critical' in thresholds) {
    if (value >= thresholds.warning!) return 'normal';
    if (value >= thresholds.critical!) return 'warning';
    return 'critical';
  }
  
  return 'normal';
}

// 从 localStorage 加载自定义指标
export function loadCustomMetrics(): MetricDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('datainsight_custom_metrics');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// 保存自定义指标到 localStorage
export function saveCustomMetrics(metrics: MetricDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('datainsight_custom_metrics', JSON.stringify(metrics));
  } catch { /* ignore */ }
}

// 创建自定义指标
export function createCustomMetric(
  name: string,
  formula: string,
  scenario: string[]
): MetricDefinition {
  return {
    id: `custom_${Date.now()}`,
    name,
    description: '自定义指标',
    category: 'custom',
    scenario,
    formula,
    dependencies: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPreset: false,
    isCustom: true,
    version: 1,
    tags: ['自定义'],
  };
}
