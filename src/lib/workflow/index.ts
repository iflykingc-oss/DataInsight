/**
 * 工作流引擎统一入口
 */

import { workflowRegistry } from './core/registry';
import * as engine from './core/engine';
import { registerWorkflows as registerGeneralWorkflows } from './definitions/general';
import { registerWorkflows as registerSalesWorkflows } from './definitions/sales';
import { registerWorkflows as registerFinanceWorkflows } from './definitions/finance';
import { registerWorkflows as registerProjectWorkflows } from './definitions/project';
import { registerWorkflows as registerEducationWorkflows } from './definitions/education';

export * from './core/types';
export * from './core/registry';
export * from './core/engine';

/** 工作流引擎门面 */
export const workflowEngine = {
  execute: engine.executeWorkflow,
  getInstance: engine.getWorkflowInstance,
  cancel: engine.cancelWorkflow,
  cleanup: engine.cleanupWorkflowInstances,
};

/** 初始化工作流引擎：注册全部 103 个工作流 */
export function initWorkflowEngine(): void {
  registerGeneralWorkflows();
  registerSalesWorkflows();
  registerFinanceWorkflows();
  registerProjectWorkflows();
  registerEducationWorkflows();
}

/** 获取工作流统计 */
export function getWorkflowStats(): { total: number; byCategory: Record<string, number> } {
  const all = workflowRegistry.list();
  const byCategory: Record<string, number> = {};
  for (const w of all) {
    const cat = w.category ?? w.domain ?? 'uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  return { total: all.length, byCategory };
}

// 默认自动初始化（浏览器端）
if (typeof window !== 'undefined') {
  initWorkflowEngine();
}
