// Generates llms.txt and llms-full.txt from the site's own HTML pages and the shared
// ProfessionalService schema in partials/schema-org.html. Never edit the .txt files by hand.
//
//   node scripts/build-llms.js          write llms.txt and llms-full.txt
//   node scripts/build-llms.js --check  fail if they are stale, incomplete or non-deterministic
//
// What goes where:
//   - Pages: every root *.html page that is indexable (not 404.html, no noindex).
//   - Services: the order and names of partials/schema-org.html hasOfferCatalog (each needs a url).
//   - Industry websites: pages named websites-for-*.html (website design for one type of business).
//   - Blog posts: any page with BlogPosting JSON-LD, newest first.
//   - Everything else (home, blog index, Q&A, any new page) goes under "Pages".
//   - Page text comes from <main>, converted to Markdown. Decorative labels, images, icons,
//     breadcrumbs and form fields are dropped (see SKIP_CLASSES below).
// Zero dependencies on purpose: it runs in the pre-commit hook on a fresh clone.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://smartkteam.com';
const OUT_INDEX = 'llms.txt';
const OUT_FULL = 'llms-full.txt';

// ---------------------------------------------------------------- HTML parsing

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®', trade: '™', middot: '·',
  times: '×', rarr: '→', larr: '←', bull: '•', deg: '°', eacute: 'é', ntilde: 'ñ', check: '✓',
};

function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const tagRe = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  const attrRe = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const lower = html.toLowerCase();
  let last = 0;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m.index > last) top().children.push({ text: html.slice(last, m.index) });
    last = tagRe.lastIndex;
    if (m[0][1] === '!') continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const tag = m[2].toLowerCase();
    const attrs = {};
    let a;
    attrRe.lastIndex = 0;
    while ((a = attrRe.exec(m[3]))) attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
    const node = { tag, attrs, children: [], parent: top() };
    top().children.push(node);
    if (RAW.has(tag)) {
      let end = lower.indexOf('</' + tag, last);
      if (end < 0) end = html.length;
      node.children.push({ text: html.slice(last, end), raw: true });
      last = end;
      tagRe.lastIndex = end;
    } else if (!VOID.has(tag) && !m[4]) {
      stack.push(node);
    }
  }
  if (last < html.length) top().children.push({ text: html.slice(last) });
  return root;
}

const classes = n => new Set((n.attrs && n.attrs.class || '').split(/\s+/).filter(Boolean));
const hasClass = (n, c) => classes(n).has(c);

function findAll(node, pred, out = []) {
  for (const c of node.children || []) {
    if (c.tag) {
      if (pred(c)) out.push(c);
      findAll(c, pred, out);
    }
  }
  return out;
}
const find = (node, pred) => findAll(node, pred)[0];
const byClass = (node, c) => find(node, n => hasClass(n, c));

function rawText(node) {
  if (node.text !== undefined) return node.raw ? node.text : decode(node.text);
  if (SKIP_TAGS.has(node.tag)) return '';
  return node.children.map(rawText).join(node.tag === 'br' ? ' ' : '');
}
function plain(node) {
  if (!node) return '';
  return collapse(rawText(withBreaks(node)));
}
// <br> and block children become spaces in plain text
function withBreaks(node) {
  if (node.text !== undefined) return node;
  if (node.tag === 'br') return { text: ' ' };
  const kids = node.children.map(withBreaks);
  if (BLOCK_TAGS.has(node.tag)) kids.unshift({ text: ' ' }), kids.push({ text: ' ' });
  return { ...node, children: kids };
}
const collapse = s => s.replace(/\s+/g, ' ').replace(/\$\s+(?=\d)/g, '$').trim();

// ------------------------------------------------------------- HTML -> Markdown

const SKIP_TAGS = new Set(['script', 'style', 'svg', 'canvas', 'img', 'picture', 'video', 'audio', 'iframe',
  'noscript', 'template', 'button', 'input', 'select', 'textarea', 'label', 'option', 'nav', 'head']);
const BLOCK_TAGS = new Set(['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'figure', 'figcaption',
  'p', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'form']);
