/**
 * 工作流执行 API
 * POST /api/workflow
 * 支持执行预制工作流和动态编排工作流
 */

import { NextResponse } from 'next/server';
import type { WorkflowDefinition } from '@/lib/workflow/core/types';
import { executeWorkflow, cancelWorkflow, getWorkflowInstance } from '@/lib/workflow/core/engine';
import { workflowRegistry } from '@/lib/workflow/core/registry';
import { skillRegistry } from '@/lib/skills/core/registry';
import type { SkillContext } from '@/lib/skills/core/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, workflowId, workflowDefinition, inputs, context, options } = body;

    // action=execute: 执行工作流
    if (action === 'execute') {
      let workflow: WorkflowDefinition | undefined;

      // 优先从注册表查找预制工作流
      if (workflowId) {
        workflow = workflowRegistry.get(workflowId);
      }

      // 如果没有找到，使用传入的动态工作流定义
      if (!workflow && workflowDefinition) {
        workflow = workflowDefinition as WorkflowDefinition;
      }

      if (!workflow) {
        return NextResponse.json(
          { success: false, error: '工作流未找到' },
          { status: 404 }
        );
      }

      // 构建技能上下文
      const skillContext: SkillContext = {
        sessionId: context?.sessionId ?? `wf-session-${Date.now()}`,
        scene: workflow.scenes?.[0] ?? 'general',
        userRequest: context?.userRequest ?? '执行工作流',
        data: context?.data ?? undefined,
        fieldStats: context?.fieldStats ?? undefined,
        modelConfig: context?.modelConfig ?? undefined,
        metadata: { ...context?.metadata, ...inputs },
      };

      const result = await executeWorkflow(workflow, skillContext, {
        timeout: options?.timeout ?? 300000,
        maxRetries: options?.maxRetries ?? 2,
        onProgress: undefined, // 服务端不支持回调
        onStepComplete: undefined,
      });

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '工作流执行成功' : '工作流执行失败',
      });
    }

    // action=cancel: 取消工作流
    if (action === 'cancel') {
      const { instanceId } = body;
      if (!instanceId) {
        return NextResponse.json(
          { success: false, error: '缺少 instanceId' },
          { status: 400 }
        );
      }
      const cancelled = cancelWorkflow(instanceId);
      return NextResponse.json({
        success: cancelled,
        message: cancelled ? '工作流已取消' : '工作流未找到或已完成',
      });
    }

    // action=status: 查询工作流状态
    if (action === 'status') {
      const { instanceId } = body;
      if (!instanceId) {
        return NextResponse.json(
          { success: false, error: '缺少 instanceId' },
          { status: 400 }
        );
      }
      const instance = getWorkflowInstance(instanceId);
      if (!instance) {
        return NextResponse.json(
          { success: false, error: '工作流实例未找到' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          id: instance.id,
          status: instance.status,
          progress: instance.progress,
          currentStepId: instance.currentStepId,
          completedSteps: instance.completedSteps,
          startTime: instance.startTime,
          endTime: instance.endTime,
        },
      });
    }

    // action=list: 列出可用工作流
    if (action === 'list') {
      const { category, scene } = body;
      let workflows = workflowRegistry.list();
      if (category) {
        workflows = workflows.filter(w => w.category === category);
      }
      if (scene) {
        workflows = workflows.filter(w => w.scenes?.includes(scene));
      }
      return NextResponse.json({
        success: true,
        data: workflows.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description,
          category: w.category,
          scenes: w.scenes,
        })),
      });
    }

    return NextResponse.json(
      { success: false, error: '未知的 action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Workflow API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '工作流执行失败',
      },
      { status: 500 }
    );
  }
}
