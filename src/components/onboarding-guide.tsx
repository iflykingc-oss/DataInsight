'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Wand2, BarChart3, MessageSquare, ChevronRight, X, CheckCircle2 } from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: '欢迎使用 DataInsight',
    description: '智能表格数据分析可视化平台，让数据处理更简单',
    icon: <BarChart3 className="w-12 h-12 text-primary" />,
    tips: ['支持 Excel/CSV 文件导入', 'AI 智能生成表格模板', '一键数据分析与可视化']
  },
  {
    id: 'import',
    title: '导入您的数据',
    description: '支持本地上传或从飞书、钉钉等平台导入',
    icon: <Upload className="w-12 h-12 text-primary" />,
    tips: ['拖拽或点击上传文件', '支持 .xlsx, .xls, .csv 格式', '最大支持 50MB 文件']
  },
  {
    id: 'ai-table',
    title: 'AI 智能建表',
    description: '没有数据？让 AI 帮你生成表格模板',
    icon: <Wand2 className="w-12 h-12 text-chart-4" />,
    tips: ['选择行业模板快速开始', '描述需求，AI 自动生成', '生成后可调整结构']
  },
  {
    id: 'analyze',
    title: '智能数据分析',
    description: '上传数据后，自动进行深度分析',
    icon: <BarChart3 className="w-12 h-12 text-success" />,
    tips: ['自动识别字段类型', '数据质量健康评分', '异常值检测与提示']
  },
  {
    id: 'insight',
    title: 'AI 自动分析',
    description: '用自然语言与数据对话，获取洞察',
    icon: <MessageSquare className="w-12 h-12 text-warning" />,
    tips: ['问任何关于数据的问题', '多轮对话持续分析', '支持趋势预测与原因分析']
  },
  {
    id: 'complete',
    title: '准备就绪',
    description: '开始探索数据的价值吧！',
    icon: <CheckCircle2 className="w-12 h-12 text-success" />,
    tips: []
  }
];

interface OnboardingGuideProps {
  onComplete?: () => void;
  trigger?: React.ReactNode;
}

export function OnboardingGuide({ onComplete, trigger }: OnboardingGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  // 检查是否已完成过引导
  useEffect(() => {
    const completed = localStorage.getItem('datainsight_guide_completed');
    if (!completed) {
      // 延迟显示引导，让页面先加载
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
    setHasCompleted(true);
  }, []);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('datainsight_guide_completed', 'true');
    setHasCompleted(true);
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const currentStepData = GUIDE_STEPS[currentStep];
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* 触发器按钮（可选） */}
      {trigger && !hasCompleted && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          新手引导
        </Button>
      )}

      {/* 引导弹窗 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
              <DialogTitle className="text-lg">{currentStepData.title}</DialogTitle>
            <DialogDescription className="sr-only">
              第 {currentStep + 1} / {GUIDE_STEPS.length} 步
            </DialogDescription>
          </DialogHeader>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2 py-2">
            {GUIDE_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* 步骤内容 */}
          <div className="flex flex-col items-center text-center py-4">
            <div className="mb-4 animate-in fade-in zoom-in duration-300">
              {currentStepData.icon}
            </div>
            <p className="text-muted-foreground mb-4">
              {currentStepData.description}
            </p>

            {/* 提示列表 */}
            {currentStepData.tips && currentStepData.tips.length > 0 && (
              <div className="flex flex-col gap-2 w-full">
                {currentStepData.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between gap-3 pt-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handlePrevious}>
                上一步
              </Button>
            )}
            <div className="flex-1" />
            {isLastStep ? (
              <Button onClick={handleComplete}>
                开始使用
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleNext}>
                下一步
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {/* 跳过提示 */}
          {!isLastStep && (
            <p className="text-center text-xs text-muted-foreground">
              点击右上角 <X className="w-3 h-3 inline" /> 可跳过引导
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// 功能卡片组件 - 用于首页展示核心功能
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  onClick?: () => void;
  steps?: string[];
}

export function FeatureCard({
  title,
  description,
  icon,
  badge,
  onClick,
  steps
}: FeatureCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-3">{title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {description}
        </CardDescription>
      </CardHeader>
      {steps && steps.length > 0 && (
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground space-y-1">
            {steps.slice(0, 3).map((step, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-primary font-medium">{index + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// 快速开始提示组件
interface QuickStartTipProps {
  onDismiss?: () => void;
}

export function QuickStartTip({ onDismiss }: QuickStartTipProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('datainsight_tip_dismissed', 'true');
    onDismiss?.();
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">快速开始</h4>
          <p className="text-xs text-muted-foreground">
            上传 Excel/CSV 文件，或使用 AI 生成表格模板，开始您的数据分析之旅
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Upload className="w-3 h-3 mr-1" />
              上传文件
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Wand2 className="w-3 h-3 mr-1" />
              AI生成表格
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-7 w-7 p-0 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default OnboardingGuide;
