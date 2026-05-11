'use client';

import { memo } from 'react';
import {
  Brain, MessageSquare, LayoutGrid, Table2, Database, Target, PieChart,
  Wrench, FileText, Sparkles, ArrowRight, ShoppingCart, DollarSign,
  Users, ClipboardList, GraduationCap, Package, BarChart3, Zap,
  TrendingUp, AlertTriangle, CheckCircle, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ========== 业务场景模板 ==========
interface SceneTemplate {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  scenario: string;
  exampleQuestions: string[];
  kpis: string[];
  charts: string[];
}

const SCENE_TEMPLATES: SceneTemplate[] = [
  {
    id: 'sales-tracking',
    icon: TrendingUp,
    label: '销售跟踪',
    desc: '跟踪销售业绩、客户转化、营收趋势',
    scenario: 'sales',
    exampleQuestions: ['本月销售额同比变化多少？', '哪个产品线贡献最大？', '销售额下降的主要原因是什么？'],
    kpis: ['总销售额', '环比增长率', '客单价', 'Top10客户'],
    charts: ['月度销售趋势', '产品占比', '区域对比'],
  },
  {
    id: 'finance-income',
    icon: DollarSign,
    label: '财务收支',
    desc: '管理日常收支、成本分析、利润核算',
    scenario: 'finance',
    exampleQuestions: ['本月净利润是多少？', '哪些支出项增长最快？', '现金流是否健康？'],
    kpis: ['总收入', '总支出', '净利润率', '现金余额'],
    charts: ['收支趋势', '支出分类', '月度对比'],
  },
  {
    id: 'ecommerce-ops',
    icon: ShoppingCart,
    label: '电商运营',
    desc: '分析订单、库存、用户行为、GMV趋势',
    scenario: 'ecommerce',
    exampleQuestions: ['今日GMV是多少？', '退货率最高的品类？', '用户复购率趋势？'],
    kpis: ['GMV', '转化率', '客单价', '退货率'],
    charts: ['GMV趋势', '品类分布', '转化漏斗'],
  },
  {
    id: 'hr-people',
    icon: Users,
    label: '人事管理',
    desc: '员工考勤、薪酬统计、离职分析',
    scenario: 'hr',
    exampleQuestions: ['本月离职率是多少？', '各部门人效排名？', '薪酬分布是否合理？'],
    kpis: ['在职人数', '离职率', '平均薪资', '人效比'],
    charts: ['人数趋势', '部门分布', '薪资分布'],
  },
  {
    id: 'project-mgmt',
    icon: ClipboardList,
    label: '项目管理',
    desc: '项目进度、任务分配、延期风险',
    scenario: 'project',
    exampleQuestions: ['项目整体进度如何？', '哪些任务延期了？', '资源分配是否合理？'],
    kpis: ['完成率', '延期任务数', '资源利用率', '里程碑进度'],
    charts: ['进度甘特图', '任务状态', '延期趋势'],
  },
  {
    id: 'inventory',
    icon: Package,
    label: '库存管理',
    desc: '出入库统计、库存预警、周转分析',
    scenario: 'ecommerce',
    exampleQuestions: ['哪些商品库存不足？', '库存周转天数？', '滞销品有哪些？'],
    kpis: ['库存总量', '周转天数', '缺货率', '滞销占比'],
    charts: ['库存趋势', '出入库对比', 'ABC分类'],
  },
];

// ========== 功能快捷入口 ==========
interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  needsData: boolean;
  badge?: string;
  permission?: string;
  accent?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'insights', icon: Brain, label: '一键分析', desc: 'AI自动分析数据，生成业务洞察', needsData: true, badge: 'AI', permission: 'ai_analyze', accent: true },
  { id: 'chat', icon: MessageSquare, label: '问数对话', desc: '用自然语言提问，AI给答案', needsData: true, badge: 'AI', permission: 'ai_analyze' },
  { id: 'visualization', icon: LayoutGrid, label: '智能看板', desc: '一键生成业务仪表盘', needsData: true, permission: 'dashboard' },
  { id: 'data-table', icon: Table2, label: '数据表格', desc: '查看和编辑数据', needsData: true },
  { id: 'data-prep', icon: Database, label: '数据清洗', desc: '智能检测问题数据，一键修复', needsData: true },
  { id: 'metrics', icon: Target, label: '指标中心', desc: '业务指标自动计算与监控', needsData: true, badge: 'AI', permission: 'ai_analyze' },
  { id: 'sql-lab', icon: Wrench, label: 'SQL查询', desc: '用SQL自由查询数据', needsData: true },
  { id: 'report-export', icon: FileText, label: '导出报告', desc: '生成分析报告并分享', needsData: true, permission: 'export' },
];

interface HomeCardsProps {
  hasData: boolean;
  onViewChange: (view: string) => void;
  fileName?: string;
  rowCount?: number;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  hasPermission?: (permission: string) => boolean;
}

