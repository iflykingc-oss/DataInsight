'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CellValue } from '@/lib/data-processor';

// 20+行业 × 10+场景模板 = 200+ 行业仪表盘模板

const THEME_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f',
];

const DARK_BG = '#0d1b2a';
const DARK_CARD = '#1b2838';
const DARK_TEXT = '#e0e6ed';
const DARK_SUBTEXT = '#8aa4bf';

interface ChartTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface IndustryConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  keywords: string[];
  templates: ChartTemplate[];
}

// 20+行业配置，每个行业10+场景模板
export const INDUSTRY_CONFIGS: IndustryConfig[] = [
  // ===== 零售电商 =====
  {
    id: 'retail',
    name: '零售电商',
    icon: '🛒',
    description: '门店销售、电商运营、库存管理',
    keywords: ['retail', 'retailer', 'store', 'shop', '门店', '零售', '电商', '商品', '销售', 'sales'],
    templates: [
      { id: 'retail-sales-trend', name: '销售趋势分析', category: '销售分析', description: '日/周/月销售趋势与环比分析' },
      { id: 'retail-category-pie', name: '品类占比分析', category: '品类分析', description: '各品类销售额占比与排名' },
      { id: 'retail-channel-bar', name: '渠道对比分析', category: '渠道分析', description: '线上线下多渠道销售对比' },
      { id: 'retail-region-heatmap', name: '区域热力分析', category: '区域分析', description: '各地区销售热力分布' },
      { id: 'retail-inventory-radar', name: '库存健康分析', category: '库存分析', description: 'SKU周转率与库存预警' },
      { id: 'retail-customer-rfm', name: '客户RFM分析', category: '客户分析', description: 'RFM模型分析客户价值' },
      { id: 'retail-conversion-funnel', name: '转化漏斗分析', category: '转化分析', description: '浏览-加购-下单-支付全链路' },
      { id: 'retail-product-top', name: '爆款商品排行', category: '商品分析', description: 'TOP商品销量与GMV排行' },
      { id: 'retail-promotion-effect', name: '促销效果分析', category: '促销分析', description: '活动ROI与优惠使用率' },
      { id: 'retail-hourly-heatmap', name: '时段销售分析', category: '时段分析', description: '24小时各时段销售分布' },
      { id: 'retail-margins-scatter', name: '毛利散点分析', category: '利润分析', description: '销售额与毛利率关系' },
      { id: 'retail-repurchase-line', name: '复购率分析', category: '客户分析', description: '客户复购周期与频次' },
    ],
  },
  // ===== 金融保险 =====
  {
    id: 'finance',
    name: '金融保险',
    icon: '🏦',
    description: '银行证券、保险理财、投资管理',
    keywords: ['finance', 'bank', 'insurance', 'investment', '金融', '银行', '保险', '理财', '投资', '基金', '证券'],
    templates: [
      { id: 'finance-income-bar', name: '收入支出分析', category: '财务分析', description: '月度收支对比与趋势' },
      { id: 'finance-profit-line', name: '利润走势分析', category: '财务分析', description: '净利润趋势与同比分析' },
      { id: 'finance-cost-breakdown', name: '成本结构分析', category: '成本分析', description: '各类成本占比与变化' },
      { id: 'finance-cash-flow', name: '现金流分析', category: '资金分析', description: '经营/投资/筹资现金流' },
      { id: 'finance-asset-pie', name: '资产配置分析', category: '资产负债', description: '资产结构分布与占比' },
      { id: 'finance-debt-ratio', name: '负债率分析', category: '资产负债', description: '资产负债率变化趋势' },
      { id: 'finance-roa-roe', name: '盈利能力分析', category: '盈利分析', description: 'ROA/ROE指标跟踪' },
      { id: 'finance-npl-funnel', name: '不良贷款分析', category: '风险管理', description: '不良率变化与催收效果' },
      { id: 'finance-deposit-trend', name: '存款增长分析', category: '负债分析', description: '储蓄存款增长与结构' },
      { id: 'finance-loan-sector', name: '贷款行业分布', category: '贷款分析', description: '贷款行业投向分布' },
      { id: 'finance-insurance-claims', name: '理赔分析', category: '保险分析', description: '理赔率与赔付时效' },
      { id: 'finance-premium-trend', name: '保费收入分析', category: '保险分析', description: '保费增长与达成率' },
    ],
  },
  // ===== 教育培训 =====
  {
    id: 'education',
    name: '教育培训',
    icon: '📚',
    description: 'K12、高等教育、职业教育',
    keywords: ['education', 'school', 'student', 'course', '教育', '学校', '学生', '课程', '培训', '学员', '教师'],
    templates: [
      { id: 'edu-score-distribution', name: '成绩分布分析', category: '学业分析', description: '各分数段人数分布' },
      { id: 'edu-top-student', name: '优秀学生排行', category: '学业分析', description: 'TOP学生成绩排名' },
      { id: 'edu-attendance-bar', name: '出勤率分析', category: '考勤分析', description: '班级/个人出勤统计' },
      { id: 'edu-subject-radar', name: '科目对比分析', category: '学业分析', description: '各科目平均分雷达图' },
      { id: 'edu-class-compare', name: '班级对比分析', category: '班级分析', description: '班级平均分与排名' },
      { id: 'edu-course-enroll', name: '课程选报分析', category: '课程分析', description: '课程选修人数与满意度' },
      { id: 'edu-teacher-eval', name: '教师评价分析', category: '教师分析', description: '教学质量评分分布' },
      { id: 'edu-enrollment-trend', name: '招生趋势分析', category: '招生分析', description: '招生计划与完成率' },
      { id: 'edu-tuition-pie', name: '学费收入分析', category: '收入分析', description: '各年级学费收入占比' },
      { id: 'edu-retention-rate', name: '续费率分析', category: '运营分析', description: '学生续费留存分析' },
      { id: 'edu-homework-completion', name: '作业完成分析', category: '学业分析', description: '作业提交与完成率' },
      { id: 'edu-exam-paper-analysis', name: '试卷分析', category: '学业分析', description: '难度系数与区分度' },
    ],
  },
  // ===== 医疗健康 =====
  {
    id: 'healthcare',
    name: '医疗健康',
    icon: '🏥',
    description: '医院诊所、医药电商、健康管理',
    keywords: ['hospital', 'medical', 'health', 'patient', '医疗', '医院', '患者', '门诊', '住院', '处方', '药品'],
    templates: [
      { id: 'health-outpatient-trend', name: '门诊量趋势', category: '门诊分析', description: '日/周/月门诊量变化' },
      { id: 'health-department-pie', name: '科室分布分析', category: '科室分析', description: '各科室就诊占比' },
      { id: 'health-diagnosis-bar', name: '疾病谱分析', category: '疾病分析', description: '高发病种排名与趋势' },
      { id: 'health-drug-sales', name: '药品销售分析', category: '药品分析', description: '药品销量与销售额' },
      { id: 'health-bed-usage', name: '床位使用分析', category: '住院分析', description: '床位周转率与占用率' },
      { id: 'health-mountain-stack', name: '收入构成分析', category: '收入分析', description: '检查/治疗/药品收入占比' },
      { id: 'health-revisit-rate', name: '复诊率分析', category: '患者分析', description: '患者复诊周期分析' },
      { id: 'health-wait-time', name: '等待时间分析', category: '效率分析', description: '挂号/候诊/取药时长' },
      { id: 'health-insurance-claim', name: '医保结算分析', category: '医保分析', description: '医保结算与自付比例' },
      { id: 'health-age-group', name: '患者年龄分析', category: '患者分析', description: '患者年龄分布' },
      { id: 'health-surgery-count', name: '手术量分析', category: '手术分析', description: '手术类型与例数统计' },
      { id: 'health-drug-ratio', name: '药占比分析', category: '合理用药', description: '药品收入占比控制' },
    ],
  },
  // ===== 制造业 =====
  {
    id: 'manufacturing',
    name: '制造业',
    icon: '🏭',
    description: '生产制造、供应链、质量管理',
    keywords: ['manufacturing', 'factory', 'production', 'manufacture', '制造', '生产', '工厂', '车间', '工艺', '质量'],
    templates: [
      { id: 'mfg-output-trend', name: '产量趋势分析', category: '生产分析', description: '日/班/月产量变化' },
      { id: 'mfg-quality-pareto', name: '质量帕累托分析', category: '质量分析', description: '不良类型占比与TOP原因' },
      { id: 'mfg-oee-dashboard', name: 'OEE设备效率', category: '设备分析', description: '设备综合效率分析' },
      { id: 'mfg-capacity-bar', name: '产能利用率分析', category: '产能分析', description: '产线/车间产能利用' },
      { id: 'mfg-inventory-turn', name: '库存周转分析', category: '库存分析', description: '原材料/成品周转天数' },
      { id: 'mfg-cost-breakdown', name: '生产成本分析', category: '成本分析', description: '材料/人工/制造费用' },
      { id: 'mfg-delivery-line', name: '交付及时率', category: '交付分析', description: '订单交付趋势与达成' },
      { id: 'mfg-energy-consumption', name: '能耗分析', category: '能耗分析', description: '水电热气单耗跟踪' },
      { id: 'mfg-defect-scatter', name: '缺陷散点分析', category: '质量分析', description: '缺陷数量与成本关系' },
      { id: 'mfg-shift-compare', name: '班次对比分析', category: '生产分析', description: '早中晚班效率对比' },
      { id: 'mfg-scarp-rate', name: '报废率分析', category: '质量分析', description: '材料报废率跟踪' },
      { id: 'mfg-lead-time', name: '生产周期分析', category: '效率分析', description: '各工序周期时间' },
    ],
  },
  // ===== 物流运输 =====
  {
    id: 'logistics',
    name: '物流运输',
    icon: '🚚',
    description: '快递快运、仓储配送、运输调度',
    keywords: ['logistics', 'delivery', 'shipping', 'warehouse', '物流', '快递', '运输', '配送', '仓储', '货物'],
    templates: [
      { id: 'logistics-volume-trend', name: '业务量趋势', category: '业务分析', description: '日/周/月发货量变化' },
      { id: 'logistics-on-time-rate', name: '准时交付分析', category: '时效分析', description: '按时交付率与趋势' },
      { id: 'logistics-route-bar', name: '线路分析', category: '线路分析', description: '各线路业务量对比' },
      { id: 'logistics-warehouse-pie', name: '仓库分布分析', category: '仓储分析', description: '各仓库吞吐量占比' },
      { id: 'logistics-cost-per-order', name: '单票成本分析', category: '成本分析', description: '单票成本与构成' },
      { id: 'logistics-vehicle-util', name: '车辆利用率', category: '运力分析', description: '车辆装载率与里程利用率' },
      { id: 'logistics-complaint-funnel', name: '投诉分析', category: '服务分析', description: '投诉类型与处理时效' },
      { id: 'logistics-peak-heatmap', name: '峰谷时段分析', category: '时段分析', description: '业务量峰谷分布' },
      { id: 'logistics-loss-damage', name: '货损货差分析', category: '质量分析', description: '破损率与理赔分析' },
      { id: 'logistics-distance-cost', name: '里程成本分析', category: '成本分析', description: '里程与运输成本关系' },
      { id: 'logistics-network-map', name: '网络覆盖分析', category: '网络分析', description: '网点覆盖与密度' },
      { id: 'logistics-wait-loading', name: '装卸等待分析', category: '效率分析', description: '车辆等待与装卸时长' },
    ],
  },
  // ===== 餐饮连锁 =====
  {
    id: 'restaurant',
    name: '餐饮连锁',
    icon: '🍜',
    description: '餐厅酒楼、快餐连锁、茶饮甜品',
    keywords: ['restaurant', 'catering', 'food', 'restaurant', '餐饮', '餐厅', '饭店', '快餐', '菜品', '门店'],
    templates: [
      { id: 'rest-sales-trend', name: '营收趋势分析', category: '营收分析', description: '日/周/月营业额变化' },
      { id: 'rest-dish-top', name: '菜品销量排行', category: '菜品分析', description: 'TOP菜品销量与毛利' },
      { id: 'rest-peak-heatmap', name: '峰谷时段分析', category: '时段分析', description: '各时段客流量分布' },
      { id: 'rest-table-usage', name: '桌台使用分析', category: '运营分析', description: '翻台率与桌台利用率' },
      { id: 'rest-cost-ratio', name: '成本占比分析', category: '成本分析', description: '食材/人效/租金占比' },
      { id: 'rest-store-compare', name: '门店对比分析', category: '门店分析', description: '各门店业绩排名' },
      { id: 'rest-customer-segment', name: '客群分析', category: '客户分析', description: '客单价与消费频次' },
      { id: 'rest-channel-pie', name: '渠道分布分析', category: '渠道分析', description: '堂食/外卖/团购占比' },
      { id: 'rest-inventory-alert', name: '原料预警分析', category: '库存分析', description: '原料库存与预警' },
      { id: 'rest-new-product', name: '新品分析', category: '菜品分析', description: '新品销量与复购率' },
      { id: 'rest-staff-productivity', name: '人效分析', category: '人效分析', description: '人均服务与产出' },
      { id: 'rest-5star-review', name: '好评率分析', category: '口碑分析', description: '各平台评分与趋势' },
    ],
  },
  // ===== 旅游出行 =====
  {
    id: 'tourism',
    name: '旅游出行',
    icon: '✈️',
    description: '酒店民宿、景区乐园、旅行社',
    keywords: ['tourism', 'hotel', 'travel', 'booking', '旅游', '酒店', '景区', '民宿', '门票', '预订'],
    templates: [
      { id: 'tourism-booking-trend', name: '预订趋势分析', category: '预订分析', description: '日/周/月预订量变化' },
      { id: 'tourism-occupancy-rate', name: '入住率分析', category: '运营分析', description: '房间入住率与趋势' },
      { id: 'tourism-revenue-per-room', name: '单房收益分析', category: '收益分析', description: 'RevPAR指标跟踪' },
      { id: 'tourism-source-region', name: '客源地分析', category: '客户分析', description: '游客来源省份/城市分布' },
      { id: 'tourism-weather-impact', name: '天气影响分析', category: '外部分析', description: '天气与客流关系' },
      { id: 'tourism-ticket-top', name: '景点排行分析', category: '景点分析', description: '各景点游客量排名' },
      { id: 'tourism-package-pie', name: '套餐销售分析', category: '产品分析', description: '各套餐销售占比' },
      { id: 'tourism-channel-bar', name: '渠道对比分析', category: '渠道分析', description: 'OTA/官网/分销占比' },
      { id: 'tourism-avg-stay', name: '平均入住天数', category: '运营分析', description: '住客平均停留时长' },
      { id: 'tourism-price-trend', name: '价格走势分析', category: '定价分析', description: '均价与供需关系' },
      { id: 'tourism-group-vs-retail', name: '团散对比分析', category: '客户分析', description: '团队与散客占比' },
      { id: 'tourism-seasonality', name: '季节性分析', category: '周期分析', description: '淡旺季波动规律' },
    ],
  },
  // ===== 地产建筑 =====
  {
    id: 'realestate',
    name: '地产建筑',
    icon: '🏗️',
    description: '房地产开发、物业管理、建筑工程',
    keywords: ['real estate', 'property', 'building', 'estate', '地产', '房产', '物业', '建筑', '楼盘', '施工'],
    templates: [
      { id: 're-sales-trend', name: '销售趋势分析', category: '销售分析', description: '认购/签约/回款趋势' },
      { id: 're-inventory-bar', name: '库存去化分析', category: '库存分析', description: '库存套数与去化周期' },
      { id: 're-price-map', name: '价格地图分析', category: '定价分析', description: '竞品价格对比分布' },
      { id: 're-project-progress', name: '项目进度分析', category: '进度分析', description: '各项目工期跟踪' },
      { id: 're-property-fee', name: '物业费收缴分析', category: '物业分析', description: '收缴率与欠费分析' },
      { id: 're-complaint-categories', name: '投诉分类分析', category: '物业分析', description: '投诉类型与处理时效' },
      { id: 're-area-sold', name: '成交面积分析', category: '销售分析', description: '各面积段成交占比' },
      { id: 're-customer-age', name: '客户年龄分析', category: '客户分析', description: '购房客户年龄分布' },
      { id: 're-payment-method', name: '付款方式分析', category: '交易分析', description: '一次性/商贷/公积金占比' },
      { id: 're-site-safety', name: '安全检查分析', category: '安全分析', description: '隐患整改与安全评分' },
      { id: 're-material-cost', name: '材料成本分析', category: '成本分析', description: '主材用量与价格' },
      { id: 're-labor-productivity', name: '人工效能分析', category: '人效分析', description: '人均产值与工效' },
    ],
  },
  // ===== 媒体娱乐 =====
  {
    id: 'media',
    name: '媒体娱乐',
    icon: '🎬',
    description: '影视制作、内容平台、演出赛事',
    keywords: ['media', 'entertainment', 'content', 'video', '媒体', '影视', '视频', '内容', '票房', '播放量'],
    templates: [
      { id: 'media-view-trend', name: '播放趋势分析', category: '内容分析', description: '日/周播放量变化' },
      { id: 'media-content-top', name: '内容排行分析', category: '内容分析', description: 'TOP内容播放量排名' },
      { id: 'media-engagement-bar', name: '互动数据分析', category: '互动分析', description: '点赞/评论/转发量' },
      { id: 'media-retention-curve', name: '留存曲线分析', category: '用户分析', description: '次日/7日/30日留存' },
      { id: 'media-watch-duration', name: '观看时长分析', category: '内容分析', description: '人均观看时长分布' },
      { id: 'media-user-portrait', name: '用户画像分析', category: '用户分析', description: '性别/年龄/地域分布' },
      { id: 'media-ad-revenue', name: '广告收入分析', category: '收入分析', description: '广告曝光与点击收入' },
      { id: 'media-box-office', name: '票房分析', category: '票房分析', description: '电影票房与排片率' },
      { id: 'media-vip-conversion', name: 'VIP转化分析', category: '转化分析', description: '免费转付费转化率' },
      { id: 'media-push-effect', name: '推送效果分析', category: '运营分析', description: '推送打开率与转化' },
      { id: 'media-hot-topic', name: '热点话题分析', category: '舆情分析', description: '话题热度与参与度' },
      { id: 'media-creator-rank', name: '创作者排行', category: '创作者分析', description: 'TOP创作者贡献量' },
    ],
  },
  // ===== 通信运营商 =====
  {
    id: 'telecom',
    name: '通信运营商',
    icon: '📡',
    description: '移动通信、宽带接入、增值服务',
    keywords: ['telecom', 'mobile', 'broadband', '运营商', '通信', '手机', '宽带', '流量', '套餐', '用户'],
    templates: [
      { id: 'telecom-user-trend', name: '用户增长趋势', category: '用户分析', description: '净增用户与离网率' },
      { id: 'telecom-arpu-line', name: 'ARPU走势分析', category: '收入分析', description: '用户ARPU值变化' },
      { id: 'telecom-traffic-usage', name: '流量使用分析', category: '流量分析', description: '户均流量与增长' },
      { id: 'telecom-package-pie', name: '套餐分布分析', category: '套餐分析', description: '各套餐用户占比' },
      { id: 'telecom-network-quality', name: '网络质量分析', category: '网络分析', description: '覆盖率与速率分布' },
      { id: 'telecom-complaint-categories', name: '投诉分类分析', category: '服务分析', description: '投诉类型与占比' },
      { id: 'telecom-channel-bar', name: '渠道产能分析', category: '渠道分析', description: '各渠道发展用户量' },
      { id: 'telecom-device-share', name: '终端份额分析', category: '终端分析', description: '各品牌终端占比' },
      { id: 'telecom-roaming', name: '漫游业务分析', category: '业务分析', description: '国际/国内漫游量' },
      { id: 'telecom-vas-revenue', name: '增值业务收入', category: '收入分析', description: '各增值业务收入' },
      { id: 'telecom-broadband-speed', name: '宽带速率分析', category: '宽带分析', description: '各速率套餐占比' },
      { id: 'telecom-4g5g-transition', name: '4G5G迁移分析', category: '网络演进', description: '4G升5G转化率' },
    ],
  },
  // ===== 能源电力 =====
  {
    id: 'energy',
    name: '能源电力',
    icon: '⚡',
    description: '发电企业、电网运营、燃气水务',
    keywords: ['energy', 'power', 'electricity', 'energy', '能源', '电力', '发电', '用电', '电网', '燃气'],
    templates: [
      { id: 'energy-power-trend', name: '发电量趋势分析', category: '发电分析', description: '日/周/月发电量变化' },
      { id: 'energy-load-curve', name: '负荷曲线分析', category: '电网分析', description: '峰谷负荷分布' },
      { id: 'energy-cost-breakdown', name: '度电成本分析', category: '成本分析', description: '各项成本占比' },
      { id: 'energy-efficiency-radar', name: '能效指标分析', category: '效率分析', description: '厂用电率与线损率' },
      { id: 'energy-emission-bar', name: '排放指标分析', category: '环保分析', description: '排放量与达标率' },
      { id: 'energy-reserve-level', name: '库存量分析', category: '库存分析', description: '煤炭/燃气库存跟踪' },
      { id: 'energy-price-trend', name: '电价走势分析', category: '价格分析', description: '峰谷电价分布' },
      { id: 'energy-renewable-share', name: '清洁能源占比', category: '结构分析', description: '风光水核占比变化' },
      { id: 'energy-usage-sector', name: '行业用电分析', category: '用电分析', description: '各行业用电量占比' },
      { id: 'energy-equipment-status', name: '设备状态分析', category: '设备分析', description: '设备运行与故障统计' },
      { id: 'energy-water-usage', name: '用水量分析', category: '资源分析', description: '生产用水量与效率' },
      { id: 'energy-maintenance-schedule', name: '检修计划分析', category: '运维分析', description: '检修完成率跟踪' },
    ],
  },
  // ===== 汽车行业 =====
  {
    id: 'automotive',
    name: '汽车行业',
    icon: '🚗',
    description: '整车制造、汽车销售、售后服务',
    keywords: ['automotive', 'car', 'vehicle', 'auto', '汽车', '车辆', '整车', '4s店', '售后', '保养'],
    templates: [
      { id: 'auto-sales-trend', name: '销量趋势分析', category: '销售分析', description: '月/季/年销量变化' },
      { id: 'auto-model-ranking', name: '车型销量排行', category: '产品分析', description: '各车型销量排名' },
      { id: 'auto-dealer-performance', name: '经销商表现分析', category: '渠道分析', description: '各经销商完成率' },
      { id: 'auto-inventory-level', name: '库存深度分析', category: '库存分析', description: '库存周转与预警' },
      { id: 'auto-market-share', name: '市场份额分析', category: '市场分析', description: '品牌/车型市占率' },
      { id: 'auto-price-trend', name: '价格走势分析', category: '定价分析', description: '终端优惠趋势' },
      { id: 'auto-service-revenue', name: '售后产值分析', category: '售后分析', description: '维修/保养/配件产值' },
      { id: 'auto-customer-waiting', name: '等待时间分析', category: '服务分析', description: '客户等待时长分布' },
      { id: 'auto-parts-inventory', name: '配件库存分析', category: '配件分析', description: '配件周转与预警' },
      { id: 'auto-revisit-rate', name: '返店率分析', category: '客户分析', description: '客户返厂频次' },
      { id: 'auto-channel-online', name: '线上渠道分析', category: '渠道分析', description: '官网/电商线索量' },
      { id: 'auto-test-drive', name: '试驾转化分析', category: '转化分析', description: '试驾到成交转化' },
    ],
  },
  // ===== 农业畜牧 =====
  {
    id: 'agriculture',
    name: '农业畜牧',
    icon: '🌾',
    description: '种植养殖、农产品加工、农资流通',
    keywords: ['agriculture', 'farm', 'crop', 'livestock', '农业', '种植', '养殖', '农产品', '畜牧', '农资'],
    templates: [
      { id: 'agri-output-trend', name: '产量趋势分析', category: '生产分析', description: '各品类产量变化' },
      { id: 'agri-price-trend', name: '价格走势分析', category: '价格分析', description: '收购价与市场价变化' },
      { id: 'agri-quality-grade', name: '品质等级分析', category: '质量分析', description: '各等级占比分布' },
      { id: 'agri-field-yield', name: '亩产效率分析', category: '效率分析', description: '各基地亩产对比' },
      { id: 'agri-feed-conversion', name: '饲料转化分析', category: '养殖分析', description: '料肉比/料蛋比' },
      { id: 'agri-disease-outbreak', name: '病害预警分析', category: '风险分析', description: '病害发生与损失' },
      { id: 'agri-weather-impact', name: '气候影响分析', category: '外部分析', description: '天气对产量影响' },
      { id: 'agri-supply-chain', name: '供应链分析', category: '流通分析', description: '流通环节与损耗' },
      { id: 'agri-export-import', name: '进出口分析', category: '贸易分析', description: '进出口量与趋势' },
      { id: 'agri-inventory-storage', name: '库存存储分析', category: '仓储分析', description: '库存容量与周转' },
      { id: 'agri-certification', name: '认证分析', category: '质量分析', description: '有机/绿色认证占比' },
      { id: 'agri-subsidy-distribution', name: '补贴发放分析', category: '政策分析', description: '补贴覆盖与发放' },
    ],
  },
  // ===== 法律服务 =====
  {
    id: 'legal',
    name: '法律服务',
    icon: '⚖️',
    description: '律师事务所、法律咨询、公证仲裁',
    keywords: ['legal', 'law', 'lawyer', 'attorney', '法律', '律师', '案件', '诉讼', '咨询', '公证'],
    templates: [
      { id: 'legal-case-trend', name: '案件趋势分析', category: '业务分析', description: '新收/结案量变化' },
      { id: 'legal-case-type', name: '案件类型分析', category: '业务分析', description: '各类型案件占比' },
      { id: 'legal-attorney-workload', name: '律师工作量分析', category: '绩效分析', description: '各律师案件量' },
      { id: 'legal-case-duration', name: '案件周期分析', category: '效率分析', description: '平均办案周期' },
      { id: 'legal-win-rate', name: '胜诉率分析', category: '质量分析', description: '各类型案件胜诉率' },
      { id: 'legal-revenue-client', name: '客户创收分析', category: '收入分析', description: '客户贡献收入排名' },
      { id: 'legal-hourly-rate', name: '费率分析', category: '定价分析', description: '小时费率与收费模式' },
      { id: 'legal-payment-collection', name: '回款分析', category: '财务分析', description: '应收账款与回款率' },
      { id: 'legal-new-client', name: '新客户分析', category: '客户分析', description: '新客户获取量' },
      { id: 'legal-referral-source', name: '渠道来源分析', category: '渠道分析', description: '客户来源分布' },
      { id: 'legal-consultation', name: '咨询转化分析', category: '转化分析', description: '咨询到委托转化率' },
      { id: 'legal-ethics-compliance', name: '合规检查分析', category: '合规分析', description: '合规检查问题统计' },
    ],
  },
  // ===== 人力资源 =====
  {
    id: 'hr',
    name: '人力资源',
    icon: '👥',
    description: '企业HR、猎头招聘、劳务外包',
    keywords: ['hr', 'human', 'recruit', 'employee', '人力资源', 'HR', '员工', '招聘', '薪酬', '绩效'],
    templates: [
      { id: 'hr-headcount-trend', name: '人员编制趋势', category: '编制分析', description: '在编人数变化' },
      { id: 'hr-turnover-rate', name: '离职率分析', category: '流动分析', description: '主动/被动离职占比' },
      { id: 'hr-recruitment-funnel', name: '招聘漏斗分析', category: '招聘分析', description: '投递-面试-offer转化' },
      { id: 'hr-time-to-hire', name: '招聘周期分析', category: '招聘分析', description: '岗位平均招聘时长' },
      { id: 'hr-salary-breakdown', name: '薪酬结构分析', category: '薪酬分析', description: '固薪/绩效/奖金占比' },
      { id: 'hr-performance-distribution', name: '绩效分布分析', category: '绩效分析', description: 'ABC等级占比' },
      { id: 'hr-department-headcount', name: '部门人数分析', category: '结构分析', description: '各部门人数占比' },
      { id: 'hr-age-structure', name: '年龄结构分析', category: '结构分析', description: '各年龄段占比' },
      { id: 'hr-education-level', name: '学历结构分析', category: '结构分析', description: '各学历层次占比' },
      { id: 'hr-training-hours', name: '培训时长分析', category: '培训分析', description: '人均培训课时' },
      { id: 'hr-bonus-cost', name: '奖金成本分析', category: '成本分析', description: '奖金总额与占比' },
      { id: 'hr-absenteeism', name: '缺勤率分析', category: '考勤分析', description: '各类缺勤统计' },
    ],
  },
  // ===== 政府公共 =====
  {
    id: 'government',
    name: '政府公共',
    icon: '🏛️',
    description: '政务服务、基层治理、公共设施',
    keywords: ['government', 'public', 'service', '政务', '政府', '公共服务', '社区', '街道', '审批'],
    templates: [
      { id: 'gov-service-trend', name: '服务量趋势分析', category: '服务分析', description: '办件量变化' },
      { id: 'gov-service-type', name: '事项类型分析', category: '服务分析', description: '各类事项占比' },
      { id: 'gov-processing-time', name: '办理时效分析', category: '效率分析', description: '平均办理时长' },
      { id: 'gov-satisfaction', name: '满意度分析', category: '评价分析', description: '好评率与评价分布' },
      { id: 'gov-online-ratio', name: '在线办理率', category: '数字化分析', description: '网办率与趋势' },
      { id: 'gov-age-group', name: '办事人群分析', category: '用户分析', description: '各年龄段占比' },
      { id: 'gov-license-approval', name: '证照审批分析', category: '审批分析', description: '证照办理统计' },
      { id: 'gov-complaint-categories', name: '投诉分类分析', category: '投诉分析', description: '投诉类型占比' },
      { id: 'gov-community-event', name: '社区活动分析', category: '活动分析', description: '活动场次与参与' },
      { id: 'gov-emergency-incident', name: '突发事件分析', category: '应急分析', description: '事件类型与处置' },
      { id: 'gov-facility-utilization', name: '设施利用率', category: '资源分析', description: '场馆使用率' },
      { id: 'gov-staff-workload', name: '工作人员量', category: '绩效分析', description: '人均办件量' },
    ],
  },
  // ===== 体育健身 =====
  {
    id: 'sports',
    name: '体育健身',
    icon: '🏃',
    description: '健身会所、体育培训、赛事运营',
    keywords: ['sports', 'fitness', 'gym', '体育', '健身', '会员', '场馆', '培训', '赛事'],
    templates: [
      { id: 'sports-member-trend', name: '会员趋势分析', category: '会员分析', description: '新增/流失/净增会员' },
      { id: 'sports-checkin-heatmap', name: '签到时段热力', category: '流量分析', description: '各时段场馆人数' },
      { id: 'sports-class-popularity', name: '课程热度分析', category: '课程分析', description: '各课程预约量' },
      { id: 'sports-revenue-breakdown', name: '收入结构分析', category: '收入分析', description: '会籍/课程/零售占比' },
      { id: 'sports-churn-risk', name: '流失风险分析', category: '会员分析', description: '流失预警名单' },
      { id: 'sports-coach-performance', name: '教练绩效分析', category: '绩效分析', description: '教练课时与评价' },
      { id: 'sports-class-utilization', name: '团课利用率', category: '运营分析', description: '团课满员率' },
      { id: 'sports-merchandise', name: '零售商品分析', category: '零售分析', description: '商品销量与库存' },
      { id: 'sports-event-attendance', name: '赛事上座率', category: '赛事分析', description: '赛事参与人数' },
      { id: 'sports-member-age', name: '会员年龄分析', category: '用户分析', description: '会员年龄分布' },
      { id: 'sports-private-vs-group', name: '私教团课对比', category: '产品分析', description: '私教与团课占比' },
      { id: 'sports-visits-per-week', name: '到店频次分析', category: '行为分析', description: '周均到店次数分布' },
    ],
  },
  // ===== 环保环卫 =====
  {
    id: 'environmental',
    name: '环保环卫',
    icon: '🌿',
    description: '环卫保洁、垃圾处理、环境监测',
    keywords: ['environmental', 'waste', 'cleaning', '环保', '环卫', '垃圾', '保洁', '环境', '监测', '绿化'],
    templates: [
      { id: 'env-waste-volume', name: '垃圾量趋势分析', category: '环卫分析', description: '日清垃圾量变化' },
      { id: 'env-classification-rate', name: '分类率分析', category: '分类分析', description: '干湿分类占比' },
      { id: 'env-cleaning-coverage', name: '保洁覆盖率', category: '保洁分析', description: '作业面积与频次' },
      { id: 'env-vehicle-utilization', name: '作业车辆分析', category: '设备分析', description: '车辆利用率与里程' },
      { id: 'env-air-quality', name: '空气质量分析', category: '监测分析', description: 'AQI与各指标分布' },
      { id: 'env-water-quality', name: '水质监测分析', category: '监测分析', description: '各监测点数据' },
      { id: 'env-complaint-handling', name: '投诉处理分析', category: '服务分析', description: '投诉响应与解决率' },
      { id: 'env-green-coverage', name: '绿化覆盖率', category: '绿化分析', description: '各区域绿化占比' },
      { id: 'env-incident-response', name: '突发事件响应', category: '应急分析', description: '响应时间与处置' },
      { id: 'env-cost-per-ton', name: '吨垃圾成本', category: '成本分析', description: '单位处理成本' },
      { id: 'env-recyclable-rate', name: '可回收率分析', category: '资源分析', description: '可回收物占比' },
      { id: 'env-landfill-usage', name: '填埋场使用分析', category: '设施分析', description: '剩余库容与使用' },
    ],
  },
  // ===== 文化出版 =====
  {
    id: 'publishing',
    name: '文化出版',
    icon: '📖',
    description: '图书出版、报刊杂志、版权运营',
    keywords: ['publishing', 'book', 'magazine', '版权', '出版', '图书', '报刊', '版权', '发行'],
    templates: [
      { id: 'pub-sales-trend', name: '发行趋势分析', category: '发行分析', description: '发行量变化' },
      { id: 'pub-category-pie', name: '品类结构分析', category: '产品分析', description: '各品类占比' },
      { id: 'pub-title-ranking', name: '畅销书排行', category: '产品分析', description: 'TOP书籍销量' },
      { id: 'pub-inventory-age', name: '库存库龄分析', category: '库存分析', description: '滞销书与库龄分布' },
      { id: 'pub-return-rate', name: '退货率分析', category: '渠道分析', description: '渠道退货率跟踪' },
      { id: 'pub-channel-sales', name: '渠道销售分析', category: '渠道分析', description: '线上/线下/馆配占比' },
      { id: 'pub-author-performance', name: '作者版税分析', category: '版权分析', description: '作者版税支出' },
      { id: 'pub-copyright-license', name: '版权授权分析', category: '版权分析', description: '版权输出/引进统计' },
      { id: 'pub-print-run', name: '印数分析', category: '生产分析', description: '首印与加印统计' },
      { id: 'pub-reader-demographic', name: '读者画像分析', category: '用户分析', description: '读者年龄/性别分布' },
      { id: 'pub-award-winning', name: '获奖作品分析', category: '质量分析', description: '获奖作品销量影响' },
      { id: 'pub-digital-revenue', name: '数字收入分析', category: '收入分析', description: '电子书/有声书收入' },
    ],
  },
  // ===== 更多行业... =====
  // 如果需要，可以继续添加更多行业
];

