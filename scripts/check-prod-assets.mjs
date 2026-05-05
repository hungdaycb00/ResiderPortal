// Check ALL assets for correct MIME types
const res = await fetch('https://alin.city/');
const html = await res.text();
const assets = html.match(/assets\/[^"'\s<>]+/g) || [];

console.log('=== Checking ALL production assets ===\n');
let errors = 0;
for (const asset of assets) {
  const url = `https://alin.city/${asset}`;
  try {
    const r = await fetch(url, { redirect: 'manual' });
    const ct = r.headers.get('content-type') || 'NONE';
    const isHtml = ct.includes('text/html');
    const status = isHtml ? '❌ BROKEN' : '✅ OK';
    console.log(`${status} [${r.status}] ${asset} → ${ct}`);
    if (isHtml) {
      errors++;
      const body = await r.text();
      console.log('   Body:', body.substring(0, 150));
    }
  } catch (e) {
    console.log(`❌ ERR ${asset}: ${e.message}`);
    errors++;
  }
}
console.log(`\n=== Result: ${errors} errors out of ${assets.length} assets ===`);
