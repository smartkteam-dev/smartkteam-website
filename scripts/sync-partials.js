// Copies partials/nav.html and partials/footer.html into every page between the
// <!-- partial:NAME --> ... <!-- /partial:NAME --> markers.
// Run `npm run sync` after editing a partial. `--check` exits 1 if any page is out of date.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const check = process.argv.includes('--check');
const partials = ['nav', 'footer'].map(name => ({
  name,
  html: fs.readFileSync(path.join(root, 'partials', name + '.html'), 'utf8').trim(),
}));

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
  if (updated !== original) {
    stale++;
    if (check) console.log(`out of date: ${page}`);
    else fs.writeFileSync(file, updated);
  }
}

if (check && stale) process.exit(1);
console.log(check ? 'all pages in sync' : `updated ${stale} page(s)`);
