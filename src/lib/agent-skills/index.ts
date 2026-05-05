import { skillRegistry } from './core/registry';

export * from './core/types';
export { skillGovernance } from './core/governance';
export { skillRegistry } from './core/registry';
export { skillExecutor } from './core/executor';

import { REVIEWER_DATA_QUALITY } from './reviewer/data-quality-reviewer';
import { REVIEWER_REPORT_QUALITY } from './reviewer/report-quality-reviewer';
import { INVERSION_DEMAND_CLARIFICATION } from './inversion/demand-clarification';
import { INVERSION_REQUIREMENT_VALIDATION } from './inversion/requirement-validation';
import { TOOL_WRAPPER_RETAIL_001 } from './tool-wrapper/retail-domain-knowledge';
import { TOOL_WRAPPER_ECOMMERCE_001 } from './tool-wrapper/ecommerce-domain-knowledge';
import { GENERATOR_RETAIL_001 } from './generator/retail-sales-report';
import { GENERATOR_BUSINESS_001 } from './generator/business-report-generator';
import { PIPELINE_RETAIL_001 } from './pipeline/retail-end-to-end-analysis';
import { PIPELINE_GENERAL_001 } from './pipeline/general-data-analysis';

export const ALL_SKILLS = [
  REVIEWER_DATA_QUALITY,
  REVIEWER_REPORT_QUALITY,
  INVERSION_DEMAND_CLARIFICATION,
  INVERSION_REQUIREMENT_VALIDATION,
  TOOL_WRAPPER_RETAIL_001,
  TOOL_WRAPPER_ECOMMERCE_001,
  GENERATOR_RETAIL_001,
  GENERATOR_BUSINESS_001,
  PIPELINE_RETAIL_001,
  PIPELINE_GENERAL_001,
];

export function registerAllSkills(): void {
  skillRegistry.registerSkills(ALL_SKILLS);
}

export {
  REVIEWER_DATA_QUALITY,
  REVIEWER_REPORT_QUALITY,
  INVERSION_DEMAND_CLARIFICATION,
  INVERSION_REQUIREMENT_VALIDATION,
  TOOL_WRAPPER_RETAIL_001,
  TOOL_WRAPPER_ECOMMERCE_001,
  GENERATOR_RETAIL_001,
  GENERATOR_BUSINESS_001,
  PIPELINE_RETAIL_001,
  PIPELINE_GENERAL_001,
};