// Decorative labels, numbering, image/visual wrappers and UI chrome.
const SKIP_CLASSES = new Set([
  'eyebrow', 'page-hero-eyebrow', 'hero-eyebrow', 'page-hero-meta', 'page-hero-bg', 'intro-label', 'back-link', 'breadcrumb',
  'step-num', 'process-step-num', 'service-num', 'why-item-num', 'bento-num', 'bento-cat', 'bento-cta',
  'home-section-count', 'service-card-badge', 'pkg-badge', 'pkg-rule', 'ticker-band', 'slideshow',
  'hero-scroll', 'hero-rule', 'hero-grid-line', 'hero-overlay', 'hero-photo-bg', 'scroll-line',
  'hero-right', // repeats the stats shown in the intro section
  'testimonial-deco', 'testimonial-rule', 'article-divider', 'faq-toggle', 'blog-meta', 'blog-img-wrap',
  'why-visual', 'process-visual', 'field-error-msg', 'form-success',
]);
// "**Title**: description" list items
const TITLED_ITEMS = {
  'step-item': ['step-title', 'step-desc'],
  'process-step': ['process-step-title', 'process-step-desc'],
  'why-item': ['why-item-title', 'why-item-desc'],
  'benefit-card': ['benefit-title', 'benefit-desc'],
};
const PLAIN_ITEMS = new Set(['hero-stat', 'intro-stat']);

function absUrl(href, pageUrl) {
  if (!href) return '';
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith('#')) return pageUrl + href;
  if (href.startsWith('/')) return SITE + href;
  return SITE + '/' + href;
}

function nearestId(node) {
  for (let n = node; n; n = n.parent) if (n.attrs && n.attrs.id && n.tag !== 'form') return n.attrs.id;
  return '';
}

class Md {
  constructor(page) { this.page = page; this.blocks = []; this.buf = ''; }
  flush() { const t = tidy(this.buf); if (t) this.blocks.push({ kind: 'p', text: t }); this.buf = ''; }
  block(kind, text) { this.flush(); const t = kind === 'quote' ? text.trim() : tidy(text); if (t) this.blocks.push({ kind, text: t }); }
}
const tidy = s => collapse(s).replace(/\*\*\s*\*\*/g, '').replace(/(^|\s)\*\s*\*(\s|$)/g, '$1$2').trim();

// Inline Markdown for a subtree (links, emphasis); block children become spaces.
function inline(node, page, opts = {}) {
  if (node.text !== undefined) return node.raw ? '' : decode(node.text);
  if (skip(node)) return '';
  const inner = () => node.children.map(c => inline(c, page, opts)).join('');
  switch (node.tag) {
    case 'br': return ' ';
    case 'a': {
      const label = collapse(inner()).replace(/\s*[→←]\s*/g, ' ').trim();
      const href = absUrl(node.attrs.href, page.url);
      if (!label) return '';
      return opts.noLinks || !href ? label : `[${label.replace(/[[\]]/g, '')}](${href})`;
    }
    case 'em': case 'i': return opts.plain ? inner() : wrap(inner(), '*');
    case 'strong': case 'b': return opts.plain ? inner() : wrap(inner(), '**');
    default: return BLOCK_TAGS.has(node.tag) ? ` ${inner()} ` : inner();
  }
}
function wrap(s, mark) {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : s;
}

function skip(node) {
  if (!node.attrs) return false;
  if (SKIP_TAGS.has(node.tag)) return true;
  if (node.attrs['aria-hidden'] === 'true' || node.attrs.hidden !== undefined) return true;
  for (const c of classes(node)) if (SKIP_CLASSES.has(c)) return true;
  return false;
}

