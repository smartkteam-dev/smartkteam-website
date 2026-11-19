# smartkteam.com

Static HTML site on Vercel. **There is no build step on deploy:** Vercel serves the committed files as they are, so every generated file must be regenerated and committed with the change that caused it. See README.md for page list, CSS structure and the contact form.

## Generated files: never edit these by hand

| Generated | Edit instead |
|---|---|
| `llms.txt`, `llms-full.txt` | the pages themselves, `partials/schema-org.html`, or `scripts/build-llms.js` |
| Content between `<!-- partial:NAME -->` and `<!-- /partial:NAME -->` in any root `*.html` | `partials/NAME.html` (`head`, `nav`, `footer`, `schema-org`, `contact-form`) |
| `<!-- partial:breadcrumbs -->` block | the page's `BreadcrumbList` JSON-LD |
| `<!-- partial:service-schema -->` block | the page's visible `.package-card`s and meta description (name from `hasOfferCatalog`) |
| `<!-- partial:faq-schema -->` block | the page's visible `.faq-item`s |
| `?v=…` on `/assets/` URLs | nothing: `sync-partials.js` sets it from the file hash (`/assets` is cached for a year) |
| `og-image.jpg` | `tools/og-image.html`, then `npm run og-image` |

`robots.txt`, `sitemap.xml` and `vercel.json` are hand-edited.

## After any change

```sh
npm run generate   # sync partials into pages, regenerate llms.txt + llms-full.txt
npm run check      # must pass: stale files, sitemap ↔ llms coverage, canonicals, robots, determinism,
                   # and scripts/check-seo.js (title ≤60, description ≤155, unique, one H1, alt text,
                   # share tags, broken links, no noindex page in the sitemap)
```

On a new clone, enable the pre-commit hook once: `npm run hooks` (sets `core.hooksPath` to `tools/hooks`). It rebuilds from the staged snapshot and blocks the commit if checks fail or regenerated files aren't staged; docs-only commits (`*.md`, `docs/`) skip it.

Never add a `build` script to package.json: Vercel would run it on deploy, and `scripts/` and `partials/` are excluded by `.vercelignore`.

## Where things go

- **New page:** root `<name>.html` (copy an existing page for the partial markers, `<main id="main">`, canonical, meta description, `og:`/`twitter:` tags identical to the title and description), add its URL to `sitemap.xml`. It appears in llms.txt under "Pages" automatically. Titles follow `Keyword in Seattle | Smart KTeam` (≤60); descriptions are benefit first and end with a call to action (≤155). Give it one primary keyword not used by another page (keyword map in README.md).
- **New industry page:** copy a `websites-for-*.html` page. It appears under "Industry websites" in llms.txt and needs a link in the footer "Websites For" column.
- **New blog post:** root `blog-<slug>.html` with `BlogPosting` JSON-LD (`headline`, `description`, `datePublished`), a card in `blog.html`, and its URL in `sitemap.xml`. It appears under "Blog" and in llms-full.txt automatically.
- **New service:** its page, plus an entry with `url` in `hasOfferCatalog` in `partials/schema-org.html`, plus the footer Services list. Starting price comes from the page's `.pkg-price-amount` cards or its Service JSON-LD `offers`.
- **Business facts** (description, hours, area served, languages, email, social/GBP profiles, founding year): `partials/schema-org.html`, and keep the visible footer in `partials/footer.html` consistent. Only state facts the site actually shows; don't invent prices, phone numbers or URLs.

## Facts as of 2026-11-17

- Contact is by email (and the site contact form, which emails); no phone number yet (when one is added, use `tel:` links; analytics.js already tracks them). Office hours Mon–Sat 9:00 AM–5:00 PM Pacific, matching the Google Business Profile.
- Service-area business with no storefront (GBP address hidden). Never imply an office or a location in another city.
- Insurance Claims (ClinicFlow) is US-only, from $10 per claim. All other services: US & Canada.
- No LinkedIn profile. Profiles: Google Business Profile (name "Smart KTeam"), Facebook, Instagram.
- Analytics: Google tag `GTM-MTQT6VM2` → GA4 `G-T8LVV5ZH9J`. Search Console: Domain property, verified by DNS TXT at Namecheap.
- The Pro website package includes Google Business Profile setup.
