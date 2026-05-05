const target = process.argv[2] || "https://alin.city/";
const baseUrl = new URL(target);

function fail(message) {
  console.error(`[asset-check] ${message}`);
  process.exitCode = 1;
}

function resolveAssetUrl(assetPath) {
  return new URL(assetPath, baseUrl).toString();
}

function extractAssets(html) {
  const assets = [];
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const assetPath = match[1];
      if (assetPath.startsWith("/assets/")) {
        assets.push(assetPath);
      }
    }
  }

  return [...new Set(assets)];
}

async function checkAsset(assetPath) {
  const response = await fetch(resolveAssetUrl(assetPath), { redirect: "manual" });
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (!response.ok) {
    fail(`${assetPath} returned HTTP ${response.status}`);
    return;
  }

  if (contentType.includes("text/html")) {
    fail(`${assetPath} returned HTML instead of a static asset`);
    return;
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) {
    fail(`${assetPath} returned an empty body`);
  }
}

const indexResponse = await fetch(baseUrl, { redirect: "follow" });
if (!indexResponse.ok) {
  fail(`${baseUrl} returned HTTP ${indexResponse.status}`);
  process.exit();
}

const assets = extractAssets(await indexResponse.text());

if (assets.length === 0) {
  fail("No /assets references found in index HTML");
  process.exit();
}

await Promise.all(assets.map(checkAsset));

if (process.exitCode) {
  process.exit();
}

console.log(`[asset-check] ${assets.length} assets verified for ${baseUrl}`);
