import type { SkillDefinition, SkillMetadata, SkillLifecycle } from './types';

interface SecurityAuditResult {
  passed: boolean;
  risks: Array<{
    level: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
}

interface VersionComparison {
  hasBreakingChange: boolean;
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
    breaking: boolean;
  }>;
}

class SkillGovernance {
  private static instance: SkillGovernance;
  private auditLog: Array<{
    timestamp: string;
    action: string;
    skillId: string;
    userId?: string;
    details: Record<string, unknown>;
  }> = [];

  static getInstance(): SkillGovernance {
    if (!SkillGovernance.instance) {
      SkillGovernance.instance = new SkillGovernance();
    }
    return SkillGovernance.instance;
  }

  validateSkillPermission(skill: SkillDefinition, userRoles?: string[]): boolean {
    if (!userRoles || userRoles.includes('admin')) {
      return true;
    }

    const required = skill.contract.permission.requiredPermissions;
    if (required.length === 0) return true;

    return required.some(perm => userRoles.includes(perm));
  }

  compareSkillVersions(oldSkill: SkillDefinition, newSkill: SkillDefinition): VersionComparison {
    const changes: VersionComparison['changes'] = [];

    const oldKeywords = oldSkill.contract.trigger.keywords.sort();
    const newKeywords = newSkill.contract.trigger.keywords.sort();
    if (JSON.stringify(oldKeywords) !== JSON.stringify(newKeywords)) {
      changes.push({
        type: 'modified',
        field: 'trigger.keywords',
        oldValue: oldKeywords,
        newValue: newKeywords,
        breaking: true,
      });
    }

    const oldRequired = oldSkill.contract.input.requiredFields.sort();
    const newRequired = newSkill.contract.input.requiredFields.sort();
    const removedRequired = oldRequired.filter(f => !newRequired.includes(f));
    if (removedRequired.length > 0) {
      changes.push({
        type: 'removed',
        field: 'input.requiredFields',
        oldValue: removedRequired,
        breaking: true,
      });
    }

    const addedRequired = newRequired.filter(f => !oldRequired.includes(f));
    if (addedRequired.length > 0) {
      changes.push({
        type: 'added',
        field: 'input.requiredFields',
        newValue: addedRequired,
        breaking: true,
      });
    }

    if (oldSkill.metadata.name !== newSkill.metadata.name) {
      changes.push({
        type: 'modified',
        field: 'metadata.name',
        oldValue: oldSkill.metadata.name,
        newValue: newSkill.metadata.name,
        breaking: false,
      });
    }

    return {
      hasBreakingChange: changes.some(c => c.breaking),
      changes,
    };
  }

  auditSkillSecurity(skill: SkillDefinition): SecurityAuditResult {
    const risks: SecurityAuditResult['risks'] = [];

    if (!skill.contract.permission.forbiddenActions || skill.contract.permission.forbiddenActions.length === 0) {
      risks.push({
        level: 'medium',
        description: 'Skill 未定义禁止操作列表',
        suggestion: '建议明确列出禁止操作以提升安全性',
      });
    }

    if (skill.assets?.scripts && skill.assets.scripts.length > 0) {
      risks.push({
        level: 'low',
        description: `Skill 包含 ${skill.assets.scripts.length} 个外部脚本，需审查安全性`,
        suggestion: '审查所有外部脚本来源，确保可信',
      });
    }

    if (!skill.failureRules || skill.failureRules.retryCount === undefined) {
      risks.push({
        level: 'low',
        description: 'Skill 未定义失败重试规则',
        suggestion: '建议配置合理的重试机制',
      });
    }

    if (!skill.metadata.testCases || skill.metadata.testCases.length === 0) {
      risks.push({
        level: 'medium',
        description: 'Skill 缺少测试用例',
        suggestion: '建议补充测试用例以确保 Skill 可靠性',
      });
    }

    return {
      passed: risks.filter(r => r.level === 'high').length === 0,
      risks,
    };
  }

  deprecateSkill(skill: SkillDefinition, reason: string): SkillDefinition {
    const deprecated: SkillDefinition = {
      ...skill,
      metadata: {
        ...skill.metadata,
        lifecycle: 'deprecated' as SkillLifecycle,
        changeLog: [
          ...skill.metadata.changeLog,
          {
            version: skill.metadata.version,
            date: new Date().toISOString(),
            changes: [`废弃: ${reason}`],
          },
        ],
      },
    };

    this.logAudit('deprecate', skill.metadata.id, { reason });
    return deprecated;
  }

  archiveSkill(skill: SkillDefinition): SkillDefinition {
    const archived: SkillDefinition = {
      ...skill,
      metadata: {
        ...skill.metadata,
        lifecycle: 'archived' as SkillLifecycle,
        changeLog: [
          ...skill.metadata.changeLog,
          {
            version: skill.metadata.version,
            date: new Date().toISOString(),
            changes: ['归档'],
          },
        ],
      },
    };

    this.logAudit('archive', skill.metadata.id, {});
    return archived;
  }

  private logAudit(action: string, skillId: string, details: Record<string, unknown>): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      action,
      skillId,
      details,
    });
  }

  getAuditLog(skillId?: string): typeof this.auditLog {
    if (skillId) {
      return this.auditLog.filter(entry => entry.skillId === skillId);
    }
    return [...this.auditLog];
  }
}

export const skillGovernance = SkillGovernance.getInstance();
