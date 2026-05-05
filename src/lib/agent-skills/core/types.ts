export type SkillLifecycle = 'draft' | 'active' | 'deprecated' | 'archived';
export type SkillType = 'tool_wrapper' | 'generator' | 'reviewer' | 'inversion' | 'pipeline';

export interface SkillExecutionContext {
  userId?: string;
  userRoles?: string[];
  sessionId?: string;
  data?: Record<string, unknown>[];
  fields?: string[];
  params?: Record<string, unknown>;
}

export interface SkillContract {
  trigger: {
    keywords: string[];
    patterns: RegExp[];
  };
  input: {
    requiredFields: string[];
    optionalFields: string[];
  };
  output: {
    schema: Record<string, string>;
    format: 'json' | 'markdown' | 'html' | 'text';
  };
  permission: {
    requiredPermissions: string[];
    forbiddenActions: string[];
  };
}

export interface SkillMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  lifecycle: SkillLifecycle;
  changeLog: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
  testCases: Array<{
    name: string;
    input: Record<string, unknown>;
    expectedOutput: Record<string, unknown>;
  }>;
}

export interface SkillAssets {
  scripts?: string[];
  templates?: Record<string, string>;
  knowledgeBases?: string[];
}

export interface SkillFailureRules {
  retryCount: number;
  fallbackSkillId?: string;
  abortOnError: boolean;
}

export interface ReviewChecklistItem {
  id: string;
  name: string;
  weight: number;
  criteria: string[];
}

export interface PipelineStage {
  id: string;
  name: string;
  skillId: string;
  inputMapping: Record<string, string>;
  condition?: string;
  skipOnError: boolean;
  retryCount?: number;
}

export interface SkillDefinition {
  metadata: SkillMetadata;
  type: SkillType;
  contract: SkillContract;
  assets?: SkillAssets;
  failureRules: SkillFailureRules;
  execute?: (context: SkillExecutionContext) => Promise<Record<string, unknown>>;
  fallback?: (context: SkillExecutionContext) => Promise<Record<string, unknown>>;
}
