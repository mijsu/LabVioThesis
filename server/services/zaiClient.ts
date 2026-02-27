// Simple wrapper around the Z.ai OpenAI-compatible API using fetch.
// We avoid using the official OpenAI npm package because the Z.ai
// endpoint may not exactly mirror OpenAI's routing, and we want explicit
// control over the request URL in order to debug 404s.

// We don't rely on the @types/node package, so simply declare `process`
// to keep the compiler happy. At runtime Node provides it.
declare const process: any;

const zaiKey = process.env.ZAI_API_KEY?.trim();
if (!zaiKey) {
  console.error('❌ FATAL: ZAI_API_KEY is not set in zaiClient');
  process.exit(1);
}

const zaiUrlRaw = process.env.ZAI_API_URL?.trim() || 'https://api.z.ai';
// Ensure base URL does not end with slash
export const zaiBaseUrl = zaiUrlRaw.replace(/\/+$/, '');

async function zaiChatCompletion(
  messages: Array<{ role: string; content: string }>,
  opts?: { model?: string; temperature?: number; max_tokens?: number }
) {
  const endpoint = `${zaiBaseUrl}/v1/chat/completions`;
  console.log('🚀 zaiChatCompletion POST', endpoint);
  const body: any = {
    model: opts?.model || 'gpt-4o-mini',
    messages,
  };
  if (opts?.temperature !== undefined) body.temperature = opts.temperature;
  if (opts?.max_tokens !== undefined) body.max_tokens = opts.max_tokens;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${zaiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('⚠️ Z.ai response error', res.status, text);
    const err = new Error(`Z.ai request failed ${res.status}: ${text}`);
    (err as any).status = res.status;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse Z.ai JSON response:', text);
    throw e;
  }
}

export { zaiChatCompletion };
