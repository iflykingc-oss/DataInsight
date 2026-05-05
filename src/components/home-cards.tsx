'use client';

import {
  Brain, MessageSquare, LayoutGrid, Table2, Database, Target, PieChart,
  Wrench, FileText, Sparkles, ArrowRight, ShoppingCart, DollarSign,
  Users, ClipboardList, GraduationCap, Package, BarChart3, Zap,
  TrendingUp, AlertTriangle, CheckCircle, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ========== 业务场景模板 ==========
interface SceneTemplate {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  scenario: string;          // 对应AnalysisScene
  exampleQuestions: string[]; // 推荐问题
  kpis: string[];            // 预置KPI
  charts: string[];          // 推荐图表
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
  color: string;
  bgColor: string;
  needsData: boolean;
  badge?: string;
  permission?: string; // 需要的权限
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'insights', icon: Brain, label: '一键分析', desc: 'AI自动分析数据，生成业务洞察', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, badge: 'AI', permission: 'ai_analyze' },
  { id: 'chat', icon: MessageSquare, label: '问数对话', desc: '用自然语言提问，AI给答案', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true, badge: 'AI', permission: 'ai_analyze' },
  { id: 'visualization', icon: LayoutGrid, label: '智能看板', desc: '一键生成业务仪表盘', color: 'text-purple-600', bgColor: 'bg-purple-50', needsData: true, permission: 'dashboard' },
  { id: 'data-table', icon: Table2, label: '数据表格', desc: '查看和编辑数据', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: true },
  { id: 'data-prep', icon: Database, label: '数据清洗', desc: '智能检测问题数据，一键修复', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true },
  { id: 'metrics', icon: Target, label: '指标中心', desc: '业务指标自动计算与监控', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, badge: 'AI', permission: 'ai_analyze' },
  { id: 'sql-lab', icon: Wrench, label: 'SQL查询', desc: '用SQL自由查询数据', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true },
  { id: 'report-export', icon: FileText, label: '导出报告', desc: '生成分析报告并分享', color: 'text-green-600', bgColor: 'bg-green-50', needsData: true, permission: 'export' },
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

export default function HomeCards({ hasData, onViewChange, fileName, rowCount, isLoggedIn = false, onLoginRequired, hasPermission }: HomeCardsProps) {
  // 权限检查辅助函数
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
  if (!hasData) {
    return (
      <div className="space-y-8">
        {/* 无数据状态：场景化引导 */}
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">选择你的业务场景</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            上传数据后，系统会自动识别场景并生成对应的业务分析，你也可以先选场景参考
          </p>
        </div>

        {/* 场景模板卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SCENE_TEMPLATES.map((scene) => (
            <Card
              key={scene.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => onViewChange('ai-table-builder')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <scene.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{scene.label}</h4>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{scene.desc}</p>
                {/* 预置KPI预览 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {scene.kpis.slice(0, 4).map(kpi => (
                    <Badge key={kpi} variant="secondary" className="text-[10px] h-5 px-1.5">
                      {kpi}
                    </Badge>
                  ))}
                </div>
                {/* 推荐问题预览 */}
                <div className="space-y-1">
                  {scene.exampleQuestions.slice(0, 2).map((q, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground/70 truncate">
                      &quot;{q}&quot;
                    </p>
                  ))}
                </div>
                <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  AI生成此场景模板 <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 有数据状态
  return (
    <div className="space-y-6">
      {/* 数据状态横幅 */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-green-500 bg-green-50/30">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {fileName || '数据已就绪'}
          </p>
          <p className="text-xs text-muted-foreground">
            {rowCount ? `${rowCount.toLocaleString()} 行数据已加载` : '数据已加载'}，开始你的数据分析之旅
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onViewChange('insights')} className="gap-1">
          <Zap className="w-3.5 h-3.5" />
          一键分析
        </Button>
      </div>

      {/* 快捷操作 - 核心功能一排展示 */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          快捷操作
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const needsDataDisabled = action.needsData && !hasData;
            const needsPermission = action.permission && !checkPermission(action.permission);
            const disabled = needsDataDisabled || needsPermission;
            return (
              <Card
                key={action.id}
                className={`group cursor-pointer transition-all hover:shadow-md ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
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
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${action.bgColor} flex items-center justify-center shrink-0`}>
                    <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-medium truncate">{action.label}</h4>
                      {action.badge && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 场景化推荐 - 根据数据类型推荐场景操作 */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          场景化分析
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SCENE_TEMPLATES.slice(0, 3).map((scene) => (
            <Card
              key={scene.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 relative overflow-hidden"
              onClick={() => onViewChange('insights')}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <scene.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium">{scene.label}</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{scene.desc}</p>
                {/* KPI预览 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {scene.kpis.slice(0, 3).map(kpi => (
                    <Badge key={kpi} variant="secondary" className="text-[10px] h-5 px-1.5">
                      {kpi}
                    </Badge>
                  ))}
                </div>
                {/* 推荐问题 - 可点击 */}
                <div className="space-y-1.5">
                  {scene.exampleQuestions.slice(0, 2).map((q, i) => (
                    <button
                      key={i}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewChange('chat');
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  一键分析 <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
