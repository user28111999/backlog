import { EnvHttpProxyAgent, fetch as proxyFetch } from "undici";

// Node's fetch does not automatically honor proxy variables on every supported
// Node version. Route external requests through the configured proxy when present.
const proxy =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.https_proxy ||
  process.env.http_proxy
    ? new EnvHttpProxyAgent()
    : undefined;

export async function providerFetch(url: string, init: RequestInit = {}) {
  if (!proxy) return fetch(url, init);
  return proxyFetch(url, { ...init, dispatcher: proxy } as Parameters<
    typeof proxyFetch
  >[1]);
}
