import { NextRequest, NextResponse } from 'next/server';

// ============================================
// 平台自动检测：根据 URL 特征识别目标平台
// ============================================
type PlatformType = 'feishu' | 'dingtalk' | 'wecom' | 'generic';

function detectPlatform(url: string): PlatformType {
  const lower = url.toLowerCase();
  if (lower.includes('open.feishu.cn') || lower.includes('open.larksuite.com')) return 'feishu';
  if (lower.includes('oapi.dingtalk.com')) return 'dingtalk';
  if (lower.includes('qyapi.weixin.qq.com')) return 'wecom';
  return 'generic';
}

// ============================================
// 各平台消息体构建
// ============================================

/** 飞书/Lark 卡片消息 */
function buildFeishuPayload(title: string, content: string) {
  const body: Record<string, unknown> = {
    msg_type: 'interactive',
    card: {
      header: {
        title: { content: title, tag: 'plain_text' },
        template: 'blue',
      },
      elements: [
        { tag: 'div', text: { content, tag: 'plain_text' } },
        { tag: 'div', text: { content: `发送时间：${new Date().toLocaleString('zh-CN')}`, tag: 'plain_text' } },
      ],
    },
  };
  return body;
}

/** 钉钉机器人消息 */
function buildDingtalkPayload(title: string, content: string) {
  return {
    msgtype: 'markdown',
    markdown: {
      title,
      text: `### ${title}\n\n${content}\n\n> 发送时间：${new Date().toLocaleString('zh-CN')}`,
    },
  };
}

/** 企业微信机器人消息 */
function buildWecomPayload(title: string, content: string) {
  return {
    msgtype: 'markdown',
    markdown: {
      content: `### ${title}\n> ${content}\n> 时间：${new Date().toLocaleString('zh-CN')}`,
    },
  };
}

/** 通用 JSON payload */
function buildGenericPayload(title: string, content: string, severity: string = 'info') {
  return {
    alert_name: title,
    severity,
    message: content,
    triggered_at: new Date().toISOString(),
    source: 'DataInsight Pro',
  };
}

// ============================================
// 飞书签名计算
// ============================================
async function computeFeishuSign(secret: string): Promise<{ timestamp: string; sign: string }> {
  const crypto = await import('crypto');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', stringToSign);
  hmac.update('');
  const sign = hmac.digest('base64');
  return { timestamp, sign };
}

// ============================================
// 钉钉签名计算
// ============================================
async function computeDingtalkSign(secret: string): Promise<{ timestamp: string; sign: string }> {
  const crypto = await import('crypto');
  const timestamp = Date.now().toString();
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  const sign = encodeURIComponent(hmac.digest('base64'));
  return { timestamp, sign };
}

