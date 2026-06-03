export const runtime = "nodejs";

const storyApiUrl = process.env.STORY_API_URL ?? "http://172.192.41.96:1317";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxyStoryApi(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  if (path[0] !== "dkg") {
    return Response.json({ error: "Unsupported Story API path." }, { status: 404 });
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(path.join("/"), storyApiUrl.endsWith("/") ? storyApiUrl : `${storyApiUrl}/`);
  targetUrl.search = sourceUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export function GET(request: Request, context: RouteContext) {
  return proxyStoryApi(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return proxyStoryApi(request, context);
}
