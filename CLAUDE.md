# smartkteam.com

Static HTML site on Vercel. **There is no build step on deploy:** Vercel serves the committed files as they are, so every generated file must be regenerated and committed with the change that caused it. See README.md for page list, CSS structure and the contact form.

## Generated files: never edit these by hand

| Generated | Edit instead |
|---|---|
| `llms.txt`, `llms-full.txt` | the pages themselves, `partials/schema-org.html`, or `scripts/build-llms.js` |
| Content between `<!-- partial:NAME -->` and `<!-- /partial:NAME -->` in any root `*.html` | `partials/NAME.html` (`nav`, `footer`, `schema-org`) |

`robots.txt`, `sitemap.xml` and `vercel.json` are hand-edited.

## After any change

```sh
npm run generate   # sync partials into pages, regenerate llms.txt + llms-full.txt
npm run check      # must pass: stale files, sitemap ↔ llms coverage, canonicals, robots, determinism
```

On a new clone, enable the pre-commit hook once: `npm run hooks` (sets `core.hooksPath` to `tools/hooks`). It rebuilds from the staged snapshot and blocks the commit if checks fail or regenerated files aren't staged; docs-only commits (`*.md`, `docs/`) skip it.

Never add a `build` script to package.json: Vercel would run it on deploy, and `scripts/` and `partials/` are excluded by `.vercelignore`.

## Where things go

- **New page:** root `<name>.html` (copy an existing page for the partial markers, `<main id="main">`, canonical, meta description), add its URL to `sitemap.xml`. It appears in llms.txt under "Pages" automatically.
- **New blog post:** root `blog-<slug>.html` with `BlogPosting` JSON-LD (`headline`, `description`, `datePublished`), a card in `blog.html`, and its URL in `sitemap.xml`. It appears under "Blog" and in llms-full.txt automatically.
- **New service:** its page, plus an entry with `url` in `hasOfferCatalog` in `partials/schema-org.html`, plus the footer Services list. Starting price comes from the page's `.pkg-price-amount` cards or its Service JSON-LD `offers`.
- **Business facts** (description, hours, area served, languages, email, social/GBP profiles, founding year): `partials/schema-org.html`, and keep the visible footer in `partials/footer.html` consistent. Only state facts the site actually shows; don't invent prices, phone numbers or URLs.

## Facts as of 2026-11-15

- Contact is by email (and the site contact form, which emails); no phone number. Office hours Mon–Fri 8:00 AM–6:00 PM Pacific.
- Insurance Claims (ClinicFlow) is US-only, from $10 per claim. All other services: US & Canada.
- No LinkedIn profile. Profiles: Google Business Profile, Facebook, Instagram.
