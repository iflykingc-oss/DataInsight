import type { SkillDefinition, SkillType } from './types';

class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, SkillDefinition> = new Map();

  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.metadata.id, skill);
  }

  registerSkills(skills: SkillDefinition[]): void {
    skills.forEach(skill => this.registerSkill(skill));
  }

  getSkill(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  getSkillsByType(type: SkillType): SkillDefinition[] {
    return Array.from(this.skills.values()).filter(skill => skill.type === type);
  }

  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  getActiveSkills(): SkillDefinition[] {
    return this.getAllSkills().filter(skill => skill.metadata.lifecycle === 'active');
  }

  unregisterSkill(id: string): boolean {
    return this.skills.delete(id);
  }

  hasSkill(id: string): boolean {
    return this.skills.has(id);
  }

  clear(): void {
    this.skills.clear();
  }
}

export const skillRegistry = SkillRegistry.getInstance();