// 获取行业配置
export function getIndustryConfig(industryId: string): IndustryConfig | undefined {
  return INDUSTRY_CONFIGS.find(i => i.id === industryId);
}

// 搜索行业
export function searchIndustries(keyword: string): IndustryConfig[] {
  const kw = keyword.toLowerCase();
  return INDUSTRY_CONFIGS.filter(i =>
    i.name.includes(keyword) ||
    i.description.includes(keyword) ||
    i.keywords.some(k => k.toLowerCase().includes(kw))
  );
}

// 智能识别行业
export function detectIndustry(headers: string[], sampleRows: Record<string, CellValue>[]): string | null {
  const text = [...headers, ...sampleRows.slice(0, 5).map(r => Object.values(r).join(' '))].join(' ').toLowerCase();
  
  for (const industry of INDUSTRY_CONFIGS) {
    const matchCount = industry.keywords.filter(k => text.includes(k.toLowerCase())).length;
    if (matchCount >= 2) {
      return industry.id;
    }
  }
  
  return null;
}

export default function IndustryDashboardTemplate({
  data,
  industryId,
  height = 600
}: {
  data: { headers: string[]; rows: Record<string, CellValue>[] };
  industryId: string;
  height?: number;
}) {
  const config = getIndustryConfig(industryId);
  const industry = config || INDUSTRY_CONFIGS[0];

  // 智能字段映射
  const fieldMap = (() => {
    const headers = data.headers.map(h => h.toLowerCase());
    const find = (kws: string[]) => data.headers.find(h => kws.some(k => h.toLowerCase().includes(k)));
    return {
      date: find(['日期', 'date', '时间', 'time', '月', 'month', '周', 'week', '年', 'year']) || data.headers[0],
      value: find(['金额', 'amount', '销量', 'sales', '数量', 'count', '收入', 'revenue', '额', 'total']) || 
             data.headers.find(h => typeof data.rows[0]?.[h] === 'number') || data.headers[1],
      category: find(['品类', 'category', '分类', 'type', '名称', 'name', '产品', 'product']),
    };
  })();

  // 通用主题
  const theme = {
    color: THEME_COLORS,
    backgroundColor: 'transparent',
    title: { textStyle: { color: DARK_TEXT }, subtextStyle: { color: DARK_SUBTEXT } },
    legend: { textStyle: { color: DARK_SUBTEXT } },
    tooltip: { backgroundColor: 'rgba(0,0,0,0.7)', textStyle: { color: DARK_TEXT } },
    xAxis: { axisLine: { lineStyle: { color: '#2a3a4a' } }, axisLabel: { color: DARK_SUBTEXT }, splitLine: { lineStyle: { color: '#1a2a3a' } } },
    yAxis: { axisLine: { lineStyle: { color: '#2a3a4a' } }, axisLabel: { color: DARK_SUBTEXT }, splitLine: { lineStyle: { color: '#1a2a3a' } } },
  };

  // 默认图表
  const defaultOption: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: `${industry.name}数据概览`, left: 'center', textStyle: { color: DARK_TEXT, fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    legend: { data: [fieldMap.value], textStyle: { color: DARK_SUBTEXT }, top: 30 },
    xAxis: { type: 'category', data: data.rows.slice(0, 12).map(r => String(r[fieldMap.date] || '')) },
    yAxis: { type: 'value' },
    series: [{
      name: fieldMap.value,
      type: 'bar',
      data: data.rows.slice(0, 12).map(r => Number(r[fieldMap.value]) || 0),
      itemStyle: { color: new Date().getDay() % 2 === 0 ? '#5470c6' : '#91cc75', borderRadius: [3, 3, 0, 0] },
    }],
    grid: { left: 50, right: 20, top: 60, bottom: 30 },
  };

  return (
    <div style={{ background: DARK_BG, borderRadius: 8, padding: 16, height }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: DARK_TEXT, margin: 0 }}>{industry.icon} {industry.name} - 仪表盘模板</h3>
        <span style={{ color: DARK_SUBTEXT, fontSize: 12 }}>{industry.description}</span>
      </div>
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={defaultOption} theme={theme as never} style={{ height: height - 60 }} />
      </div>
      <div style={{ marginTop: 12, color: DARK_SUBTEXT, fontSize: 11 }}>
        共 {industry.templates.length} 个场景模板可用 | 识别行业: {industry.name}
      </div>
    </div>
  );
}
