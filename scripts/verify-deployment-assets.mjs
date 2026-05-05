const targets = process.argv.slice(2);
if (targets.length === 0) {
  targets.push("https://alin.city/");
}
const baseUrl = new URL(targets[0]);

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
  const response = await fetch(resolveAssetUrl(assetPath), {
    redirect: "manual",
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
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

const allAssets = new Set();

for (const target of targets) {
  const pageUrl = new URL(target, baseUrl);
  const indexResponse = await fetch(pageUrl, {
    redirect: "follow",
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });

  if (!indexResponse.ok) {
    fail(`${pageUrl} returned HTTP ${indexResponse.status}`);
    continue;
  }

  for (const asset of extractAssets(await indexResponse.text())) {
    allAssets.add(asset);
  }
}

if (allAssets.size === 0) {
  fail("No /assets references found in checked HTML");
  process.exit();
}

await Promise.all([...allAssets].map(checkAsset));

if (process.exitCode) {
  process.exit();
}

console.log(`[asset-check] ${allAssets.size} assets verified for ${targets.join(", ")}`);