function HomeCards({ hasData, onViewChange, fileName, rowCount, isLoggedIn = false, onLoginRequired, hasPermission }: HomeCardsProps) {
  const checkPermission = (permission: string) => {
    if (!isLoggedIn && onLoginRequired) {
      onLoginRequired();
      return false;
    }
    if (hasPermission && !hasPermission(permission)) {
      return false;
    }
    return true;
  };

  // ---- No Data State: Scene-based guidance ----
  if (!hasData) {
    return (
      <div className="space-y-6">
        {/* Hero section - 规范: 标题20px加粗, 辅助12px浅灰, 间距16px */}
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-sm bg-primary/8 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-primary/60" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">选择你的业务场景</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            上传数据后，系统会自动识别场景并生成对应的业务分析
          </p>
        </div>

        {/* Scene template cards - 规范: 卡片6px圆角, 间距8px, 内边距8px */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SCENE_TEMPLATES.map((scene) => (
            <div
              key={scene.id}
              className="group cursor-pointer rounded-sm border border-border bg-card p-2 transition-all duration-200 hover:shadow-float hover:border-primary/25"
              onClick={() => onViewChange('ai-table-builder')}
            >
              {/* Icon + title - 规范: 图标16px, 间距4px */}
              <div className="flex items-center gap-1 mb-2">
                <div className="w-6 h-6 rounded-sm bg-primary/8 flex items-center justify-center shrink-0">
                  <scene.icon className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground truncate">{scene.label}</h4>
              </div>
              {/* Description - 规范: 12px浅灰 */}
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{scene.desc}</p>
              {/* KPI tags - 规范: 标签4px圆角, 24px高度, 12px文字 */}
              <div className="flex flex-wrap gap-1 mb-2">
                {scene.kpis.slice(0, 4).map(kpi => (
                  <span key={kpi} className="text-xs h-6 px-1 rounded-sm bg-muted text-muted-foreground leading-6 font-normal">
                    {kpi}
                  </span>
                ))}
              </div>
              {/* Example questions - 规范: 12px浅灰 */}
              <div className="space-y-0.5">
                {scene.exampleQuestions.slice(0, 2).map((q, i) => (
                  <p key={i} className="text-xs text-muted-foreground/60 truncate">
                    &quot;{q}&quot;
                  </p>
                ))}
              </div>
              {/* Hover CTA */}
              <div className="mt-2 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                AI生成此场景模板 <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Has Data State ----
  return (
    <div className="space-y-4">
      {/* Data ready banner - 规范: 16px模块分割, 6px圆角 */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-sm border border-border bg-primary/4">
        <div className="w-6 h-6 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
          <CheckCircle className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {fileName || '数据已就绪'}
          </p>
          <p className="text-xs text-muted-foreground">
            {rowCount ? `${rowCount.toLocaleString()} 行数据已加载` : '数据已加载'}，开始你的数据分析之旅
          </p>
        </div>
        <button
          onClick={() => onViewChange('insights')}
          className="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1"
        >
          <Zap className="w-4 h-4" />
          一键分析
        </button>
      </div>

      {/* Quick actions grid - 规范: 卡片6px圆角, 8px间距 */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5" />
          快捷操作
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const needsDataDisabled = action.needsData && !hasData;
            const needsPermission = action.permission && !checkPermission(action.permission);
            const disabled = needsDataDisabled || needsPermission;
            return (
              <div
                key={action.id}
                className={`group cursor-pointer transition-all duration-200 rounded-sm border border-border p-2 flex items-center gap-2 ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:shadow-float hover:border-primary/25'
                } ${action.accent && !disabled ? 'border-primary/20 bg-primary/[0.02]' : 'bg-card'}`}
                onClick={() => {
                  if (disabled) {
                    if (!isLoggedIn && onLoginRequired) {
                      onLoginRequired();
                    }
                    return;
                  }
                  onViewChange(action.id);
                }}
              >
                {/* Icon - 规范: 16px图标 */}
                <div className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 ${
                  action.accent ? 'bg-primary/8' : 'bg-muted'
                }`}>
                  <action.icon className={`w-4 h-4 ${action.accent ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                {/* Text - 规范: 标题14px, 描述12px */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h4 className="text-sm font-medium truncate">{action.label}</h4>
                    {action.badge && (
                      <span className="text-xs font-semibold px-1 rounded-sm bg-primary/8 text-primary leading-5">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{action.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene-based recommendations - 规范: 卡片6px圆角 */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          场景化分析
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SCENE_TEMPLATES.slice(0, 3).map((scene) => (
            <div
              key={scene.id}
              className="group cursor-pointer transition-all duration-200 rounded-sm border border-border hover:shadow-float hover:border-primary/25 relative overflow-hidden bg-card"
              onClick={() => onViewChange('insights')}
            >
              {/* Top accent line - 规范: 主色高亮 */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/8 group-hover:bg-primary/50 transition-colors duration-200" />
              <div className="p-4">
                {/* Icon + title - 规范: 16px图标, 4px间距 */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-6 h-6 rounded-sm bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors duration-200">
                    <scene.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{scene.label}</h4>
                </div>
                {/* Description - 规范: 12px浅灰 */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{scene.desc}</p>
                {/* KPI preview */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {scene.kpis.slice(0, 3).map(kpi => (
                    <span key={kpi} className="text-xs h-6 px-1 rounded-sm bg-muted text-muted-foreground leading-6 font-normal">
                      {kpi}
                    </span>
                  ))}
                </div>
                {/* Clickable example questions - 规范: 12px文字, 4px圆角 */}
                <div className="space-y-1">
                  {scene.exampleQuestions.slice(0, 2).map((q, i) => (
                    <button
                      key={i}
                      className="w-full text-left text-xs px-2 py-1 rounded-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150 truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewChange('chat');
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  一键分析 <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(HomeCards);
