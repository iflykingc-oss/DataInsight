/**
 * DataInsight i18n — 轻量国际化方案
 * 
 * 支持 zh-CN / en-US 两种语言
 * - 所有翻译键值对集中管理
 * - 通过 React Context 提供全局访问
 * - 语言偏好持久化到 localStorage
 * - 侧边栏/顶部栏提供切换入口
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================
// 语言定义
// ============================================
export type Locale = 'zh-CN' | 'en-US';

export const LOCALE_OPTIONS: { value: Locale; label: string; flag: string }[] = [
  { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { value: 'en-US', label: 'English', flag: '🇺🇸' },
];

// ============================================
// 翻译字典
// ============================================
const translations: Record<Locale, Record<string, string>> = {
  'zh-CN': {
    // === 通用 ===
    'common.confirm': '确认',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.close': '关闭',
    'common.search': '搜索',
    'common.loading': '加载中...',
    'common.success': '操作成功',
    'common.error': '操作失败',
    'common.noData': '暂无数据',
    'common.upload': '上传',
    'common.export': '导出',
    'common.download': '下载',
    'common.refresh': '刷新',
    'common.more': '更多',
    'common.back': '返回',
    'common.next': '下一步',
    'common.previous': '上一步',
    'common.reset': '重置',
    'common.all': '全部',
    'common.enabled': '已启用',
    'common.disabled': '已禁用',
    'common.yes': '是',
    'common.no': '否',
    'common.or': '或',

    // === 侧边栏 ===
    'sidebar.workbench': '工作台',
    'sidebar.coreFeatures': '核心功能',
    'sidebar.moreTools': '更多工具',
    'sidebar.aiTableBuilder': 'AI建表',
    'sidebar.dataTable': '数据表格',
    'sidebar.dataPrep': '数据准备',
    'sidebar.insights': '智能洞察',
    'sidebar.visualization': '可视化',
    'sidebar.metricSystem': '指标体系',
    'sidebar.chartCenter': '图表中心',
    'sidebar.dataStory': '数据故事',
    'sidebar.industryScene': '行业场景',
    'sidebar.aiChat': 'AI问数',
    'sidebar.aiMultimodal': 'AI多模态',
    'sidebar.formCollection': '表单收集',
    'sidebar.sqlLab': 'SQL查询',
    'sidebar.reportExport': '报表导出',
    'sidebar.pricing': '定价方案',
    'sidebar.dataCompliance': '数据合规',
    'sidebar.settings': '设置',
    'sidebar.login': '登录',
    'sidebar.logout': '退出登录',
    'sidebar.admin': '后台管理',
    'sidebar.adminPanel': '后台管理',
    'sidebar.workspace': '工作台',
    'sidebar.expand': '展开侧边栏',
    'sidebar.collapse': '收起',

    // === 首页 ===
    'home.title': '上传数据，开始智能分析',
    'home.subtitle': '支持 Excel、CSV 文件上传，AI 自动生成分析报告和可视化仪表盘',
    'home.quickStart': '快捷入口',
    'home.uploadFile': '上传文件',
    'home.aiBuildTable': 'AI建表',
    'home.smartInsight': '智能洞察',
    'home.visualDashboard': '可视化仪表盘',
    'home.sceneSelect': '选择你的业务场景',
    'home.sceneRetail': '零售',
    'home.sceneFinance': '金融',
    'home.sceneEducation': '教育',
    'home.sceneHealthcare': '医疗',
    'home.sceneManufacturing': '制造',
    'home.sceneLogistics': '物流',
    'home.recentData': '近期数据',
    'home.noData': '还没有上传过数据',
    'home.noDataHint': '上传表格文件即可开始分析',
    'home.dragHint': '拖拽文件到此处，或',
    'home.clickUpload': '点击上传',
    'home.supportFormat': '支持 .xlsx、.xls、.csv 格式',

    // === 数据表格 ===
    'dataTable.title': '数据表格',
    'dataTable.aiField': 'AI字段',
    'dataTable.aiFormula': 'AI公式',
    'dataTable.linkedTable': '关联表',
    'dataTable.automation': '自动化',
    'dataTable.comments': '评论',
    'dataTable.view': '视图',
    'dataTable.tableView': '表格视图',
    'dataTable.kanbanView': '看板视图',
    'dataTable.calendarView': '日历视图',
    'dataTable.ganttView': '甘特图',
    'dataTable.pivotView': '透视表',
    'dataTable.emptyState': '请上传数据文件以开始使用',
    'dataTable.emptyHint': '支持 Excel (.xlsx/.xls) 和 CSV 文件',
    'dataTable.addRow': '添加行',
    'dataTable.filter': '筛选',
    'dataTable.sort': '排序',
    'dataTable.totalRows': '共 {count} 行',

    // === AI 功能 ===
    'ai.askPlaceholder': '输入你的问题，AI将帮你分析数据...',
    'ai.thinking': 'AI 正在思考...',
    'ai.generate': 'AI 生成',
    'ai.regenerate': '重新生成',
    'ai.copy': '复制',
    'ai.apply': '应用',
    'ai.noModel': '未配置AI模型',
    'ai.noModelHint': '请先在设置中配置AI模型',
    'ai.configModel': '配置AI模型',
    'ai.insight': 'AI洞察',
    'ai.report': '分析报告',
    'ai.deepAnalysis': '深度分析',
    'ai.attribution': '归因分析',
    'ai.prediction': '趋势预测',

    // === 数据准备 ===
    'dataPrep.title': '数据准备',
    'dataPrep.dataSource': '数据源',
    'dataPrep.cleaning': '数据清洗',
    'dataPrep.quality': '数据质量',
    'dataPrep.smart': '智能准备',

    // === 可视化 ===
    'viz.title': '可视化',
    'viz.dashboard': '仪表盘',
    'viz.aiGenerate': 'AI生成',
    'viz.designer': '设计器',
    'viz.chartCenter': '图表中心',
    'viz.aiRecommend': 'AI推荐',
    'viz.advanced': '高级图表',
    'viz.echarts': 'ECharts',

    // === 工具 ===
    'tools.sqlLab': 'SQL查询',
    'tools.formCollection': '表单收集',
    'tools.reportExport': '报表导出',
    'tools.multimodal': 'AI多模态',

    // === 设置 ===
    'settings.title': '设置与管理',
    'settings.currentModel': '当前模型',
    'settings.dataAlert': '数据预警',
    'settings.versionSnapshot': '版本快照',
    'settings.templateManager': '模板管理',
    'settings.general': '通用设置',
    'settings.notification': '通知渠道',
    'settings.permissions': '权限管理',
    'settings.darkMode': '深色模式',
    'settings.darkModeOn': '已开启深色主题',
    'settings.darkModeOff': '开启深色主题',
    'settings.dataSecurity': '数据安全声明',
    'settings.dataSecurityDesc': '除账号权限配置和表单收集数据外，系统不保存任何用户数据',
    'settings.exportConfig': '导出配置',
    'settings.configManagement': '配置管理',
    'settings.adminConfig': '由管理员配置',
    'settings.adminConfigHint': '您当前使用的是管理员配置的AI模型。如需自定义模型，请联系管理员开启权限。',

    // === 登录 ===
    'login.title': '登录 DataInsight',
    'login.username': '用户名或邮箱',
    'login.password': '密码',
    'login.submit': '登录',
    'login.register': '注册',
    'login.noAccount': '没有账号？',
    'login.hasAccount': '已有账号？',
    'login.forgotPassword': '忘记密码？',
    'login.emailPlaceholder': '请输入邮箱',
    'login.codePlaceholder': '验证码',
    'login.sendCode': '发送验证码',
    'login.resendCode': '{seconds}秒后重发',
    'login.registerTitle': '注册 DataInsight',
    'login.namePlaceholder': '请输入用户名',

    // === 管理后台 ===
    'admin.title': '管理后台',
    'admin.users': '用户管理',
    'admin.loginLogs': '登录日志',
    'admin.activityLogs': '用户日志',
    'admin.aiConfig': 'AI模型配置',
    'admin.usageStats': '使用统计',
    'admin.plans': '套餐配置',
    'admin.announcements': '公告管理',
    'admin.systemSettings': '系统设置',
    'admin.backToUser': '返回用户端',

    // === 图表 ===
    'chart.bar': '柱状图',
    'chart.line': '折线图',
    'chart.pie': '饼图',
    'chart.scatter': '散点图',
    'chart.area': '面积图',
    'chart.radar': '雷达图',
    'chart.funnel': '漏斗图',
    'chart.heatmap': '热力图',
    'chart.boxplot': '箱线图',
    'chart.sankey': '桑基图',
    'chart.waterfall': '瀑布图',
    'chart.tree': '树图',
    'chart.gauge': '仪表盘',
    'chart.wordcloud': '词云',
    'chart.combo': '组合图',

    // === 指标 ===
    'metric.ai': 'AI指标',
    'metric.management': '指标管理',
    'metric.semantic': '指标语义层',
    'metric.total': '总计',
    'metric.average': '平均值',
    'metric.count': '计数',
    'metric.max': '最大值',
    'metric.min': '最小值',
    'metric.median': '中位数',
    'metric.stdDev': '标准差',

    // === 数据故事 ===
    'story.title': '数据故事',
    'story.generate': 'AI 生成故事',
    'story.executive': '高管摘要',
    'story.detailed': '详细报告',
    'story.interactive': '交互式',

    // === 行业场景 ===
    'industry.title': '行业场景',
    'industry.detect': 'AI 识别行业',
    'industry.retail': '零售',
    'industry.finance': '金融',
    'industry.education': '教育',
    'industry.healthcare': '医疗',
    'industry.manufacturing': '制造',
    'industry.logistics': '物流',
    'industry.hrm': '人力资源',
    'industry.tech': '科技',

    // === 多模态 ===
    'multimodal.generateImage': '生图',
    'multimodal.imageToText': '图转文',
    'multimodal.textToImage': '文转图',
    'multimodal.imageToTable': '图转表',

    // === 表单 ===
    'form.builder': '表单设计',
    'form.dataManagement': '数据管理',
    'form.share': '分享表单',
    'form.preview': '预览',
    'form.submit': '提交',
    'form.published': '已发布',
    'form.draft': '草稿',
    'form.closed': '已截止',

    // === SQL Lab ===
    'sql.title': 'SQL查询',
    'sql.placeholder': '输入 SQL 查询语句...',
    'sql.run': '执行',
    'sql.clear': '清空',
    'sql.result': '查询结果',
    'sql.noResult': '暂无查询结果',
    'sql.example': '示例查询',

    // === 报表导出 ===
    'report.title': '报表',
    'report.export': '导出',
    'report.share': '分享',
    'report.appDesign': '应用设计',

    // Pricing
    'pricing.title': '选择适合你的方案',
    'pricing.subtitle': '从免费开始，按需升级',
    'pricing.monthly': '月付',
    'pricing.yearly': '年付',
    'pricing.save': '省2个月',
    'pricing.free': '免费版',
    'pricing.pro': '专业版',
    'pricing.enterprise': '企业版',
    'pricing.currentPlan': '当前方案',
    'pricing.upgrade': '升级',
    'pricing.contact': '联系我们',
    'pricing.aiCalls': 'AI调用次数/月',
    'pricing.maxFile': '最大文件大小',
    'pricing.maxProjects': '最大项目数',
    'pricing.unlimited': '不限',
    'pricing.chartTypes': '图表类型',
    'pricing.basicCharts': '基础图表',
    'pricing.allCharts': '全部图表',
    'pricing.exportFormats': '导出格式',
    'pricing.csvOnly': '仅CSV',
    'pricing.allFormats': '全部格式',
    'pricing.customMetrics': '自定义指标',
    'pricing.dataStory': '数据故事',
    'pricing.nl2dashboard': 'AI生成仪表盘',
    'pricing.apiAccess': 'API访问',
    'pricing.support': '技术支持',
    'pricing.community': '社区',
    'pricing.emailSupport': '邮件',
    'pricing.prioritySupport': '优先',
    'pricing.aiCallsUsed': 'AI调用已用',
    'pricing.of': '/',
    'pricing.upgradeCta': '升级解锁更多AI调用',
    'pricing.popular': '最受欢迎',

    // Compliance
    'compliance.title': '数据合规中心',
    'compliance.subtitle': '数据安全与隐私保护',
    'compliance.overview': '合规概览',
    'compliance.dataExport': '数据导出',
    'compliance.dataDelete': '数据删除',
    'compliance.auditLog': '审计日志',
    'compliance.privacyPolicy': '隐私政策',
    'compliance.gdpr': 'GDPR',
    'compliance.ccpa': 'CCPA',
    'compliance.encryption': '传输加密',
    'compliance.dataRetention': '数据保留',
    'compliance.rightToErase': '被遗忘权',
    'compliance.exportMyData': '导出我的数据',
    'compliance.deleteMyData': '删除我的数据',
    'compliance.deleteWarning': '此操作不可逆，将永久删除您所有个人数据',
    'compliance.confirmDelete': '确认删除',
    'compliance.cancel': '取消',
    'compliance.lastExport': '上次导出',
    'compliance.never': '从未',
    'compliance.enabled': '已启用',
    'compliance.disabled': '未启用',
    'compliance.compliant': '合规',
    'compliance.notCompliant': '不合规',
    'compliance.tls13': 'TLS 1.3 传输加密',
    'compliance.aes256': 'AES-256 存储加密',
    'compliance.dataResidency': '数据驻留',
    'compliance.rights': '您的权利',
    'compliance.rightAccess': '访问权 - 获取您的数据副本',
    'compliance.rightRectify': '更正权 - 修正不准确的数据',
    'compliance.rightErase': '删除权 - 要求删除您的数据',
    'compliance.rightPortability': '可携权 - 以机器可读格式导出数据',
    'compliance.rightObject': '反对权 - 拒绝数据处理',
  },

  'en-US': {
    // === Common ===
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.noData': 'No data',
    'common.upload': 'Upload',
    'common.export': 'Export',
    'common.download': 'Download',
    'common.refresh': 'Refresh',
    'common.more': 'More',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.reset': 'Reset',
    'common.all': 'All',
    'common.enabled': 'Enabled',
    'common.disabled': 'Disabled',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.or': 'or',

    // === Sidebar ===
    'sidebar.workbench': 'Workbench',
    'sidebar.coreFeatures': 'Core Features',
    'sidebar.moreTools': 'More Tools',
    'sidebar.aiTableBuilder': 'AI Table Builder',
    'sidebar.dataTable': 'Data Table',
    'sidebar.dataPrep': 'Data Prep',
    'sidebar.insights': 'Smart Insights',
    'sidebar.visualization': 'Visualization',
    'sidebar.metricSystem': 'Metrics',
    'sidebar.chartCenter': 'Chart Center',
    'sidebar.dataStory': 'Data Story',
    'sidebar.industryScene': 'Industry',
    'sidebar.aiChat': 'AI Chat',
    'sidebar.aiMultimodal': 'AI Multimodal',
    'sidebar.formCollection': 'Forms',
    'sidebar.sqlLab': 'SQL Lab',
    'sidebar.reportExport': 'Report & Export',
    'sidebar.pricing': 'Pricing',
    'sidebar.dataCompliance': 'Data Compliance',
    'sidebar.settings': 'Settings',
    'sidebar.login': 'Login',
    'sidebar.logout': 'Logout',
    'sidebar.admin': 'Admin',
    'sidebar.adminPanel': 'Admin Panel',
    'sidebar.workspace': 'Workbench',
    'sidebar.expand': 'Expand Sidebar',
    'sidebar.collapse': 'Collapse',

    // === Home ===
    'home.title': 'Upload Data, Start Smart Analysis',
    'home.subtitle': 'Support Excel, CSV file upload. AI auto-generates analysis reports and visual dashboards',
    'home.quickStart': 'Quick Start',
    'home.uploadFile': 'Upload File',
    'home.aiBuildTable': 'AI Table Builder',
    'home.smartInsight': 'Smart Insights',
    'home.visualDashboard': 'Visual Dashboard',
    'home.sceneSelect': 'Select Your Business Scenario',
    'home.sceneRetail': 'Retail',
    'home.sceneFinance': 'Finance',
    'home.sceneEducation': 'Education',
    'home.sceneHealthcare': 'Healthcare',
    'home.sceneManufacturing': 'Manufacturing',
    'home.sceneLogistics': 'Logistics',
    'home.recentData': 'Recent Data',
    'home.noData': 'No data uploaded yet',
    'home.noDataHint': 'Upload a spreadsheet to start analyzing',
    'home.dragHint': 'Drag files here, or',
    'home.clickUpload': 'Click to Upload',
    'home.supportFormat': 'Supports .xlsx, .xls, .csv formats',

    // === Data Table ===
    'dataTable.title': 'Data Table',
    'dataTable.aiField': 'AI Fields',
    'dataTable.aiFormula': 'AI Formula',
    'dataTable.linkedTable': 'Linked Tables',
    'dataTable.automation': 'Automation',
    'dataTable.comments': 'Comments',
    'dataTable.view': 'View',
    'dataTable.tableView': 'Table View',
    'dataTable.kanbanView': 'Kanban View',
    'dataTable.calendarView': 'Calendar View',
    'dataTable.ganttView': 'Gantt Chart',
    'dataTable.pivotView': 'Pivot Table',
    'dataTable.emptyState': 'Please upload a data file to get started',
    'dataTable.emptyHint': 'Supports Excel (.xlsx/.xls) and CSV files',
    'dataTable.addRow': 'Add Row',
    'dataTable.filter': 'Filter',
    'dataTable.sort': 'Sort',
    'dataTable.totalRows': '{count} rows total',

    // === AI ===
    'ai.askPlaceholder': 'Enter your question, AI will help analyze...',
    'ai.thinking': 'AI is thinking...',
    'ai.generate': 'AI Generate',
    'ai.regenerate': 'Regenerate',
    'ai.copy': 'Copy',
    'ai.apply': 'Apply',
    'ai.noModel': 'AI Model Not Configured',
    'ai.noModelHint': 'Please configure an AI model in settings first',
    'ai.configModel': 'Configure AI Model',
    'ai.insight': 'AI Insights',
    'ai.report': 'Analysis Report',
    'ai.deepAnalysis': 'Deep Analysis',
    'ai.attribution': 'Attribution Analysis',
    'ai.prediction': 'Trend Prediction',

    // === Data Prep ===
    'dataPrep.title': 'Data Prep',
    'dataPrep.dataSource': 'Data Source',
    'dataPrep.cleaning': 'Data Cleaning',
    'dataPrep.quality': 'Data Quality',
    'dataPrep.smart': 'Smart Prep',

    // === Visualization ===
    'viz.title': 'Visualization',
    'viz.dashboard': 'Dashboard',
    'viz.aiGenerate': 'AI Generate',
    'viz.designer': 'Designer',
    'viz.chartCenter': 'Chart Center',
    'viz.aiRecommend': 'AI Recommend',
    'viz.advanced': 'Advanced',
    'viz.echarts': 'ECharts',

    // === Tools ===
    'tools.sqlLab': 'SQL Lab',
    'tools.formCollection': 'Forms',
    'tools.reportExport': 'Report & Export',
    'tools.multimodal': 'AI Multimodal',

    // === Settings ===
    'settings.title': 'Settings & Management',
    'settings.currentModel': 'Current Model',
    'settings.dataAlert': 'Data Alerts',
    'settings.versionSnapshot': 'Version Snapshots',
    'settings.templateManager': 'Template Manager',
    'settings.general': 'General',
    'settings.notification': 'Notifications',
    'settings.permissions': 'Permissions',
    'settings.darkMode': 'Dark Mode',
    'settings.darkModeOn': 'Dark theme enabled',
    'settings.darkModeOff': 'Enable dark theme',
    'settings.dataSecurity': 'Data Security Statement',
    'settings.dataSecurityDesc': 'Except for account permissions and form collection data, the system does not store any user data',
    'settings.exportConfig': 'Export Config',
    'settings.configManagement': 'Config Management',
    'settings.adminConfig': 'Configured by Admin',
    'settings.adminConfigHint': 'You are currently using the admin-configured AI model. Contact admin to enable custom model access.',

    // === Login ===
    'login.title': 'Login to DataInsight',
    'login.username': 'Username or Email',
    'login.password': 'Password',
    'login.submit': 'Login',
    'login.register': 'Register',
    'login.noAccount': "Don't have an account?",
    'login.hasAccount': 'Already have an account?',
    'login.forgotPassword': 'Forgot password?',
    'login.emailPlaceholder': 'Enter email',
    'login.codePlaceholder': 'Verification code',
    'login.sendCode': 'Send Code',
    'login.resendCode': 'Resend in {seconds}s',
    'login.registerTitle': 'Register DataInsight',
    'login.namePlaceholder': 'Enter username',

    // === Admin ===
    'admin.title': 'Admin Panel',
    'admin.users': 'User Management',
    'admin.loginLogs': 'Login Logs',
    'admin.activityLogs': 'Activity Logs',
    'admin.aiConfig': 'AI Model Config',
    'admin.usageStats': 'Usage Statistics',
    'admin.plans': 'Plan Config',
    'admin.announcements': 'Announcements',
    'admin.systemSettings': 'System Settings',
    'admin.backToUser': 'Back to User View',

    // === Charts ===
    'chart.bar': 'Bar Chart',
    'chart.line': 'Line Chart',
    'chart.pie': 'Pie Chart',
    'chart.scatter': 'Scatter Plot',
    'chart.area': 'Area Chart',
    'chart.radar': 'Radar Chart',
    'chart.funnel': 'Funnel Chart',
    'chart.heatmap': 'Heatmap',
    'chart.boxplot': 'Box Plot',
    'chart.sankey': 'Sankey Diagram',
    'chart.waterfall': 'Waterfall Chart',
    'chart.tree': 'Tree Chart',
    'chart.gauge': 'Gauge Chart',
    'chart.wordcloud': 'Word Cloud',
    'chart.combo': 'Combo Chart',

    // === Metrics ===
    'metric.ai': 'AI Metrics',
    'metric.management': 'Metric Manager',
    'metric.semantic': 'Metric Semantic Layer',
    'metric.total': 'Total',
    'metric.average': 'Average',
    'metric.count': 'Count',
    'metric.max': 'Max',
    'metric.min': 'Min',
    'metric.median': 'Median',
    'metric.stdDev': 'Std Dev',

    // === Data Story ===
    'story.title': 'Data Story',
    'story.generate': 'AI Generate Story',
    'story.executive': 'Executive Summary',
    'story.detailed': 'Detailed Report',
    'story.interactive': 'Interactive',

    // === Industry ===
    'industry.title': 'Industry Scenarios',
    'industry.detect': 'AI Detect Industry',
    'industry.retail': 'Retail',
    'industry.finance': 'Finance',
    'industry.education': 'Education',
    'industry.healthcare': 'Healthcare',
    'industry.manufacturing': 'Manufacturing',
    'industry.logistics': 'Logistics',
    'industry.hrm': 'Human Resources',
    'industry.tech': 'Technology',

    // === Multimodal ===
    'multimodal.generateImage': 'Generate',
    'multimodal.imageToText': 'Image→Text',
    'multimodal.textToImage': 'Text→Image',
    'multimodal.imageToTable': 'Image→Table',

    // === Forms ===
    'form.builder': 'Form Builder',
    'form.dataManagement': 'Data Management',
    'form.share': 'Share Form',
    'form.preview': 'Preview',
    'form.submit': 'Submit',
    'form.published': 'Published',
    'form.draft': 'Draft',
    'form.closed': 'Closed',

    // === SQL Lab ===
    'sql.title': 'SQL Lab',
    'sql.placeholder': 'Enter SQL query...',
    'sql.run': 'Run',
    'sql.clear': 'Clear',
    'sql.result': 'Query Result',
    'sql.noResult': 'No query results',
    'sql.example': 'Example Queries',

    // === Report Export ===
    'report.title': 'Report',
    'report.export': 'Export',
    'report.share': 'Share',
    'report.appDesign': 'App Design',

    // Pricing
    'pricing.title': 'Choose Your Plan',
    'pricing.subtitle': 'Start free, upgrade as you grow',
    'pricing.monthly': 'Monthly',
    'pricing.yearly': 'Yearly',
    'pricing.save': 'Save 2 months',
    'pricing.free': 'Free',
    'pricing.pro': 'Pro',
    'pricing.enterprise': 'Enterprise',
    'pricing.currentPlan': 'Current Plan',
    'pricing.upgrade': 'Upgrade',
    'pricing.contact': 'Contact Us',
    'pricing.aiCalls': 'AI calls/month',
    'pricing.maxFile': 'Max file size',
    'pricing.maxProjects': 'Max projects',
    'pricing.unlimited': 'Unlimited',
    'pricing.chartTypes': 'Chart types',
    'pricing.basicCharts': 'Basic charts',
    'pricing.allCharts': 'All charts',
    'pricing.exportFormats': 'Export formats',
    'pricing.csvOnly': 'CSV only',
    'pricing.allFormats': 'All formats',
    'pricing.customMetrics': 'Custom metrics',
    'pricing.dataStory': 'Data stories',
    'pricing.nl2dashboard': 'AI dashboard generation',
    'pricing.apiAccess': 'API access',
    'pricing.support': 'Support',
    'pricing.community': 'Community',
    'pricing.emailSupport': 'Email',
    'pricing.prioritySupport': 'Priority',
    'pricing.aiCallsUsed': 'AI calls used',
    'pricing.of': ' of ',
    'pricing.upgradeCta': 'Upgrade for more AI calls',
    'pricing.popular': 'Most Popular',

    // Compliance
    'compliance.title': 'Data Compliance Center',
    'compliance.subtitle': 'Data security & privacy protection',
    'compliance.overview': 'Overview',
    'compliance.dataExport': 'Data Export',
    'compliance.dataDelete': 'Data Deletion',
    'compliance.auditLog': 'Audit Log',
    'compliance.privacyPolicy': 'Privacy Policy',
    'compliance.gdpr': 'GDPR',
    'compliance.ccpa': 'CCPA',
    'compliance.encryption': 'Encryption',
    'compliance.dataRetention': 'Data Retention',
    'compliance.rightToErase': 'Right to Erasure',
    'compliance.exportMyData': 'Export My Data',
    'compliance.deleteMyData': 'Delete My Data',
    'compliance.deleteWarning': 'This action is irreversible and will permanently delete all your personal data',
    'compliance.confirmDelete': 'Confirm Deletion',
    'compliance.cancel': 'Cancel',
    'compliance.lastExport': 'Last export',
    'compliance.never': 'Never',
    'compliance.enabled': 'Enabled',
    'compliance.disabled': 'Disabled',
    'compliance.compliant': 'Compliant',
    'compliance.notCompliant': 'Not Compliant',
    'compliance.tls13': 'TLS 1.3 Transport Encryption',
    'compliance.aes256': 'AES-256 Storage Encryption',
    'compliance.dataResidency': 'Data Residency',
    'compliance.rights': 'Your Rights',
    'compliance.rightAccess': 'Right of Access — Get a copy of your data',
    'compliance.rightRectify': 'Right to Rectification — Correct inaccurate data',
    'compliance.rightErase': 'Right to Erasure — Request deletion of your data',
    'compliance.rightPortability': 'Right to Portability — Export data in machine-readable format',
    'compliance.rightObject': 'Right to Object — Refuse data processing',
  },
};

// ============================================
// Context
// ============================================
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh-CN');

  // 客户端挂载后从 localStorage 读取
  useEffect(() => {
    const saved = localStorage.getItem('datainsight_locale') as Locale | null;
    if (saved && (saved === 'zh-CN' || saved === 'en-US')) {
      setLocaleState(saved);
    } else {
      // 浏览器语言自动检测
      const browserLang = navigator.language;
      if (browserLang.startsWith('zh')) {
        setLocaleState('zh-CN');
      } else {
        setLocaleState('en-US');
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('datainsight_locale', newLocale);
    // 更新 html lang 属性
    document.documentElement.lang = newLocale === 'zh-CN' ? 'zh-CN' : 'en';
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = translations[locale]?.[key] || translations['zh-CN']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export { I18nContext };
