const HTML_CONTENT_TYPE = "text/html";

function assetNotFound() {
  return new Response("Asset not found.", {
    status: 404,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function onRequest(context) {
  const response = await context.env.ASSETS.fetch(context.request);
  const contentType = response.headers.get("content-type") || "";
  const isNotModified = response.status === 304;

  if ((!response.ok && !isNotModified) || contentType.toLowerCase().includes(HTML_CONTENT_TYPE)) {
    return assetNotFound();
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(isNotModified ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
