// On-page SEO checks for every root page. Run by `npm run check` and the pre-commit hook.
// Fails (exit 1) on any of:
//   - <title> missing, longer than 60 characters, or used by another page
//   - meta description missing, longer than 155 characters, or used by another page
//   - not exactly one <h1>
//   - an <img> without an alt attribute (alt="" is allowed for decorative images)
//   - <html lang> not set, or the Google tag partial (Analytics) missing
//   - canonical tag missing or not https://smartkteam.com/<page>
//   - og:title / og:description / twitter:title / twitter:description different from the title or description
//   - og:image or twitter:image missing, not a file in this repo, or og:image:width/height not its real size
//   - a JSON-LD block that is not valid JSON
//   - an internal link or image that points to nothing (no page, file or vercel.json redirect)
//   - a sitemap URL whose page is missing or noindex
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SITE = 'https://smartkteam.com';
const errors = [];
const err = (page, msg) => errors.push(`${page}: ${msg}`);

const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (h, attr, name) => {
  const m = h.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
  return m ? decode(m[1]) : null;
};

function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const redirects = new Set(vercel.redirects.map(r => r.source));
function resolves(href) {
  const p = decodeURI(href.split('#')[0].split('?')[0]);
  if (p === '' || p === '/') return true;
  if (redirects.has(p)) return true;
  const rel = p.replace(/^\//, '');
  return [rel, rel + '.html', path.join(rel, 'index.html')].some(f => fs.existsSync(path.join(root, f)) && fs.statSync(path.join(root, f)).isFile());
}

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort();
const titles = new Map();
const descs = new Map();
const noindex = new Set();

for (const page of pages) {
  const h = fs.readFileSync(path.join(root, page), 'utf8');
  const expected = page === 'index.html' ? `${SITE}/` : `${SITE}/${page.replace(/\.html$/, '')}`;
  if (/<meta name="robots" content="[^"]*noindex/.test(h)) noindex.add(expected);

  const title = decode(((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim());
  if (!title) err(page, 'missing <title>');
  else if (title.length > 60) err(page, `title is ${title.length} characters (max 60): "${title}"`);
  if (title) titles.set(title, [...(titles.get(title) || []), page]);

  const desc = meta(h, 'name', 'description');
  if (!desc) err(page, 'missing meta description');
  else if (desc.length > 155) err(page, `meta description is ${desc.length} characters (max 155)`);
  if (desc) descs.set(desc, [...(descs.get(desc) || []), page]);

  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(page, `has ${h1} <h1> elements (expected 1)`);

  for (const img of h.match(/<img\b[^>]*>/g) || []) {
    if (!/\balt="/.test(img)) err(page, `image without alt attribute: ${img.slice(0, 100)}`);
  }

  if (!/<html lang="[a-z]{2}(-[A-Z]{2})?">/.test(h)) err(page, '<html lang> not set');
  if (!h.includes('<!-- partial:head -->') || !h.includes('googletagmanager.com/gtm.js')) err(page, 'missing the head partial (Google tag)');

  if (page !== '404.html') {
    const canonical = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (canonical !== expected) err(page, `canonical is ${canonical || 'missing'}, expected ${expected}`);

    for (const [attr, name, want] of [
      ['property', 'og:title', title], ['property', 'og:description', desc],
      ['name', 'twitter:title', title], ['name', 'twitter:description', desc],
    ]) {
      const v = meta(h, attr, name);
      if (v !== want) err(page, `${name} ${v === null ? 'missing' : 'differs from the page ' + (name.endsWith('title') ? 'title' : 'description')}`);
    }
    for (const [attr, name] of [['property', 'og:image'], ['name', 'twitter:image']]) {
      const v = meta(h, attr, name);
      if (!v) { err(page, `${name} missing`); continue; }
      if (!v.startsWith(SITE + '/')) { err(page, `${name} is not on ${SITE}: ${v}`); continue; }
      const file = path.join(root, v.slice(SITE.length + 1));
      if (!fs.existsSync(file)) { err(page, `${name} file not found: ${v}`); continue; }
      if (name === 'og:image' && /\.jpe?g$/i.test(file)) {
        const size = jpegSize(file);
        const w = Number(meta(h, 'property', 'og:image:width'));
        const ht = Number(meta(h, 'property', 'og:image:height'));
        if (size && (size.width !== w || size.height !== ht)) {
          err(page, `og:image:width/height say ${w}x${ht} but the image is ${size.width}x${size.height}`);
        }
      }
    }
  }

  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { err(page, `invalid JSON-LD: ${e.message}`); }
  }

  for (const m of h.matchAll(/\b(?:href|src)="(\/[^"]*)"/g)) {
    if (!resolves(m[1])) err(page, `broken internal link: ${m[1]}`);
  }
  for (const m of h.matchAll(/\bsrcset="([^"]*)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith('/') && !resolves(u)) err(page, `broken srcset image: ${u}`);
    }
  }
}

for (const [t, ps] of titles) if (ps.length > 1) err(ps.join(', '), `share the title "${t}"`);
for (const [d, ps] of descs) if (ps.length > 1) err(ps.join(', '), `share the same meta description`);

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const url = m[1];
  const file = url === `${SITE}/` ? 'index.html' : url.slice(SITE.length + 1) + '.html';
  if (!fs.existsSync(path.join(root, file))) err('sitemap.xml', `${url} has no page`);
  else if (noindex.has(url)) err('sitemap.xml', `${url} is noindex and should not be in the sitemap`);
}

if (errors.length) {
  console.error(`SEO check failed (${errors.length}):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`SEO checks OK: ${pages.length} pages`);
