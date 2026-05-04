import type { ParsedData, CellValue } from '@/lib/data-processor';

export interface Operation {
  id: string;
  type: string;
  tool?: string;
  timestamp: number;
  description: string;
  skillId?: string;
  before?: ParsedData;
  after?: ParsedData;
  beforeSnapshot?: ParsedData;
  afterSnapshot?: ParsedData;
  params?: Record<string, unknown>;
}
