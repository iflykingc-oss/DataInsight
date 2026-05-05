/**
 * 技能中台 - 注册表
 * 所有原子技能的统一注册、发现、管理
 */

import type { SkillDefinition, SkillCategory, ExecutionStrategy, SkillRegistry } from './types';

class SkillRegistryImpl implements SkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[SkillRegistry] Skill ${skill.id} already exists, overwriting`);
    }
    this.skills.set(skill.id, skill);
  }

  registerMany(skills: SkillDefinition[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  listByCategory(category: SkillCategory): SkillDefinition[] {
    return this.list().filter(s => s.category === category);
  }

  listByScene(scene: string): SkillDefinition[] {
    return this.list().filter(s => !s.scenes || s.scenes.length === 0 || s.scenes.includes(scene));
  }

  listByStrategy(strategy: ExecutionStrategy): SkillDefinition[] {
    return this.list().filter(s => s.strategy === strategy);
  }

  has(id: string): boolean {
    return this.skills.has(id);
  }

  size(): number {
    return this.skills.size;
  }
}

export const skillRegistry = new SkillRegistryImpl();
