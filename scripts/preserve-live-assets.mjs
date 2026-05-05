import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = new URL(process.argv[2] || "https://alin.city/");
const routes = ["/", "/explore"];
const assetsDir = path.resolve("dist", "assets");

function assetType(assetPath) {
  if (assetPath.endsWith(".css")) return "css";
  if (assetPath.endsWith(".js") || assetPath.endsWith(".mjs")) return "js";
  return "other";
}

function isExpectedContentType(type, expected) {
  const value = type.toLowerCase();
  if (expected === "css") return value.includes("text/css");
  if (expected === "js") {
    return value.includes("javascript") || value.includes("ecmascript");
  }
  return !value.includes("text/html");
}

function extractAssets(html) {
  const assets = new Set();
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[1].startsWith("/assets/")) {
        assets.add(match[1]);
      }
    }
  }

  return [...assets];
}

async function fetchText(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.text();
}

async function preserveAsset(assetPath) {
  const expected = assetType(assetPath);
  if (expected === "other") return false;

  const assetUrl = new URL(assetPath, baseUrl);
  const response = await fetch(assetUrl, {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  const type = response.headers.get("content-type") || "";

  if (!response.ok) {
    throw new Error(`${assetPath} returned HTTP ${response.status}`);
  }

  if (!isExpectedContentType(type, expected)) {
    throw new Error(`${assetPath} returned unexpected content-type: ${type}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error(`${assetPath} returned an empty body`);
  }

  const relativeName = assetPath.replace(/^\/assets\//, "");
  await mkdir(assetsDir, { recursive: true });
  await writeFile(path.join(assetsDir, relativeName), bytes);
  console.log(`[preserve-assets] preserved ${assetPath} (${bytes.length} bytes, ${type})`);
  return true;
}

const allAssets = new Set();

for (const route of routes) {
  const routeUrl = new URL(route, baseUrl);
  const html = await fetchText(routeUrl);
  for (const asset of extractAssets(html)) {
    allAssets.add(asset);
  }
}

if (allAssets.size === 0) {
  throw new Error(`No live /assets references found at ${baseUrl}`);
}

let count = 0;
for (const asset of allAssets) {
  if (await preserveAsset(asset)) {
    count += 1;
  }
}

console.log(`[preserve-assets] ${count} live JS/CSS assets preserved from ${baseUrl}`);
