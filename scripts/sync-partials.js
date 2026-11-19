// Fills the generated parts of every root page:
//   1. Partials: copies partials/NAME.html between <!-- partial:NAME --> ... <!-- /partial:NAME -->
//      (head = Google tag, fonts, icons; nav; footer; schema-org = shared ProfessionalService
//      JSON-LD; contact-form = the consultation form used on the home page and the ad landing page).
//   2. Breadcrumbs: renders the visible breadcrumb trail between <!-- partial:breadcrumbs --> markers
//      from the page's own BreadcrumbList JSON-LD, so the two can never disagree.
//   3. Service schema: renders Service JSON-LD between <!-- partial:service-schema --> markers from the
//      page's visible package cards (see serviceSchema below).
//   4. Asset versions: rewrites every "/assets/FILE" reference to "/assets/FILE?v=HASH" (hash of the
//      file's content). /assets is served with a one-year immutable cache (vercel.json), so a changed
//      file must get a new URL.
// Run `npm run sync` after editing a partial or an asset. `--check` exits 1 if any page is out of date.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const check = process.argv.includes('--check');
const partials = ['head', 'nav', 'footer', 'schema-org', 'contact-form']
  .filter(name => fs.existsSync(path.join(root, 'partials', name + '.html')))
  .map(name => ({
    name,
    html: fs.readFileSync(path.join(root, 'partials', name + '.html'), 'utf8').trim(),
  }));

