import { NextRequest, NextResponse } from 'next/server';

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
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      if (channel === 'feishu') {
        const webhookUrl = config.webhookUrl as string;
        const secret = config.secret as string;

        if (!webhookUrl) {
          return NextResponse.json({ success: false, error: 'Webhook 地址未填写' }, { status: 400 });
        }

        // 构建飞书消息体
        const body: Record<string, unknown> = {
          msg_type: 'interactive',
          card: {
            header: {
              title: { content: 'DataInsight 告警测试', tag: 'plain_text' },
              template: 'blue',
            },
            elements: [
              { tag: 'div', text: { content: '这是一条来自 DataInsight Pro 的测试通知，如果您收到此消息，说明飞书通知渠道配置正确。', tag: 'plain_text' } },
              { tag: 'div', text: { content: `发送时间：${new Date().toLocaleString('zh-CN')}`, tag: 'plain_text' } },
            ],
          },
        };

        // 如果有签名密钥，计算签名
        if (secret) {
          const crypto = await import('crypto');
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const stringToSign = `${timestamp}\n${secret}`;
          const hmac = crypto.createHmac('sha256', stringToSign);
          hmac.update('');
          const sign = hmac.digest('base64');
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

      if (channel === 'webhook') {
        const url = config.url as string;
        const method = (config.method as string) || 'POST';
        const headersStr = (config.headers as string) || '{}';

        if (!url) {
          return NextResponse.json({ success: false, error: 'Webhook URL 未填写' }, { status: 400 });
        }

        let headers: Record<string, string> = {};
        try {
          headers = JSON.parse(headersStr);
        } catch {
          // ignore parse error
        }

        const testPayload = {
          alert_name: 'DataInsight 测试告警',
          severity: 'info',
          message: '这是一条来自 DataInsight Pro 的测试通知',
          triggered_at: new Date().toISOString(),
        };

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: method === 'POST' ? JSON.stringify(testPayload) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return NextResponse.json({ success: true, message: `Webhook 请求成功 (HTTP ${response.status})` });
        } else {
          return NextResponse.json({ success: false, error: `Webhook 返回 HTTP ${response.status}: ${response.statusText}` });
        }
      }

      if (channel === 'email') {
        // 邮件需要 SMTP 服务，暂不支持直接发送
        // 验证配置完整性
        const smtpHost = config.smtpHost as string;
        const recipients = config.recipients as string;
        const username = config.username as string;

        if (!smtpHost) {
          return NextResponse.json({ success: false, error: 'SMTP 服务器地址未填写' });
        }
        if (!username) {
          return NextResponse.json({ success: false, error: '邮箱用户名未填写' });
        }
        if (!recipients) {
          return NextResponse.json({ success: false, error: '收件人邮箱未填写' });
        }

        // 配置验证通过
        return NextResponse.json({
          success: true,
          message: '邮件配置验证通过！实际发送需配置后端 SMTP 服务。',
        });
      }

      return NextResponse.json({ success: false, error: '未知通知渠道' }, { status: 400 });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ success: false, error: '请求超时（10秒），请检查地址是否正确' });
      }
      throw fetchError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ success: false, error: `测试失败: ${message}` }, { status: 500 });
  }
}
