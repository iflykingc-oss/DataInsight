import { NextResponse } from 'next/server';

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface AlertRule {
  id: string;
  name: string;
  metric: {
    field: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
  };
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationChannel {
  type: 'email' | 'feishu' | 'wechat' | 'webhook';
  config: {
    emails?: string[];
    webhookUrl?: string;
    mentionUsers?: string[];
  };
}

export interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  metricValue: number;
  threshold: number;
  status: 'sent' | 'read' | 'acknowledged';
}

const alertRules: Map<string, AlertRule> = new Map();
const alertHistory: AlertRecord[] = [];

function aggregate(values: number[], method: 'sum' | 'avg' | 'count' | 'min' | 'max'): number {
  switch (method) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case 'count':
      return values.length;
    case 'min':
      return values.length > 0 ? Math.min(...values) : 0;
    case 'max':
      return values.length > 0 ? Math.max(...values) : 0;
    default:
      return 0;
  }
}

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'lt':
      return value < threshold;
    case 'eq':
      return value === threshold;
    case 'gte':
      return value >= threshold;
    case 'lte':
      return value <= threshold;
    default:
      return false;
  }
}

async function sendNotification(channel: NotificationChannel, ruleName: string, metricValue: number, threshold: number): Promise<boolean> {
  try {
    switch (channel.type) {
      case 'email':
        return true;
      case 'feishu':
        if (channel.config.webhookUrl) {
          const response = await fetch(channel.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              msg_type: 'text',
              content: {
                text: `【数据预警】${ruleName} - 当前值: ${metricValue}, 阈值: ${threshold}`,
              },
            }),
          });
          return response.ok;
        }
        return false;
      case 'wechat':
        if (channel.config.webhookUrl) {
          const response = await fetch(channel.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              msgtype: 'text',
              text: {
                content: `【数据预警】${ruleName} - 当前值: ${metricValue}, 阈值: ${threshold}`,
              },
            }),
          });
          return response.ok;
        }
        return false;
      case 'webhook':
        if (channel.config.webhookUrl) {
          const response = await fetch(channel.config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alert: ruleName,
              metricValue,
              threshold,
              timestamp: new Date().toISOString(),
            }),
          });
          return response.ok;
        }
        return false;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: [
      {
        id: 'sales-drop',
        name: '销售额下降预警',
        description: '当月销售额环比下降超过20%时触发',
        category: '销售指标',
      },
      {
        id: 'cost-overrun',
        name: '成本超支预警',
        description: '实际成本超过预算的110%时触发',
        category: '成本控制',
      },
      {
        id: 'inventory-low',
        name: '库存不足预警',
        description: '库存量低于安全库存线时触发',
        category: '库存管理',
      },
      {
        id: 'customer-churn',
        name: '客户流失预警',
        description: '客户活跃度连续30天下降时触发',
        category: '客户关系',
      },
      {
        id: 'revenue-target',
        name: '营收目标预警',
        description: '季度营收进度低于目标的80%时触发',
        category: '财务指标',
      },
      {
        id: 'data-quality',
        name: '数据质量预警',
        description: '数据缺失率超过5%时触发',
        category: '数据质量',
      },
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, rule, channel, data, ruleId } = body as {
      action: string;
      rule?: AlertRule;
      channel?: NotificationChannel;
      data?: ParsedData;
      ruleId?: string;
    };

    switch (action) {
      case 'create':
      case 'update': {
        if (!rule?.name || !rule?.metric || !rule?.condition) {
          return NextResponse.json(
            { success: false, message: '请提供完整的预警规则' },
            { status: 400 }
          );
        }

        const ruleId = rule.id || `rule_${Date.now()}`;
        const now = new Date().toISOString();
        const newRule: AlertRule = {
          id: ruleId,
          name: rule.name,
          metric: rule.metric,
          condition: rule.condition,
          frequency: rule.frequency || 'daily',
          enabled: rule.enabled !== false,
          createdAt: rule.createdAt || now,
          updatedAt: now,
        };

        alertRules.set(ruleId, newRule);

        return NextResponse.json({
          success: true,
          message: action === 'create' ? '预警规则创建成功' : '预警规则更新成功',
          rule: newRule,
        });
      }

      case 'delete': {
        if (!ruleId) {
          return NextResponse.json(
            { success: false, message: '请提供规则 ID' },
            { status: 400 }
          );
        }

        alertRules.delete(ruleId);

        return NextResponse.json({
          success: true,
          message: '预警规则删除成功',
        });
      }

      case 'list': {
        const rules = Array.from(alertRules.values());

        return NextResponse.json({
          success: true,
          rules,
        });
      }

      case 'check': {
        if (!data?.rows || !data?.headers || !ruleId) {
          return NextResponse.json(
            { success: false, message: '请提供数据和规则 ID' },
            { status: 400 }
          );
        }

        const rule = alertRules.get(ruleId);
        if (!rule) {
          return NextResponse.json(
            { success: false, message: '规则不存在' },
            { status: 404 }
          );
        }

        const fieldIndex = data.headers.indexOf(rule.metric.field);
        if (fieldIndex === -1) {
          return NextResponse.json(
            { success: false, message: `找不到字段: ${rule.metric.field}` },
            { status: 400 }
          );
        }

        const values = data.rows
          .map(row => Number(row[data.headers[fieldIndex]]))
          .filter(v => !isNaN(v));

        const metricValue = aggregate(values, rule.metric.aggregation);
        const triggered = evaluateCondition(metricValue, rule.condition.operator, rule.condition.threshold);

        if (triggered) {
          const record: AlertRecord = {
            id: `alert_${Date.now()}`,
            ruleId: rule.id,
            ruleName: rule.name,
            triggeredAt: new Date().toISOString(),
            metricValue,
            threshold: rule.condition.threshold,
            status: 'sent',
          };
          alertHistory.push(record);
        }

        return NextResponse.json({
          success: true,
          triggered,
          metricValue,
          threshold: rule.condition.threshold,
          rule: rule.name,
          alertId: triggered ? `alert_${Date.now()}` : null,
        });
      }

      case 'checkAll': {
        if (!data?.rows || !data?.headers) {
          return NextResponse.json(
            { success: false, message: '请提供数据' },
            { status: 400 }
          );
        }

        const results: Array<{ ruleId: string; ruleName: string; triggered: boolean; metricValue: number; threshold: number }> = [];

        for (const rule of alertRules.values()) {
          if (!rule.enabled) continue;

          const fieldIndex = data.headers.indexOf(rule.metric.field);
          if (fieldIndex === -1) continue;

          const values = data.rows
            .map(row => Number(row[data.headers[fieldIndex]]))
            .filter(v => !isNaN(v));

          const metricValue = aggregate(values, rule.metric.aggregation);
          const triggered = evaluateCondition(metricValue, rule.condition.operator, rule.condition.threshold);

          if (triggered) {
            const record: AlertRecord = {
              id: `alert_${Date.now()}`,
              ruleId: rule.id,
              ruleName: rule.name,
              triggeredAt: new Date().toISOString(),
              metricValue,
              threshold: rule.condition.threshold,
              status: 'sent',
            };
            alertHistory.push(record);
          }

          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            triggered,
            metricValue,
            threshold: rule.condition.threshold,
          });
        }

        return NextResponse.json({
          success: true,
          results,
          triggeredCount: results.filter(r => r.triggered).length,
        });
      }

      case 'notify': {
        if (!channel || !ruleId) {
          return NextResponse.json(
            { success: false, message: '请提供通知渠道和规则 ID' },
            { status: 400 }
          );
        }

        const rule = alertRules.get(ruleId);
        if (!rule) {
          return NextResponse.json(
            { success: false, message: '规则不存在' },
            { status: 404 }
          );
        }

        const latestAlert = alertHistory
          .filter(a => a.ruleId === ruleId)
          .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())[0];

        if (!latestAlert) {
          return NextResponse.json(
            { success: false, message: '没有找到触发的预警记录' },
            { status: 404 }
          );
        }

        const sent = await sendNotification(channel, rule.name, latestAlert.metricValue, latestAlert.threshold);

        return NextResponse.json({
          success: sent,
          message: sent ? '通知发送成功' : '通知发送失败',
        });
      }

      case 'history': {
        const page = parseInt(body.page) || 1;
        const pageSize = parseInt(body.pageSize) || 20;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;

        const paginatedHistory = alertHistory
          .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
          .slice(start, end);

        return NextResponse.json({
          success: true,
          history: paginatedHistory,
          total: alertHistory.length,
          page,
          pageSize,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `请求错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