const assetHash = {};
for (const f of fs.readdirSync(path.join(root, 'assets'))) {
  const buf = fs.readFileSync(path.join(root, 'assets', f));
  assetHash[f] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function breadcrumbs(page, html) {
  const list = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m => { try { return JSON.parse(m[1]); } catch (e) { return null; } })
    .find(j => j && j['@type'] === 'BreadcrumbList');
  if (!list) throw new Error(`${page}: has a breadcrumbs marker but no BreadcrumbList JSON-LD`);
  const items = list.itemListElement.slice().sort((a, b) => a.position - b.position);
  const li = items.map((it, i) => {
    const name = esc(it.name);
    if (i === items.length - 1) return `<li aria-current="page">${name}</li>`;
    const href = String(it.item).replace(/^https:\/\/smartkteam\.com\/?/, '/');
    return `<li><a href="${esc(href)}">${name}</a></li>`;
  });
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${li.join('')}</ol></nav>`;
}

// Service JSON-LD for a service page, built from what the page shows: the service name comes from
// the OfferCatalog in partials/schema-org.html (matched by the page's canonical URL), the
// description from the meta description, and one Offer per visible .package-card (name + price).
const decode = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'")
  .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const catalog = (() => {
  const src = fs.readFileSync(path.join(root, 'partials', 'schema-org.html'), 'utf8');
  const json = JSON.parse(src.replace(/^[\s\S]*?<script[^>]*>/, '').replace(/<\/script>[\s\S]*$/, ''));
  return json.hasOfferCatalog.itemListElement.map(o => o.itemOffered);
})();

function serviceSchema(page, html) {
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const description = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const entry = catalog.find(s => s.url === canonical);
  const name = entry ? entry.name : decode((html.match(/<meta property="og:title" content="([^"|]*)/) || [])[1] || '');
  const offers = [];
  let group = '';
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>|<div class="package-card[^"]*">([\s\S]*?)<a [^>]*class="pkg-cta"/g;
  for (const m of html.matchAll(re)) {
    if (m[1] !== undefined) { group = decode(m[1]); continue; }
    const card = m[2];
    const pkg = decode((card.match(/<div class="pkg-name">([\s\S]*?)<\/div>/) || [])[1] || '');
    const priceText = decode((card.match(/<div class="pkg-price-amount">([\s\S]*?)<\/div>/) || [])[1] || '');
    const p = priceText.match(/\$([\d,]+)(\/mo)?/);
    if (!pkg || !p) throw new Error(`${page}: package card without a name or a $ price ("${pkg}", "${priceText}")`);
    const price = Number(p[1].replace(/,/g, ''));
    const offer = { '@type': 'Offer', name: group ? `${group}: ${pkg}` : pkg, price, priceCurrency: 'USD', url: canonical };
    if (p[2]) offer.priceSpecification = {
      '@type': 'UnitPriceSpecification', price, priceCurrency: 'USD',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
    };
    offers.push(offer);
  }
  if (!offers.length) throw new Error(`${page}: has a service-schema marker but no package cards`);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: canonical,
    provider: { '@id': 'https://smartkteam.com/#organization' },
    areaServed: entry && entry.areaServed ? entry.areaServed
      : [{ '@type': 'Country', name: 'United States' }, { '@type': 'Country', name: 'Canada' }],
    offers: {
      '@type': 'AggregateOffer', priceCurrency: 'USD', offerCount: offers.length,
      lowPrice: Math.min(...offers.map(o => o.price)), highPrice: Math.max(...offers.map(o => o.price)),
      offers,
    },
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

// FAQPage JSON-LD built from the page's visible FAQ (.faq-item: question in <h3>, answer in
// .faq-answer-inner), so the schema only ever contains questions that are on the page.
function faqSchema(page, html) {
  const re = /<div class="faq-item">[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<div class="faq-answer-inner">([\s\S]*?)<\/div>/g;
  const mainEntity = [...html.matchAll(re)].map(m => ({
    '@type': 'Question',
    name: decode(m[1]),
    acceptedAnswer: { '@type': 'Answer', text: decode(m[2]) },
  }));
  if (!mainEntity.length) throw new Error(`${page}: has a faq-schema marker but no .faq-item`);
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let stale = 0;

for (const page of pages) {
  const file = path.join(root, page);
  const original = fs.readFileSync(file, 'utf8');
  let updated = original;
  for (const { name, html } of partials) {
    const re = new RegExp(`<!-- partial:${name} -->[\\s\\S]*?<!-- /partial:${name} -->`);
    if (re.test(updated)) {
      updated = updated.replace(re, () => `<!-- partial:${name} -->\n${html}\n<!-- /partial:${name} -->`);
    }
  }
  const bcRe = /<!-- partial:breadcrumbs -->[\s\S]*?<!-- \/partial:breadcrumbs -->/;
  if (bcRe.test(updated)) {
    const nav = breadcrumbs(page, updated);
    updated = updated.replace(bcRe, () => `<!-- partial:breadcrumbs -->${nav}<!-- /partial:breadcrumbs -->`);
  }
  const svRe = /<!-- partial:service-schema -->[\s\S]*?<!-- \/partial:service-schema -->/;
  if (svRe.test(updated)) {
    const sv = serviceSchema(page, updated);
    updated = updated.replace(svRe, () => `<!-- partial:service-schema -->\n${sv}\n<!-- /partial:service-schema -->`);
  }
  const fqRe = /<!-- partial:faq-schema -->[\s\S]*?<!-- \/partial:faq-schema -->/;
  if (fqRe.test(updated)) {
    const fq = faqSchema(page, updated);
    updated = updated.replace(fqRe, () => `<!-- partial:faq-schema -->\n${fq}\n<!-- /partial:faq-schema -->`);
  }
  updated = updated.replace(/(["'(])\/assets\/([\w.-]+?)(\?v=[0-9a-f]*)?(["')])/g, (m, open, f, v, close) => {
    if (!assetHash[f]) throw new Error(`${page}: references /assets/${f}, which does not exist`);
    return `${open}/assets/${f}?v=${assetHash[f]}${close}`;
  });
  if (updated !== original) {
    stale++;
    if (check) console.log(`out of date: ${page}`);
    else fs.writeFileSync(file, updated);
  }
}

if (check && stale) process.exit(1);
console.log(check ? 'all pages in sync' : `updated ${stale} page(s)`);