// ============================================
// 主处理逻辑
// ============================================
export async function POST(req: NextRequest) {
  try {
    const { channel, config } = await req.json() as {
      channel: 'email' | 'feishu' | 'webhook';
      config: Record<string, unknown>;
    };

    if (!channel || !config) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      // ========== 飞书渠道 ==========
      if (channel === 'feishu') {
        const webhookUrl = config.webhookUrl as string;
        const secret = config.secret as string;

        if (!webhookUrl) {
          return NextResponse.json({ success: false, error: 'Webhook 地址未填写' }, { status: 400 });
        }

        const body = buildFeishuPayload('DataInsight 告警测试', '这是一条来自 DataInsight Pro 的测试通知，如果您收到此消息，说明飞书通知渠道配置正确。');

        if (secret) {
          const { timestamp, sign } = await computeFeishuSign(secret);
          body.timestamp = timestamp;
          body.sign = sign;
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result.code === 0 || result.StatusCode === 0) {
            return NextResponse.json({ success: true, message: '飞书测试消息发送成功！请检查群聊是否收到。' });
          } else {
            return NextResponse.json({ success: false, error: `飞书返回错误: ${result.msg || result.StatusMessage || '未知错误'}` });
          }
        } else {
          return NextResponse.json({ success: false, error: `HTTP ${response.status}: ${response.statusText}` });
        }
      }

      // ========== Webhook 渠道（智能识别目标平台） ==========
      if (channel === 'webhook') {
        const url = config.url as string;
        const method = (config.method as string) || 'POST';
        const headersStr = (config.headers as string) || '{}';
        const customBody = config.body as string | undefined;

        if (!url) {
          return NextResponse.json({ success: false, error: 'Webhook URL 未填写' }, { status: 400 });
        }

        let headers: Record<string, string> = {};
        try {
          headers = JSON.parse(headersStr);
        } catch {
          // ignore parse error
        }

        // 🔑 核心：自动检测目标平台，生成对应格式的消息
        const platform = detectPlatform(url);
        let payload: Record<string, unknown>;
        let platformHint = '';

        switch (platform) {
          case 'feishu':
            payload = buildFeishuPayload('DataInsight 告警测试', '这是一条来自 DataInsight Pro 的测试通知（通过 Webhook 渠道发送，已自动适配飞书格式）。');
            platformHint = '（已自动适配飞书消息格式）';
            break;
          case 'dingtalk':
            payload = buildDingtalkPayload('DataInsight 告警测试', '这是一条来自 DataInsight Pro 的测试通知（通过 Webhook 渠道发送，已自动适配钉钉格式）。');
            platformHint = '（已自动适配钉钉消息格式）';
            // 钉钉如果配置了签名密钥
            if (config.secret) {
              const { timestamp, sign } = await computeDingtalkSign(config.secret as string);
              (payload as Record<string, unknown>).timestamp = timestamp;
              (payload as Record<string, unknown>).sign = sign;
            }
            break;
          case 'wecom':
            payload = buildWecomPayload('DataInsight 告警测试', '这是一条来自 DataInsight Pro 的测试通知（通过 Webhook 渠道发送，已自动适配企业微信格式）。');
            platformHint = '（已自动适配企业微信消息格式）';
            break;
          default:
            // 通用 Webhook：如果用户自定义了 body 则用自定义，否则用通用格式
            if (customBody) {
              try {
                payload = JSON.parse(customBody);
              } catch {
                payload = buildGenericPayload('DataInsight 告警测试', '测试通知');
              }
            } else {
              payload = buildGenericPayload('DataInsight 告警测试', '这是一条来自 DataInsight Pro 的测试通知。');
            }
            break;
        }

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: method !== 'GET' ? JSON.stringify(payload) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // 对于飞书/钉钉/企微，检查返回的业务码
          if (platform !== 'generic') {
            try {
              const result = await response.json();
              const bizCode = result.code ?? result.StatusCode ?? result.errcode;
              if (bizCode !== undefined && bizCode !== 0) {
                const errMsg = result.msg || result.StatusMessage || result.errmsg || '未知错误';
                return NextResponse.json({ success: false, error: `目标平台返回错误: ${errMsg}` });
              }
            } catch {
              // 非 JSON 响应，视为成功
            }
          }
          return NextResponse.json({
            success: true,
            message: `Webhook 请求成功 (HTTP ${response.status})${platformHint}`,
          });
        } else {
          return NextResponse.json({ success: false, error: `Webhook 返回 HTTP ${response.status}: ${response.statusText}` });
        }
      }

      // ========== 邮件渠道 ==========
      if (channel === 'email') {
        const smtpHost = config.smtpHost || config.smtp as string;
        const recipients = config.recipients || config.to as string;
        const username = config.username || config.user as string;

        if (!smtpHost) {
          return NextResponse.json({ success: false, error: 'SMTP 服务器地址未填写' });
        }
        if (!username) {
          return NextResponse.json({ success: false, error: '邮箱用户名未填写' });
        }
        if (!recipients) {
          return NextResponse.json({ success: false, error: '收件人邮箱未填写' });
        }

        return NextResponse.json({
          success: true,
          message: '邮件配置验证通过！实际发送需配置后端 SMTP 服务。',
        });
      }

      return NextResponse.json({ success: false, error: '未知通知渠道' }, { status: 400 });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ success: false, error: '请求超时（15秒），请检查地址是否正确' });
      }
      throw fetchError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ success: false, error: `测试失败: ${message}` }, { status: 500 });
  }
}