function walk(node, md) {
  if (node.text !== undefined) { if (!node.raw) md.buf += decode(node.text); return; }
  if (node.tag === 'form') {
    const submit = find(node, n => n.tag === 'button');
    const label = submit ? collapse(submit.children.map(rawText).join('')) : '';
    const id = nearestId(node);
    md.block('p', `[${label || 'Contact form'}](${md.page.url}${id ? '#' + id : ''})`);
    return;
  }
  if (skip(node)) return;
  const cls = classes(node);
  const page = md.page;

  for (const [c, [tCls, dCls]] of Object.entries(TITLED_ITEMS)) {
    if (cls.has(c)) {
      const t = plain(byClass(node, tCls));
      const d = tidy(inline(byClass(node, dCls) || { children: [] }, page));
      md.block('li', d ? `**${t}**: ${d}` : `**${t}**`);
      return;
    }
  }
  for (const c of PLAIN_ITEMS) if (cls.has(c)) { md.block('li', plain(node)); return; }
  if (cls.has('pkg-addon-card')) {
    if (!plain(byClass(node, 'pkg-addon-name'))) return; // empty filler card
    const d = tidy(inline(byClass(node, 'pkg-addon-desc') || { children: [] }, page));
    md.block('li', `**${plain(byClass(node, 'pkg-addon-name'))}** (${plain(byClass(node, 'pkg-addon-price'))})${d ? ': ' + d : ''}`);
    return;
  }
  if (cls.has('package-card')) {
    md.block('h3', `${plain(byClass(node, 'pkg-name'))}: ${plain(byClass(node, 'pkg-price-amount'))}`);
    md.block('p', plain(byClass(node, 'pkg-price')));
    for (const li of findAll(node, n => n.tag === 'li')) md.block('li', tidy(inline(li, page)));
    const cta = byClass(node, 'pkg-cta');
    if (cta) md.block('p', inline(cta, page));
    return;
  }
  if (cls.has('bento-card')) {
    md.block('li', `[${plain(byClass(node, 'bento-title'))}](${absUrl(node.attrs.href, page.url)}): ${plain(byClass(node, 'bento-desc'))}`);
    return;
  }
  if (cls.has('languages')) {
    const items = findAll(node, n => hasClass(n, 'lang-item')).map(plain);
    md.block('p', `**${plain(byClass(node, 'lang-label'))}**: ${items.join(', ')}`);
    return;
  }
  if (cls.has('testimonial-inner')) {
    const who = [plain(byClass(node, 'testimonial-author')), plain(byClass(node, 'testimonial-role'))].filter(Boolean).join(', ');
    md.block('quote', `${plain(byClass(node, 'testimonial-quote'))}\n\n— ${who}`);
    return;
  }
  if (cls.has('article-pullquote') || node.tag === 'blockquote') { md.block('quote', tidy(inline(node, page))); return; }

  const h = node.tag.match(/^h([1-6])$/);
  if (h) {
    const text = plain(node);
    if (h[1] === '1') {
      if (norm(text) !== norm(page.title)) md.block('p', `**${text}**`);
    } else {
      md.block('h' + h[1], text);
    }
    return;
  }
  if (node.tag === 'li') { md.block('li', tidy(inline(node, page))); return; }
  if (node.tag === 'a' && find(node, n => BLOCK_TAGS.has(n.tag))) { md.block('p', inline(node, page)); return; }
  if (['a', 'em', 'i', 'strong', 'b', 'br'].includes(node.tag)) { md.buf += inline(node, page); return; }

  const isBlock = BLOCK_TAGS.has(node.tag);
  if (isBlock) md.flush();
  for (const c of node.children) walk(c, md);
  if (isBlock) md.flush();
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

function toMarkdown(mainNode, page) {
  const md = new Md(page);
  walk(mainNode, md);
  md.flush();
  const out = [];
  md.blocks.forEach((b, i) => {
    const prev = md.blocks[i - 1];
    if (i > 0) out.push(b.kind === 'li' && prev.kind === 'li' ? '\n' : '\n\n');
    if (b.kind === 'li') out.push('- ' + b.text);
    else if (b.kind === 'quote') out.push(b.text.split('\n').map(l => (l ? '> ' + l : '>')).join('\n'));
    else if (/^h\d$/.test(b.kind)) out.push('#'.repeat(Math.min(+b.kind[1], 4)) + ' ' + b.text);
    else out.push(b.text);
  });
  return out.join('');
}

// ------------------------------------------------------------------- site model

function jsonLd(doc) {
  return findAll(doc, n => n.tag === 'script' && n.attrs.type === 'application/ld+json')
    .map(n => JSON.parse(n.children.map(c => c.text).join('')));
}

function loadPage(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const doc = parse(html);
  const meta = name => {
    const n = find(doc, x => x.tag === 'meta' && x.attrs.name === name);
    return n ? collapse(n.attrs.content || '') : '';
  };
  const canonical = find(doc, n => n.tag === 'link' && n.attrs.rel === 'canonical');
  const titleNode = find(doc, n => n.tag === 'title');
  const page = {
    file,
    fullTitle: titleNode ? collapse(decode(titleNode.children.map(c => c.text).join(''))) : '',
    description: meta('description'),
    robots: meta('robots'),
    url: canonical ? canonical.attrs.href : '',
    expectedUrl: file === 'index.html' ? SITE + '/' : `${SITE}/${file.replace(/\.html$/, '')}`,
    ld: jsonLd(doc),
    main: find(doc, n => n.tag === 'main'),
  };
  page.title = page.fullTitle.split(' | ')[0];
  page.post = page.ld.find(d => d['@type'] === 'BlogPosting');
  if (page.post) page.title = page.post.headline;
  return page;
}

function loadSite() {
  const org = JSON.parse(fs.readFileSync(path.join(ROOT, 'partials/schema-org.html'), 'utf8')
    .replace(/^[\s\S]*?<script[^>]*>/, '').replace(/<\/script>[\s\S]*$/, ''));
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort()
    .map(loadPage)
    .filter(p => p.file !== '404.html' && !/noindex/i.test(p.robots));
  const byUrl = new Map(pages.map(p => [p.url, p]));

  const services = org.hasOfferCatalog.itemListElement.map(o => {
    const page = byUrl.get(o.itemOffered.url);
    if (!page) throw new Error(`schema-org service "${o.itemOffered.name}" has no indexable page (${o.itemOffered.url})`);
    return { ...o.itemOffered, page };
  });
  const serviceUrls = new Set(services.map(s => s.page.url));
  const posts = pages.filter(p => p.post)
    .sort((a, b) => b.post.datePublished.localeCompare(a.post.datePublished) || a.url.localeCompare(b.url));
  const industries = pages.filter(p => /^websites-for-/.test(p.file)).sort((a, b) => a.url.localeCompare(b.url));
  const industryUrls = new Set(industries.map(p => p.url));
  const others = pages.filter(p => !p.post && !serviceUrls.has(p.url) && !industryUrls.has(p.url))
    .sort((a, b) => (a.url === SITE + '/' ? -1 : b.url === SITE + '/' ? 1 : a.url.localeCompare(b.url)));
  return { org, pages, services, industries, posts, others };
}

// Starting price from the page's own package cards, or from a Service offer in its JSON-LD.
function startingPrice(page) {
  const prices = findAll(page.main, n => hasClass(n, 'pkg-price-amount')).map(plain)
    .map(text => ({ text, value: parseFloat(text.replace(/[^0-9.]/g, '')) }))
    .filter(p => !Number.isNaN(p.value))
    .sort((a, b) => a.value - b.value);
  if (prices.length) return `packages from ${prices[0].text}`;
  for (const d of page.ld) {
    const spec = d.offers && d.offers.priceSpecification;
    if (spec && (spec.minPrice ?? spec.price) !== undefined) {
      const unit = spec.referenceQuantity && spec.referenceQuantity.unitText;
      return `from $${spec.minPrice ?? spec.price}${unit ? ' per ' + unit : ''}`;
    }
  }
  return 'quoted on request';
}

// -------------------------------------------------------------------- rendering

const COUNTRIES = { US: 'United States', CA: 'Canada' };
const LANGUAGES = { en: 'English', es: 'Spanish', zh: 'Chinese' };
const TIMEZONES = { WA: 'Pacific Time', OR: 'Pacific Time', CA: 'Pacific Time' };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function time12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function dayRange(days) {
  const idx = days.map(d => DAYS.indexOf(d)).sort((a, b) => a - b);
  const contiguous = idx.every((d, i) => i === 0 || d === idx[i - 1] + 1);
  return contiguous && idx.length > 2 ? `${DAYS[idx[0]]} to ${DAYS[idx[idx.length - 1]]}` : idx.map(i => DAYS[i]).join(', ');
}
function profileLabel(url) {
  if (/maps\.app\.goo\.gl|google\.com\/maps|g\.page|business\.google/.test(url)) return 'Google Business Profile';
  const host = new URL(url).hostname.replace(/^www\./, '');
  return { 'facebook.com': 'Facebook', 'instagram.com': 'Instagram', 'linkedin.com': 'LinkedIn', 'youtube.com': 'YouTube', 'x.com': 'X', 'tiktok.com': 'TikTok' }[host] || host;
}

function renderIndex(site) {
  const { org, services, industries, posts, others } = site;
  const a = org.address;
  const tz = TIMEZONES[a.addressRegion];
  const L = [];
  L.push(`# ${org.name}`, '', `> ${org.description}`, '', '## Key facts', '');
  L.push(`- Website: ${org.url}`);
  L.push(`- Based in: ${a.addressLocality}, ${a.addressRegion}, ${COUNTRIES[a.addressCountry] || a.addressCountry}`);
  if (org.foundingDate) L.push(`- Founded: ${org.foundingDate}`);
  const countries = [].concat(org.areaServed || []).filter(x => x['@type'] === 'Country').map(x => x.name);
  if (countries.length) L.push(`- Area served: ${countries.join(' and ')}`);
  for (const s of services) {
    if (s.areaServed) L.push(`- ${s.name}: ${[].concat(s.areaServed).map(x => x.name).join(' and ')} only`);
  }
  for (const h of [].concat(org.openingHoursSpecification || [])) {
    L.push(`- Office hours: ${dayRange([].concat(h.dayOfWeek))}, ${time12(h.opens)} to ${time12(h.closes)}${tz ? ' (' + tz + ')' : ''}`);
  }
  if (org.knowsLanguage) L.push(`- Languages: ${org.knowsLanguage.map(l => LANGUAGES[l] || l).join(', ')}`);
  const contactPage = others.find(p => p.url === SITE + '/');
  L.push(`- Contact: email ${org.email}${org.telephone ? `, phone ${org.telephone}` : ' (no phone number is published)'}` +
    (contactPage ? `, or the contact form at ${SITE}/#contact` : ''));
  L.push('- Pricing: published on each service page; starting prices are listed under Services and full package details are in llms-full.txt');
  if (org.sameAs) L.push(`- Profiles: ${org.sameAs.map(u => `[${profileLabel(u)}](${u})`).join(', ')}`);

  L.push('', '## Services', '');
  for (const s of services) {
    L.push(`- [${s.name}](${s.page.url}): ${s.page.description} Pricing: ${startingPrice(s.page)}.`);
  }
  L.push('', '## Industry websites', '');
  for (const p of industries) L.push(`- [${p.title}](${p.url}): ${p.description} Pricing: ${startingPrice(p)}.`);
  L.push('', '## Pages', '');
  for (const p of others) L.push(`- [${p.title}](${p.url}): ${p.description}`);
  L.push('', '## Blog', '');
  for (const p of posts) L.push(`- [${p.title}](${p.url}): ${p.post.description} (published ${p.post.datePublished})`);
  L.push('', '## Full content', '');
  L.push(`- [llms-full.txt](${SITE}/${OUT_FULL}): the full text of every page and blog post above, in Markdown`);
  return L.join('\n') + '\n';
}

function renderFull(site) {
  const ordered = [site.others[0], ...site.services.map(s => s.page), ...site.industries, ...site.others.slice(1), ...site.posts];
  return ordered.map(p => {
    const head = [`# ${p.title}`, `URL: ${p.url}`];
    if (p.post) {
      head.push(`Published: ${p.post.datePublished}`);
      if (p.post.dateModified && p.post.dateModified !== p.post.datePublished) head.push(`Updated: ${p.post.dateModified}`);
    }
    return head.join('\n') + '\n\n' + toMarkdown(p.main, p);
  }).join('\n\n---\n\n') + '\n';
}

function build() {
  const site = loadSite();
  return { site, files: { [OUT_INDEX]: renderIndex(site), [OUT_FULL]: renderFull(site) } };
}

// ----------------------------------------------------------------------- checks

function check() {
  const errors = [];
  const first = build();
  const second = build();
  for (const [name, content] of Object.entries(first.files)) {
    if (content !== second.files[name]) errors.push(`${name}: two builds in a row differ (non-deterministic output)`);
    const onDisk = fs.existsSync(path.join(ROOT, name)) ? fs.readFileSync(path.join(ROOT, name), 'utf8') : null;
    if (onDisk !== content) errors.push(`${name}: out of date, run \`npm run generate\``);
    if (/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(content)) errors.push(`${name}: contains an undecoded HTML entity`);
    if (/<\/?(div|span|p|a|section|img|br)\b/i.test(content)) errors.push(`${name}: contains leftover HTML tags`);
  }
  const { site, files } = first;

  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  for (const url of locs) {
    if (!files[OUT_INDEX].includes(`](${url})`)) errors.push(`${OUT_INDEX}: sitemap URL missing: ${url}`);
    if (!files[OUT_FULL].includes(`\nURL: ${url}\n`)) errors.push(`${OUT_FULL}: sitemap URL missing: ${url}`);
  }
  for (const p of site.pages) {
    if (!locs.includes(p.url)) errors.push(`sitemap.xml: indexable page missing: ${p.url} (${p.file})`);
    if (p.url !== p.expectedUrl) errors.push(`${p.file}: canonical ${p.url || '(none)'} should be ${p.expectedUrl}`);
    if (!p.description) errors.push(`${p.file}: no meta description`);
    if (!p.main) errors.push(`${p.file}: no <main> element`);
    if (p.post && !p.post.datePublished) errors.push(`${p.file}: BlogPosting has no datePublished`);
  }

  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) errors.push('robots.txt: Sitemap line missing');
  if (!robots.includes(`${SITE}/llms.txt`)) errors.push('robots.txt: llms.txt comment missing');
  if (!/User-agent: \*\s*\nAllow: \//.test(robots)) errors.push('robots.txt: the allow-all group is missing');

  if (errors.length) {
    console.error(errors.map(e => '✗ ' + e).join('\n'));
    process.exit(1);
  }
  console.log(`llms files OK: ${site.pages.length} pages, all ${locs.length} sitemap URLs covered, deterministic`);
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    check();
  } else {
    const { files } = build();
    let changed = 0;
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(ROOT, name);
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) { fs.writeFileSync(file, content); changed++; }
    }
    console.log(`wrote ${changed} llms file(s)`);
  }
}
