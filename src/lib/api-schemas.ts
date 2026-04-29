import { z } from 'zod';

export const PlatformCredentialsSchema = z.object({
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  appToken: z.string().optional(),
  tableId: z.string().optional(),
  corpId: z.string().optional(),
  corpSecret: z.string().optional(),
  agentId: z.string().optional(),
  appKey: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
});

export const FeishuConnectSchema = z.object({
  action: z.literal('connect'),
  credentials: PlatformCredentialsSchema,
  appToken: z.string().optional(),
  tableId: z.string().optional(),
});

export const WeChatConnectSchema = z.object({
  action: z.literal('connect'),
  credentials: z.object({
    corpId: z.string().min(1, '请提供 Corp ID'),
    corpSecret: z.string().min(1, '请提供 Corp Secret'),
    agentId: z.string().optional(),
  }),
});

export const DingTalkConnectSchema = z.object({
  action: z.literal('connect'),
  credentials: z.object({
    appKey: z.string().min(1, '请提供 App Key'),
    appSecret: z.string().min(1, '请提供 App Secret'),
  }),
});

export const WPSConnectSchema = z.object({
  action: z.literal('connect'),
  credentials: z.object({
    apiKey: z.string().min(1, '请提供 API Key'),
    apiSecret: z.string().min(1, '请提供 API Secret'),
  }),
});

export const DatabaseConnectSchema = z.object({
  action: z.literal('connect'),
  credentials: z.object({
    type: z.enum(['postgresql', 'mysql']).default('postgresql'),
    host: z.string().min(1, '请提供数据库主机'),
    port: z.number().default(5432),
    database: z.string().min(1, '请提供数据库名称'),
    username: z.string().min(1, '请提供用户名'),
    password: z.string().optional(),
  }),
});

export const AlertRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '请输入规则名称'),
  metric: z.object({
    field: z.string().min(1, '请选择字段'),
    aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('avg'),
  }),
  condition: z.object({
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
    threshold: z.number(),
  }),
  frequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).default('daily'),
  enabled: z.boolean().default(true),
});

export const AlertCreateSchema = z.object({
  action: z.literal('create'),
  rule: AlertRuleSchema,
});

export const AlertUpdateSchema = z.object({
  action: z.literal('update'),
  rule: AlertRuleSchema,
});

export const AlertDeleteSchema = z.object({
  action: z.literal('delete'),
  ruleId: z.string().min(1, '请提供规则 ID'),
});

export const AlertCheckSchema = z.object({
  action: z.literal('check'),
  ruleId: z.string().min(1, '请提供规则 ID'),
  data: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
});

export const DataCleanSchema = z.object({
  data: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.unknown())),
  }),
  operations: z.array(z.object({
    type: z.enum(['deduplicate', 'fillna', 'outlier', 'normalize']),
    fields: z.array(z.string()),
    options: z.record(z.string(), z.unknown()).optional(),
  })),
});

export const ExportPDFSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  charts: z.array(z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    labels: z.array(z.string()).optional(),
    datasets: z.array(z.object({
      label: z.string().optional(),
      data: z.array(z.number()),
      backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
      borderColor: z.string().optional(),
    })).optional(),
  })).optional(),
  tableData: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.array(z.union([z.string(), z.number()]))),
  }).optional(),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  format: z.enum(['a4', 'a3', 'letter']).default('a4'),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues || [];
  const errors = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { success: false, error: errors };
}
