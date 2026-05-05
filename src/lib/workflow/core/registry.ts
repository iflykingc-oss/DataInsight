/**
 * 工作流注册表
 */

import type { WorkflowDefinition } from '../core/types';

const workflows = new Map<string, WorkflowDefinition>();

export const workflowRegistry = {
  register(workflow: WorkflowDefinition): void {
    workflows.set(workflow.id, workflow);
  },

  registerMany(workflowList: WorkflowDefinition[]): void {
    for (const w of workflowList) {
      workflows.set(w.id, w);
    }
  },

  get(id: string): WorkflowDefinition | undefined {
    return workflows.get(id);
  },

  list(): WorkflowDefinition[] {
    return Array.from(workflows.values());
  },

  listByCategory(category: string): WorkflowDefinition[] {
    return Array.from(workflows.values()).filter(w => w.category === category);
  },

  listByScene(sceneId: string): WorkflowDefinition[] {
    return Array.from(workflows.values()).filter(w => w.sceneBindings?.includes(sceneId));
  },

  search(query: string): WorkflowDefinition[] {
    const lower = query.toLowerCase();
    return Array.from(workflows.values()).filter(w =>
      w.name.toLowerCase().includes(lower) ||
      w.description.toLowerCase().includes(lower) ||
      w.tags?.some(t => t.toLowerCase().includes(lower))
    );
  },

  count(): number {
    return workflows.size;
  },
};
