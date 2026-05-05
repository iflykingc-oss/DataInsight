/**
 * 技能中台统一入口
 */

import { skillRegistry } from './core/registry';
import './core/handlers'; // 注册所有技能处理器
import { registerSkills as registerGenerateSkills } from './definitions/generate';
import { registerSkills as registerCleanSkills } from './definitions/clean';
import { registerSkills as registerAnalyzeSkills } from './definitions/analyze';
import { registerSkills as registerVisualizeSkills } from './definitions/visualize';
import { registerSkills as registerFormulaSkills } from './definitions/formula';
import { registerSkills as registerParseSkills } from './definitions/parse';

export * from './core/types';
export * from './core/registry';
export * from './core/executor';

/** 初始化技能中台：注册全部 104 个技能 */
export function initSkillPlatform(): void {
  registerGenerateSkills();
  registerCleanSkills();
  registerAnalyzeSkills();
  registerVisualizeSkills();
  registerFormulaSkills();
  registerParseSkills();
}

/** 获取技能统计 */
export function getSkillStats(): { total: number; byCategory: Record<string, number> } {
  const all = skillRegistry.list();
  const byCategory: Record<string, number> = {};
  for (const s of all) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  }
  return { total: all.length, byCategory };
}

// 默认自动初始化（浏览器端）
if (typeof window !== 'undefined') {
  initSkillPlatform();
}
