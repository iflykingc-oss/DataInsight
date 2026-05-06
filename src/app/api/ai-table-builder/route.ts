import { NextRequest } from 'next/server';
import { callLLM, validateModelConfig, type LLMModelConfig } from '@/lib/llm';
import { verifyAuth } from '@/lib/auth-middleware';

/**
 * AI 智能建表 API
 * 支持：
 * 1. 场景模板列表获取
 * 2. AI 生成表格方案（流式）
 * 3. AI 迭代修改方案（流式）
 * 4. 确认生成 Excel 文件
 */

// 场景模板定义 (20+行业 × 10+模板 = 200+)
// 分类：通用、零售电商、餐饮、教育培训、医疗健康、金融保险、人力资源、办公行政、市场营销、供应链物流、制造业、地产物业、酒店旅游、媒体娱乐、法律服务、农业畜牧、政府公共服务、科技互联网、环保环卫、体育健身、出版传媒

const SCENE_TEMPLATES = [
  // ========== 通用场景 (20个) ==========
  { id: 'general-ledger', name: '通用收支台账', industry: '通用', usage: '日常收支记录与统计', category: 'general' },
  { id: 'general-inventory', name: '通用库存管理', industry: '通用', usage: '商品/物料出入库管理', category: 'general' },
  { id: 'general-project', name: '项目管理台账', industry: '通用', usage: '项目进度与成本跟踪', category: 'general' },
  { id: 'general-expense', name: '费用报销台账', industry: '通用', usage: '员工费用记录与审批', category: 'general' },
  { id: 'general-asset', name: '固定资产台账', industry: '通用', usage: '资产登记与折旧管理', category: 'general' },
  { id: 'general-customer', name: '客户信息管理', industry: '通用', usage: '客户档案与跟进记录', category: 'general' },
  { id: 'general-contract', name: '合同管理台账', industry: '通用', usage: '合同签署与到期提醒', category: 'general' },
  { id: 'general-vehicle', name: '车辆管理台账', industry: '通用', usage: '车辆使用与费用记录', category: 'general' },
  { id: 'general-meeting', name: '会议纪要管理', industry: '通用', usage: '会议安排与待办跟踪', category: 'general' },
  { id: 'general-document', name: '文档清单管理', industry: '通用', usage: '文件归档与版本记录', category: 'general' },
  { id: 'general-inventory-check', name: '库存盘点表', industry: '通用', usage: '定期盘点与差异分析', category: 'general' },
  { id: 'general-budget', name: '预算管理表', industry: '通用', usage: '年度预算编制与执行', category: 'general' },
  { id: 'general-supplier', name: '供应商管理', industry: '通用', usage: '供应商档案与评估', category: 'general' },
  { id: 'general-product', name: '产品信息表', industry: '通用', usage: '产品目录与规格参数', category: 'general' },
  { id: 'general-equipment', name: '设备维护表', industry: '通用', usage: '设备保养与维修记录', category: 'general' },
  { id: 'general-inspection', name: '巡检记录表', industry: '通用', usage: '日常巡检与问题记录', category: 'general' },
  { id: 'general-complaint', name: '投诉处理表', industry: '通用', usage: '客户投诉跟踪与处理', category: 'general' },
  { id: 'general-report', name: '工作日志表', industry: '通用', usage: '日常工作记录与汇报', category: 'general' },
  { id: 'general-goal', name: '目标追踪表', industry: '通用', usage: 'KPI目标与完成进度', category: 'general' },
  { id: 'general-risk', name: '风险管控表', industry: '通用', usage: '风险识别与应对措施', category: 'general' },

  // ========== 零售电商场景 (15个) ==========
  { id: 'retail-daily-sales', name: '日销跟踪表', industry: '零售电商', usage: '每日销售数据记录与分析', category: 'retail' },
  { id: 'retail-product-analysis', name: '商品分析表', industry: '零售电商', usage: '商品销售排行与毛利分析', category: 'retail' },
  { id: 'retail-purchase', name: '采购进货表', industry: '零售电商', usage: '供应商采购记录与成本管控', category: 'retail' },
  { id: 'retail-customer', name: '客户管理表', industry: '零售电商', usage: '客户信息与消费记录', category: 'retail' },
  { id: 'retail-promotion', name: '促销活动表', industry: '零售电商', usage: '活动效果与ROI分析', category: 'retail' },
  { id: 'retail-inventory', name: '库存预警表', industry: '零售电商', usage: '安全库存与补货提醒', category: 'retail' },
  { id: 'retail-supplier', name: '供应商对账表', industry: '零售电商', usage: '供应商结算与往来账', category: 'retail' },
  { id: 'retail-channel', name: '渠道销售表', industry: '零售电商', usage: '线上线下渠道业绩对比', category: 'retail' },
  { id: 'retail-membership', name: '会员积分表', industry: '零售电商', usage: '会员等级与积分管理', category: 'retail' },
  { id: 'retail-refund', name: '退款处理表', industry: '零售电商', usage: '退款原因与统计分析', category: 'retail' },
  { id: 'retail-coupon', name: '优惠券核销表', industry: '零售电商', usage: '优惠券发放与使用追踪', category: 'retail' },
  { id: 'retail-category', name: '品类销售表', industry: '零售电商', usage: '品类结构与贡献分析', category: 'retail' },
  { id: 'retail-staff', name: '导购业绩表', industry: '零售电商', usage: '导购员销售业绩提成', category: 'retail' },
  { id: 'retail-store', name: '门店绩效表', industry: '零售电商', usage: '多门店业绩对比分析', category: 'retail' },
  { id: 'retail-online', name: '电商运营表', industry: '零售电商', usage: '电商平台数据监控', category: 'retail' },

  // ========== 餐饮场景 (12个) ==========
  { id: 'restaurant-daily-sales', name: '餐饮日报表', industry: '餐饮', usage: '每日营收与客流统计', category: 'restaurant' },
  { id: 'restaurant-menu', name: '菜单管理表', industry: '餐饮', usage: '菜品定价与销售排行', category: 'restaurant' },
  { id: 'restaurant-ingredient', name: '食材采购表', industry: '餐饮', usage: '食材进货与成本核算', category: 'restaurant' },
  { id: 'restaurant-reservation', name: '预订管理表', industry: '餐饮', usage: '客户预订与包间安排', category: 'restaurant' },
  { id: 'restaurant-member', name: '会员储值表', industry: '餐饮', usage: '会员卡办理与消费', category: 'restaurant' },
  { id: 'restaurant-kitchen', name: '厨房出品表', industry: '餐饮', usage: '后厨出品与等待时间', category: 'restaurant' },
  { id: 'restaurant-staff', name: '员工排班表', industry: '餐饮', usage: '餐饮人员排班与考勤', category: 'restaurant' },
  { id: 'restaurant-supplier', name: '供应商报价表', industry: '餐饮', usage: '食材供应商比价管理', category: 'restaurant' },
  { id: 'restaurant-quality', name: '食品安全表', industry: '餐饮', usage: '食材溯源与保质期管理', category: 'restaurant' },
  { id: 'restaurant-delivery', name: '外卖接单表', industry: '餐饮', usage: '外卖平台订单管理', category: 'restaurant' },
  { id: 'restaurant-cost', name: '成本分析表', industry: '餐饮', usage: '菜品成本与毛利率分析', category: 'restaurant' },
  { id: 'restaurant-seasonal', name: '季节菜单表', industry: '餐饮', usage: '时令菜品更新管理', category: 'restaurant' },

  // ========== 教育培训场景 (12个) ==========
  { id: 'edu-enrollment', name: '招生登记表', industry: '教育培训', usage: '学员报名与课程安排', category: 'education' },
  { id: 'edu-attendance', name: '学员考勤表', industry: '教育培训', usage: '出勤记录与课时统计', category: 'education' },
  { id: 'edu-score', name: '成绩管理表', industry: '教育培训', usage: '学员成绩录入与分析', category: 'education' },
  { id: 'edu-teacher', name: '教师课时表', industry: '教育培训', usage: '教师排课与课时统计', category: 'education' },
  { id: 'edu-tuition', name: '学费收缴表', industry: '教育培训', usage: '课程费用与缴费记录', category: 'education' },
  { id: 'edu-course', name: '课程安排表', industry: '教育培训', usage: '课程表与教室安排', category: 'education' },
  { id: 'edu-assessment', name: '综合评价表', industry: '教育培训', usage: '学员多维度评估记录', category: 'education' },
  { id: 'edu-material', name: '教材库存表', industry: '教育培训', usage: '教材采购与库存管理', category: 'education' },
  { id: 'edu-exam', name: '考试安排表', industry: '教育培训', usage: '考试时间与监考安排', category: 'education' },
  { id: 'edu-homework', name: '作业管理表', industry: '教育培训', usage: '作业布置与批改记录', category: 'education' },
  { id: 'edu-parent', name: '家长沟通表', industry: '教育培训', usage: '家校沟通与反馈记录', category: 'education' },
  { id: 'edu-certificate', name: '证书发放表', industry: '教育培训', usage: '结业证书发放记录', category: 'education' },

  // ========== 医疗健康场景 (10个) ==========
  { id: 'health-patient', name: '患者信息表', industry: '医疗健康', usage: '患者档案与就诊记录', category: 'health' },
  { id: 'health-appointment', name: '预约挂号表', industry: '医疗健康', usage: '门诊预约与排班管理', category: 'health' },
  { id: 'health-prescription', name: '处方管理表', industry: '医疗健康', usage: '开药记录与用药跟踪', category: 'health' },
  { id: 'health-inspection', name: '检验报告表', industry: '医疗健康', usage: '化验检查结果记录', category: 'health' },
  { id: 'health-surgery', name: '手术安排表', industry: '医疗健康', usage: '手术排程与人员安排', category: 'health' },
  { id: 'health-bed', name: '床位管理表', industry: '医疗健康', usage: '住院床位使用与周转', category: 'health' },
  { id: 'health-drug', name: '药品库存表', industry: '医疗健康', usage: '药品采购与库存管理', category: 'health' },
  { id: 'health-equipment', name: '设备维保表', industry: '医疗健康', usage: '医疗设备维护记录', category: 'health' },
  { id: 'health-expense', name: '医疗费用表', industry: '医疗健康', usage: '患者费用与医保结算', category: 'health' },
  { id: 'health-staff', name: '医护排班表', industry: '医疗健康', usage: '医护人员值班安排', category: 'health' },

  // ========== 金融保险场景 (10个) ==========
  { id: 'finance-policy', name: '保单管理表', industry: '金融保险', usage: '保单录入与到期提醒', category: 'finance' },
  { id: 'finance-premium', name: '保费收缴表', industry: '金融保险', usage: '保费收取与续期管理', category: 'finance' },
  { id: 'finance-claim', name: '理赔处理表', industry: '金融保险', usage: '报案理赔流程跟踪', category: 'finance' },
  { id: 'finance-customer', name: '客户资产表', industry: '金融保险', usage: '客户资产配置记录', category: 'finance' },
  { id: 'finance-commission', name: '业绩佣金表', industry: '金融保险', usage: '业务员业绩与提成', category: 'finance' },
  { id: 'finance-investment', name: '投资台账表', industry: '金融保险', usage: '投资收益与持仓记录', category: 'finance' },
  { id: 'finance-loan', name: '贷款管理表', industry: '金融保险', usage: '贷款发放与还款跟踪', category: 'finance' },
  { id: 'finance-invoice', name: '发票管理表', industry: '金融保险', usage: '发票开具与抵扣记录', category: 'finance' },
  { id: 'finance-budget', name: '财务预算表', industry: '金融保险', usage: '年度预算编制执行', category: 'finance' },
  { id: 'finance-report', name: '财务报表', industry: '金融保险', usage: '资产负债表与利润表', category: 'finance' },

  // ========== 人力资源场景 (12个) ==========
  { id: 'hr-employee', name: '员工信息表', industry: '人力资源', usage: '员工档案与合同管理', category: 'hr' },
  { id: 'hr-attendance', name: '考勤记录表', industry: '人力资源', usage: '上下班打卡与请假', category: 'hr' },
  { id: 'hr-payroll', name: '工资发放表', industry: '人力资源', usage: '薪资核算与发放', category: 'hr' },
  { id: 'hr-recruit', name: '招聘记录表', industry: '人力资源', usage: '招聘信息与面试安排', category: 'hr' },
  { id: 'hr-performance', name: '绩效考核表', industry: '人力资源', usage: '员工KPI评估与打分', category: 'hr' },
  { id: 'hr-training', name: '培训记录表', industry: '人力资源', usage: '员工培训安排与参与', category: 'hr' },
  { id: 'hr-contract', name: '合同管理表', industry: '人力资源', usage: '合同签订与到期提醒', category: 'hr' },
  { id: 'hr-leave', name: '请假申请表', industry: '人力资源', usage: '请假审批与销假记录', category: 'hr' },
  { id: 'hr-overtime', name: '加班记录表', industry: '人力资源', usage: '加班申请与调休管理', category: 'hr' },
  { id: 'hr-resignation', name: '离职交接表', industry: '人力资源', usage: '员工离职办理与交接', category: 'hr' },
  { id: 'hr-bonus', name: '奖金分配表', industry: '人力资源', usage: '年终奖与绩效奖金分配', category: 'hr' },
  { id: 'hr-evaluate', name: '360评估表', industry: '人力资源', usage: '多维度360度评估', category: 'hr' },

  // ========== 办公行政场景 (10个) ==========
  { id: 'admin-stationery', name: '办公用品表', industry: '办公行政', usage: '办公用品采购与领用', category: 'admin' },
  { id: 'admin-vehicle', name: '公务用车表', industry: '办公行政', usage: '公车调度与里程统计', category: 'admin' },
  { id: 'admin-meeting', name: '会议室预约表', industry: '办公行政', usage: '会议室预约与使用记录', category: 'admin' },
  { id: 'admin-visitor', name: '来访登记表', industry: '办公行政', usage: '访客登记与接待记录', category: 'admin' },
  { id: 'admin-package', name: '快递收发表', industry: '办公行政', usage: '快递收发与签收管理', category: 'admin' },
  { id: 'admin-repair', name: '维修申请表', industry: '办公行政', usage: '设施报修与处理跟踪', category: 'admin' },
  { id: 'admin-seal', name: '印章使用表', industry: '办公行政', usage: '公章使用登记与审批', category: 'admin' },
  { id: 'admin-document', name: '文件传阅表', industry: '办公行政', usage: '文件传阅与签收记录', category: 'admin' },
  { id: 'admin-communication', name: '通讯录表', industry: '办公行政', usage: '企业内部通讯录管理', category: 'admin' },
  { id: 'admin-holiday', name: '节假日表', industry: '办公行政', usage: '年假管理与假期统计', category: 'admin' },

  // ========== 市场营销场景 (10个) ==========
  { id: 'marketing-campaign', name: '营销活动表', industry: '市场营销', usage: '活动策划与执行跟踪', category: 'marketing' },
  { id: 'marketing-lead', name: '线索跟进表', industry: '市场营销', usage: '潜在客户信息与跟进', category: 'marketing' },
  { id: 'marketing-opportunity', name: '商机管理表', industry: '市场营销', usage: '销售商机挖掘与转化', category: 'marketing' },
  { id: 'marketing-channel', name: '渠道管理表', industry: '市场营销', usage: '渠道拓展与业绩统计', category: 'marketing' },
  { id: 'marketing-content', name: '内容发布表', industry: '市场营销', usage: '新媒体内容排期发布', category: 'marketing' },
  { id: 'marketing-ad', name: '广告投放表', industry: '市场营销', usage: '广告预算与效果追踪', category: 'marketing' },
  { id: 'marketing-competitor', name: '竞品分析表', industry: '市场营销', usage: '竞品动态与对比分析', category: 'marketing' },
  { id: 'marketing-price', name: '价格管理表', industry: '市场营销', usage: '产品价格体系维护', category: 'marketing' },
  { id: 'marketing-partner', name: '合作伙伴表', industry: '市场营销', usage: '异业合作与资源整合', category: 'marketing' },
  { id: 'marketing-report', name: '市场周报', industry: '市场营销', usage: '市场数据周度汇总', category: 'marketing' },

  // ========== 供应链物流场景 (12个) ==========
  { id: 'supply-purchase', name: '采购订单表', industry: '供应链物流', usage: '采购申请与订单跟踪', category: 'supply' },
  { id: 'supply-inbound', name: '入库登记表', industry: '供应链物流', usage: '到货验收与入库记录', category: 'supply' },
  { id: 'supply-outbound', name: '出库登记表', industry: '供应链物流', usage: '发货出库与物流跟踪', category: 'supply' },
  { id: 'supply-inventory', name: '库存台账表', industry: '供应链物流', usage: '实时库存与账务核对', category: 'supply' },
  { id: 'supply-transfer', name: '调拨记录表', industry: '供应链物流', usage: '仓库调拨与转移记录', category: 'supply' },
  { id: 'supply-return', name: '退货处理表', industry: '供应链物流', usage: '退货入库与供应商退货', category: 'supply' },
  { id: 'supply-express', name: '快递对账表', industry: '供应链物流', usage: '快递费用结算对账', category: 'supply' },
  { id: 'supply-route', name: '线路规划表', industry: '供应链物流', usage: '配送线路优化规划', category: 'supply' },
  { id: 'supply-driver', name: '司机配送表', industry: '供应链物流', usage: '司机任务与里程统计', category: 'supply' },
  { id: 'supply-warehouse', name: '仓库盘点表', industry: '供应链物流', usage: '定期盘点与差异分析', category: 'supply' },
  { id: 'supply-pack', name: '包材用量表', industry: '供应链物流', usage: '包装材料消耗统计', category: 'supply' },
  { id: 'supply-supplier', name: '供应商评估表', industry: '供应链物流', usage: '供应商质量与交期评估', category: 'supply' },

  // ========== 制造业场景 (10个) ==========
  { id: 'mfg-production', name: '生产排程表', industry: '制造业', usage: '生产计划与车间排程', category: 'manufacturing' },
  { id: 'mfg-workorder', name: '工单管理表', industry: '制造业', usage: '工单下发与完成统计', category: 'manufacturing' },
  { id: 'mfg-quality', name: '质检记录表', industry: '制造业', usage: '产品检验与不良分析', category: 'manufacturing' },
  { id: 'mfg-material', name: '物料清单表', industry: '制造业', usage: 'BOM配方与物料需求', category: 'manufacturing' },
  { id: 'mfg-equipment', name: '设备点检表', industry: '制造业', usage: '设备日常点检与记录', category: 'manufacturing' },
  { id: 'mfg-maintenance', name: '设备维修表', industry: '制造业', usage: '设备故障报修与维修', category: 'manufacturing' },
  { id: 'mfg-energy', name: '能耗统计表', industry: '制造业', usage: '水电燃气消耗统计', category: 'manufacturing' },
  { id: 'mfg-output', name: '产量日报表', industry: '制造业', usage: '车间日产量统计汇总', category: 'manufacturing' },
  { id: 'mfg-defect', name: '不良品分析表', industry: '制造业', usage: '不良原因与改善跟踪', category: 'manufacturing' },
  { id: 'mfg-cost', name: '生产成本表', industry: '制造业', usage: '工序成本与核算分析', category: 'manufacturing' },

  // ========== 地产物业场景 (10个) ==========
  { id: 'realty-property', name: '物业收费表', industry: '地产物业', usage: '物业费收缴与欠费管理', category: 'realty' },
  { id: 'realty-owner', name: '业主信息表', industry: '地产物业', usage: '业主档案与联系方式', category: 'realty' },
  { id: 'realty-unit', name: '房源管理表', industry: '地产物业', usage: '房屋状态与租售信息', category: 'realty' },
  { id: 'realty-lease', name: '租赁台账表', industry: '地产物业', usage: '租约管理与租金收缴', category: 'realty' },
  { id: 'realty-maintenance', name: '维修派工表', industry: '地产物业', usage: '业主报修与处理跟踪', category: 'realty' },
  { id: 'realty-parking', name: '车位管理表', industry: '地产物业', usage: '车位售卖与月卡管理', category: 'realty' },
  { id: 'realty-clean', name: '保洁巡检表', industry: '地产物业', usage: '公共区域保洁安排', category: 'realty' },
  { id: 'realty-security', name: '安保值班表', industry: '地产物业', usage: '保安排班与巡查记录', category: 'realty' },
  { id: 'realty-complaint', name: '投诉处理表', industry: '地产物业', usage: '业主投诉跟踪回访', category: 'realty' },
  { id: 'realty-community', name: '社区活动表', industry: '地产物业', usage: '社区文化活动安排', category: 'realty' },

  // ========== 酒店旅游场景 (10个) ==========
  { id: 'hotel-booking', name: '客房预订表', industry: '酒店旅游', usage: '房间预订与入住登记', category: 'hotel' },
  { id: 'hotel-checkin', name: '入住登记表', industry: '酒店旅游', usage: '宾客信息与房态管理', category: 'hotel' },
  { id: 'hotel-room', name: '房态管理表', industry: '酒店旅游', usage: '房间状态与清洁安排', category: 'hotel' },
  { id: 'hotel-consumption', name: '消费记账表', industry: '酒店旅游', usage: '客房消费与结账清算', category: 'hotel' },
  { id: 'hotel-staff', name: '酒店排班表', industry: '酒店旅游', usage: '前台与客房人员排班', category: 'hotel' },
  { id: 'hotel-supply', name: '物资盘点表', industry: '酒店旅游', usage: '酒店物资与低耗盘点', category: 'hotel' },
  { id: 'hotel-review', name: '客户评价表', industry: '酒店旅游', usage: '住客反馈与满意度', category: 'hotel' },
  { id: 'tour-ticket', name: '门票销售表', industry: '酒店旅游', usage: '景区门票与入园统计', category: 'hotel' },
  { id: 'tour-package', name: '旅游套餐表', industry: '酒店旅游', usage: '线路套餐与预订管理', category: 'hotel' },
  { id: 'tour-guide', name: '导游安排表', industry: '酒店旅游', usage: '导游调度与团期安排', category: 'hotel' },

  // ========== 媒体娱乐场景 (8个) ==========
  { id: 'media-content', name: '内容发布表', industry: '媒体娱乐', usage: '文章视频发布排期', category: 'media' },
  { id: 'media-dashboard', name: '播放数据表', industry: '媒体娱乐', usage: '内容播放量与互动统计', category: 'media' },
  { id: 'media-member', name: '会员管理表', industry: '媒体娱乐', usage: '付费会员与权益管理', category: 'media' },
  { id: 'media-ad', name: '广告排期表', industry: '媒体娱乐', usage: '广告投放排期与收益', category: 'media' },
  { id: 'media-collaborator', name: '创作者表', industry: '媒体娱乐', usage: 'UP主/博主信息与合作', category: 'media' },
  { id: 'media-income', name: '收益分成表', industry: '媒体娱乐', usage: '创作者收益与结算', category: 'media' },
  { id: 'media-hot', name: '热门榜单表', industry: '媒体娱乐', usage: '内容热度排行分析', category: 'media' },
  { id: 'media-comment', name: '评论管理表', industry: '媒体娱乐', usage: '用户评论审核与处理', category: 'media' },

  // ========== 法律服务场景 (8个) ==========
  { id: 'legal-case', name: '案件管理表', industry: '法律服务', usage: '案件信息与进度跟踪', category: 'legal' },
  { id: 'legal-client', name: '委托人表', industry: '法律服务', usage: '当事人信息与沟通记录', category: 'legal' },
  { id: 'legal-document', name: '文书台账表', industry: '法律服务', usage: '法律文书归档管理', category: 'legal' },
  { id: 'legal-hearing', name: '开庭安排表', industry: '法律服务', usage: '庭审排期与出庭准备', category: 'legal' },
  { id: 'legal-fee', name: '收费记录表', industry: '法律服务', usage: '律师费收取与结算', category: 'legal' },
  { id: 'legal-deadline', name: '期限提醒表', industry: '法律服务', usage: '诉讼时效与法定期限', category: 'legal' },
  { id: 'legal-calendar', name: '律师日程表', industry: '法律服务', usage: '律师日程与会议安排', category: 'legal' },
  { id: 'legal-research', name: '案例研究表', industry: '法律服务', usage: '同类案件检索分析', category: 'legal' },

  // ========== 农业畜牧场景 (8个) ==========
  { id: 'agri-crop', name: '种植记录表', industry: '农业畜牧', usage: '作物种植与生长记录', category: 'agri' },
  { id: 'agri-harvest', name: '收获统计表', industry: '农业畜牧', usage: '农产品收获与销售', category: 'agri' },
  { id: 'agri-feed', name: '饲料投喂表', industry: '农业畜牧', usage: '养殖投喂记录统计', category: 'agri' },
  { id: 'agri-breeding', name: '繁育记录表', industry: '农业畜牧', usage: '种畜繁育与仔畜记录', category: 'agri' },
  { id: 'agri-inventory', name: '存栏盘点表', industry: '农业畜牧', usage: '畜禽存栏数量统计', category: 'agri' },
  { id: 'agri-vaccine', name: '疫苗接种表', industry: '农业畜牧', usage: '动物免疫接种记录', category: 'agri' },
  { id: 'agri-equipment', name: '农机使用表', industry: '农业畜牧', usage: '农业机械使用与维护', category: 'agri' },
  { id: 'agri-weather', name: '农事记录表', industry: '农业畜牧', usage: '气象灾害与农事安排', category: 'agri' },

  // ========== 政府公共服务场景 (8个) ==========
  { id: 'gov-business', name: '办件登记表', industry: '政府公共服务', usage: '业务受理与办理记录', category: 'gov' },
  { id: 'gov-approval', name: '审批流程表', industry: '政府公共服务', usage: '事项审批进度跟踪', category: 'gov' },
  { id: 'gov-complaint', name: '投诉建议表', industry: '政府公共服务', usage: '群众投诉与建议处理', category: 'gov' },
  { id: 'gov-inspection', name: '巡查记录表', industry: '政府公共服务', usage: '执法人员巡查轨迹', category: 'gov' },
  { id: 'gov-license', name: '证照管理表', industry: '政府公共服务', usage: '证件办理与到期换证', category: 'gov' },
  { id: 'gov-petition', name: '信访处理表', industry: '政府公共服务', usage: '信访件登记与答复', category: 'gov' },
  { id: 'gov-statistics', name: '统计报表表', industry: '政府公共服务', usage: '业务数据月度统计', category: 'gov' },
  { id: 'gov-publicity', name: '公示公告表', industry: '政府公共服务', usage: '政策文件与公告发布', category: 'gov' },

  // ========== 科技互联网场景 (8个) ==========
  { id: 'tech-project', name: '项目看板表', industry: '科技互联网', usage: '研发项目与任务跟踪', category: 'tech' },
  { id: 'tech-bug', name: '缺陷管理表', industry: '科技互联网', usage: 'Bug提交与修复跟踪', category: 'tech' },
  { id: 'tech-deployment', name: '发布记录表', industry: '科技互联网', usage: '版本发布与变更记录', category: 'tech' },
  { id: 'tech-server', name: '服务器监控表', industry: '科技互联网', usage: '服务器状态与告警', category: 'tech' },
  { id: 'tech-domain', name: '域名管理表', industry: '科技互联网', usage: '域名备案与到期提醒', category: 'tech' },
  { id: 'tech-api', name: '接口文档表', industry: '科技互联网', usage: 'API接口定义与管理', category: 'tech' },
  { id: 'tech-log', name: '日志分析表', industry: '科技互联网', usage: '系统日志与异常追踪', category: 'tech' },
  { id: 'tech-copyright', name: '版权登记表', industry: '科技互联网', usage: '软件著作权与专利', category: 'tech' },

  // ========== 环保环卫场景 (6个) ==========
  { id: 'env-waste', name: '垃圾清运表', industry: '环保环卫', usage: '垃圾收运与处理记录', category: 'env' },
  { id: 'env-classify', name: '分类统计表', industry: '环保环卫', usage: '垃圾分类质量统计', category: 'env' },
  { id: 'env-vehicle', name: '作业车辆表', industry: '环保环卫', usage: '环卫车辆调度与油耗', category: 'env' },
  { id: 'env-clean', name: '保洁考核表', industry: '环保环卫', usage: '保洁质量检查评分', category: 'env' },
  { id: 'env-incident', name: '突发事件表', industry: '环保环卫', usage: '环境卫生突发事件', category: 'env' },
  { id: 'env-facility', name: '设施巡检表', industry: '环保环卫', usage: '环卫设施维护巡检', category: 'env' },

  // ========== 体育健身场景 (6个) ==========
  { id: 'sports-member', name: '会员管理表', industry: '体育健身', usage: '会员档案与有效期', category: 'sports' },
  { id: 'sports-attendance', name: '签到记录表', industry: '体育健身', usage: '会员入场签到统计', category: 'sports' },
  { id: 'sports-course', name: '团课安排表', industry: '体育健身', usage: '团体课程排期预约', category: 'sports' },
  { id: 'sports-coach', name: '私教课时表', industry: '体育健身', usage: '私教课程与课时统计', category: 'sports' },
  { id: 'sports-sale', name: '会籍销售表', industry: '体育健身', usage: '会籍卡销售与提成', category: 'sports' },
  { id: 'sports-body', name: '体测记录表', industry: '体育健身', usage: '会员体测数据追踪', category: 'sports' },

  // ========== 出版传媒场景 (6个) ==========
  { id: 'publish-manuscript', name: '稿件登记表', industry: '出版传媒', usage: '投稿管理与审稿流程', category: 'publish' },
  { id: 'publish-print', name: '印刷清单表', industry: '出版传媒', usage: '印刷数量与成本核算', category: 'publish' },
  { id: 'publish-distribute', name: '发行记录表', industry: '出版传媒', usage: '出版物发行与销售', category: 'publish' },
  { id: 'publish-return', name: '退货统计表', industry: '出版传媒', usage: '出版物退货与折损', category: 'publish' },
  { id: 'publish-author', name: '作者管理表', industry: '出版传媒', usage: '作者档案与版税结算', category: 'publish' },
  { id: 'publish-copyright', name: '版权授权表', industry: '出版传媒', usage: '版权输出与授权记录', category: 'publish' },

  // ========== 美业服务场景 (5个) ==========
  { id: 'beauty-appointment', name: '预约排班表', industry: '美业服务', usage: '客户预约与技师排班', category: 'beauty' },
  { id: 'beauty-member', name: '会员管理表', industry: '美业服务', usage: '会员信息与消费记录', category: 'beauty' },
  { id: 'beauty-service', name: '服务项目表', industry: '美业服务', usage: '服务项目定价与销量', category: 'beauty' },
  { id: 'beauty-consumable', name: '耗材管理表', industry: '美业服务', usage: '物料消耗与补货管理', category: 'beauty' },
  { id: 'beauty-revenue', name: '营收日报表', industry: '美业服务', usage: '日/周/月营收汇总', category: 'beauty' },

  // ========== 小微团队场景 (5个) ==========
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
  const auth = await verifyAuth(request);
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { 'Content-Type': 'application/json' } });
  }

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
  const { sceneId, userRequirement } = body as {
    sceneId?: string;
    userRequirement: string;
  };

  const scene = sceneId ? SCENE_TEMPLATES.find(t => t.id === sceneId) : null;
  const sceneDesc = scene
    ? `行业：${scene.industry}，用途：${scene.usage}（${scene.name}）`
    : '用户自定义场景';

  // 智能体自动判断深度：根据需求复杂度自适应
  const isComplex = userRequirement.length > 30 ||
    /设计|完整|详细|深度|方案|结构|公式|统计|分析/.test(userRequirement);

  const modeInstruction = isComplex
    ? `用户需求较深入，请主动设计完整的表格方案，包括：
1. 台账用途和业务价值说明
2. 完整字段清单（含字段类型、是否必填、枚举选项、计算公式说明）
3. 3-5条演示示例假数据
4. 统计公式设计（求和、计数、毛利等）
5. 表格结构设计说明`
    : `用户需求较明确，请生成简洁的表格方案，包含字段清单、示例数据和设计说明。`;

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
    } catch {
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
