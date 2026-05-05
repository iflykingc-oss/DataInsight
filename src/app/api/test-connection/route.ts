import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, apiKey, model } = await req.json();

    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：baseUrl、apiKey、model' },
        { status: 400 }
      );
    }

    // 清理 baseUrl（去除末尾斜杠）
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    // 构建 chat/completions 路径
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Reply with exactly one word: OK' }
          ],
          max_tokens: 10,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          // 即使解析失败，HTTP 200 也说明连接成功
        }

        const assistantReply = data?.choices?.[0]?.message?.content || '';

        return NextResponse.json({
          success: true,
          message: '连接成功！模型响应正常',
          latency: response.headers.get('x-response-time') || undefined,
          reply: assistantReply,
        });
      } else {
        let errorBody: { message?: string; error?: { message?: string }; code?: string } = {};
        try {
          errorBody = await response.json();
        } catch {
          // ignore parse error
        }

        // 常见错误码友好提示
        const errorMsg = errorBody?.error?.message || errorBody?.message || response.statusText;
        const errorCode = response.status;

        let hint = '';
        if (errorCode === 401) hint = '（可能是 API Key 无效或已过期）';
        else if (errorCode === 403) hint = '（可能是 IP 白名单限制或权限不足）';
        else if (errorCode === 429) hint = '（请求过于频繁，请稍后重试）';
        else if (errorCode === 404) hint = '（模型名称不正确或该端点不可用）';
        else if (errorCode === 400) hint = '（请求参数有误，可能是模型名称不匹配）';

        return NextResponse.json({
          success: false,
          error: `连接失败 (HTTP ${errorCode}): ${errorMsg} ${hint}`.trim(),
          errorCode,
        });
      }
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: '连接超时（15秒），请检查 baseUrl 是否正确，或网络是否可达',
          errorCode: 'TIMEOUT',
        });
      }
      throw fetchError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { success: false, error: `连接失败: ${message}` },
      { status: 500 }
    );
  }
}
