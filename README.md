# Smart KTeam — Site Structure & Deployment Guide

## Pages

| File | URL | Notes |
|---|---|---|
| `index.html` | smartkteam.com/ | Homepage; 5 service cards + portfolio bento grid |
| `website-design.html` | /website-design | Service page |
| `seo.html` | /seo | Service page |
| `booking-payment.html` | /booking-payment | Service page |
| `google-ads.html` | /google-ads | Service page |
| `insurance-claims.html` | /insurance-claims | Service page — promotes ClinicFlow |
| `websites-for-*.html` | /websites-for-… | 6 industry pages (website design for massage therapists & spas, beauty salons, pet groomers, restaurants & cafes, auto repair shops, wedding planners); each links to its demo under `portfolio/` |
| `free-consultation.html` | /free-consultation | Ad landing page: no menu, one form, `noindex`, not in the sitemap. Use it as the final URL of Google Ads campaigns |
| `privacy.html` | /privacy | Privacy policy (contact form, Google Analytics, hosting, Google Maps embed) |
| `404.html` | (any missing URL) | Branded not-found page, `noindex` |
| `blog.html` | /blog | Blog index |
| `blog-*.html` | /blog-… | 4 blog posts (website-not-getting-calls, small-business-marketing, google-maps-ranking, online-booking-system) |
| `portfolio/<name>/index.html` | /portfolio/<name> | 7 independent demo sites (own CSS, not part of the shared assets) |
| `qa.html` | /qa | Q&A page |
| `vercel.json` | — | Clean URLs (no .html), legacy Wix redirects, one-year cache for `/images`, `/fonts` and `/assets`, `text/plain` for the llms files |
| `sitemap.xml` | /sitemap.xml | 19 indexable pages (hand-edited; update `lastmod` when a page changes; never list a `noindex` page) |
| `og-image.jpg` | /og-image.jpg | 1200x1200 share image used by every page. Source: `tools/og-image.html`; rebuild with `npm run og-image` |
| `robots.txt` | /robots.txt | Allows all crawlers plus an explicit AI-crawler group, blocks `/api/`, points to the sitemap and llms.txt (hand-edited) |
| `llms.txt` | /llms.txt | **Generated.** AI-agent summary: key facts, services with starting prices, pages, blog posts |
| `llms-full.txt` | /llms-full.txt | **Generated.** Full text of every indexable page and blog post in Markdown |
| `api/contact.js` | /api/contact | Contact form handler (Resend) |

## Shared assets and partials

| Path | What it is |
|---|---|
| `assets/base.css` | CSS common to all main pages, including the `@font-face` rules for the self-hosted fonts and the breadcrumb style |
| `assets/site.css` | CSS common to the 8 large pages (index, blog, qa, service pages) |
| `assets/site.js` | Script shared by the 7 service pages |
| `assets/nav-active.js` | Marks the current page in the nav (all pages) |
| `assets/analytics.js` | Google Analytics conversion events (see Analytics below) |
| `assets/contact-form.js` | Consultation form submit + `generate_lead` event (home page and /free-consultation) |
| `fonts/` | Self-hosted Montserrat and Cormorant Garamond (latin, variable weight, `font-display: swap`), preloaded in the head partial |
| `images/` | All site photos, self-hosted WebP (cached for one year, so rename a file if you replace it). Page heroes are `<img>` with an 800px version in `srcset`; file names describe the photo with relevant keywords (e.g. `beauty-salon-interior-w1200.webp`, `local-seo-strategy-analytics-w800.webp`); keep that pattern for new images |
| `partials/nav.html`, `partials/footer.html` | Single source for the nav (all pages except the homepage) and the footer (all pages, including email and office hours) |
| `partials/head.html` | Google tag (Analytics), font preloads, icons and manifest, on every page |
| `partials/schema-org.html` | Single source for the ProfessionalService JSON-LD (description, hours, area served, service catalog, `sameAs` profiles) |
| `partials/contact-form.html` | The consultation form markup (home page and /free-consultation) |
| `favicon.ico`, `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `manifest.webmanifest` | Site icons and web manifest |
| `scripts/sync-partials.js` | Copies the partials into every page, and generates: the visible breadcrumbs (from each page's `BreadcrumbList`), the Service JSON-LD on service and industry pages (from the visible package cards), the FAQPage JSON-LD (from the visible FAQ), and the `?v=hash` version on every `/assets/` URL |
| `scripts/check-seo.js` | On-page checks: title ≤ 60 and description ≤ 155 characters and unique, one H1, alt on every image, canonical, share tags match the title/description, share image size, valid JSON-LD, no broken internal links, no `noindex` page in the sitemap |
| `scripts/og-image.sh` | Renders `tools/og-image.html` to `og-image.jpg` with headless Chrome (macOS) |
| `scripts/build-llms.js` | Generates `llms.txt` and `llms-full.txt` from the pages and `partials/schema-org.html`; `--check` verifies them |
| `tools/hooks/pre-commit` | Rebuilds and checks the staged files before every commit (enable with `npm run hooks`) |

Each page keeps only its own CSS inline in `<style>`. Rules that could conflict with a page-specific rule were deliberately left inline so the cascade is unchanged: do not move rules into the shared files without checking the page still renders the same.

**Editing the nav, footer, head, form or business schema:** edit the file in `partials/`, then run `npm run generate`. Generated blocks also cover `<!-- partial:breadcrumbs -->`, `<!-- partial:service-schema -->` and `<!-- partial:faq-schema -->`: change the page content they are built from (BreadcrumbList, package cards, FAQ items), not the generated block. The content between `<!-- partial:… -->` markers in the HTML is overwritten by the script, so never edit it in the page itself. `partials/`, `scripts/` and `tools/` are excluded from deploy by `.vercelignore`.

## Commands

Vercel deploys the committed files as they are (no build step), so generated files must be committed up to date.

| Command | What it does |
|---|---|
| `npm run generate` | Syncs partials into every page, then regenerates `llms.txt` and `llms-full.txt`. Run after **any** content change |
| `npm run check` | Fails if a page or llms file is stale, a sitemap URL is missing from llms.txt/llms-full.txt, an indexable page is missing from the sitemap, a canonical is wrong, the robots.txt essentials are missing, two builds differ, or any on-page SEO rule in `scripts/check-seo.js` is broken |
| `npm run og-image` | Re-renders the share image after editing `tools/og-image.html` |
| `npm run hooks` | Enables the pre-commit hook in this clone (`git config core.hooksPath tools/hooks`); run once after cloning |

The pre-commit hook rebuilds from the **staged** snapshot, runs the checks and blocks the commit if a check fails or a generated file isn't staged. Commits that only touch `*.md` / `docs/` skip it. Don't add a `build` script to `package.json`: Vercel would run it on deploy, and `scripts/` isn't deployed.

## AI agents (llms.txt)

`llms.txt` and `llms-full.txt` are generated by `scripts/build-llms.js`; never edit them by hand. Their sources:

- **Key facts** (description, location, founding year, area served, office hours, languages, email, profiles): `partials/schema-org.html`. Only put facts there that the site itself states.
- **Services** (order, names): the `hasOfferCatalog` in `partials/schema-org.html`; each entry needs the page `url`. Description = the page's meta description. Starting price = the cheapest `.pkg-price-amount` on the page, or the `offers.priceSpecification` in the page's Service JSON-LD (as on `/insurance-claims`).
- **Blog**: any page with `BlogPosting` JSON-LD, newest first; the line uses the post's `description` and `datePublished`.
- **Industry websites**: every `websites-for-*.html` page, with its starting price.
- **Pages**: every other indexable root page (home, blog index, Q&A, privacy, anything new).
- **Full text**: each page's `<main>`, converted to Markdown. Images, numbering, eyebrow labels, badges, breadcrumbs and form fields are dropped; links become absolute. To hide a new decorative element, add its class to `SKIP_CLASSES` in the script.

`vercel.json` serves both files as `text/plain; charset=utf-8`.

### Adding a page or blog post

1. Create `<name>.html` at the root (copy an existing page so it has the partial markers, `<main id="main">`, a canonical URL, a meta description and, for posts, `BlogPosting` JSON-LD with `datePublished` and `description`). Add the card to `blog.html` for a post.
2. Add the URL to `sitemap.xml`.
3. For a new service, also add it to `hasOfferCatalog` in `partials/schema-org.html` and to the footer Services list.
4. `npm run generate && npm run check`, then commit the page together with the regenerated files.

## Analytics (Google Analytics 4)

The Google tag `GTM-MTQT6VM2` (GA4 property `G-T8LVV5ZH9J`) is in `partials/head.html`, so it is on every page. It loads 2.5 s after the page's `load` event, or at the visitor's first scroll, tap or key press if sooner, so its ~180 KB doesn't count against the first screen (LCP) on phones; `gtag()` calls made earlier are queued in `dataLayer` and sent when it loads. Keep it that way: PageSpeed's simulated LCP counts every download that starts before the hero photo paints, and loading the tag in `<head>` (or right at `load`) added 1.5–2 s to mobile LCP. Visitors who leave within ~2.5 s without touching the page aren't counted. Events sent:

| Event | When |
|---|---|
| `generate_lead` | The consultation form was sent successfully (`assets/contact-form.js`) |
| `consultation_click` | A link to `/#contact` or `/free-consultation` was clicked |
| `email_click` | A `mailto:` link was clicked |
| `phone_click`, `sms_click`, `whatsapp_click` | Ready for when a phone number is published (`tel:`, `sms:`, `wa.me` links) |

`generate_lead` is a key event in GA4 (created ahead of time under Admin → Data display → Key events, "Create with code"); `consultation_click` and `email_click` can be added the same way.

**Performance note:** on the home page, the photos used as CSS backgrounds (`.why-visual`, `.testimonial`, `.process-img`, `.cta-section`) only load once their section is within ~800px of the screen: the image lives in a `.bg-in` rule in `assets/site.css`, and a small observer in `index.html` adds that class. A new below-the-fold CSS background photo should follow the same pattern, so it doesn't compete with the hero image. Slideshow slides 2–5 use `data-src`/`data-srcset` and are loaded by the slideshow script 2.5 s after `load` (or just before one is shown), because the slideshow sits right under the hero. Search Console is verified as a Domain property (DNS TXT record at Namecheap).

## Keyword map

One primary search phrase per page; no two pages target the same phrase.

| Page | Primary keyword | Intent |
|---|---|---|
| / | small business digital marketing seattle | Commercial |
| /website-design | small business website design seattle | Commercial |
| /seo | local seo services seattle | Commercial |
| /google-ads | google ads management seattle | Commercial |
| /booking-payment | online booking system for small business | Commercial |
| /insurance-claims | massage therapist insurance billing | Commercial (US) |
| /websites-for-massage-therapists | massage therapist website design | Commercial |
| /websites-for-beauty-salons | beauty salon website design | Commercial |
| /websites-for-pet-groomers | pet grooming website design | Commercial |
| /websites-for-restaurants | restaurant website design | Commercial |
| /websites-for-auto-repair-shops | auto repair shop website design | Commercial |
| /websites-for-wedding-planners | wedding planner website design | Commercial |
| /qa | small business seo questions | Informational |
| /blog | small business marketing tips | Informational |
| /blog-google-maps-ranking | how to rank higher on google maps | Informational |
| /blog-online-booking-system | online booking system benefits | Informational |
| /blog-small-business-marketing | small business marketing plan | Informational |
| /blog-website-not-getting-calls | website not getting calls | Informational |
| /free-consultation | (paid traffic only, `noindex`) | Transactional |

## Contact form

`/api/contact` sends the message through Resend. Required environment variables in Vercel:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — a sender on the verified `smartkteam.com` domain, e.g. `Smart KTeam <contact@smartkteam.com>` (falls back to the Resend sandbox sender if unset)

The handler validates input, has a hidden honeypot field (`website`) and a best-effort per-IP rate limit (5 per 10 minutes). Add a Vercel Firewall rate-limit rule for a hard cap.

## Service card numbering

Visible service cards are numbered 01–05:

| # | Service |
|---|---------|
| 01 | Website Design |
| 02 | SEO |
| 03 | Booking & Payment Systems |
| 04 | Google Ads |
| 05 | Insurance Claims for Massage Therapists *(Special)* |

## Hero CSS pattern (service pages)

Bounded absolute positioning prevents the nav logo from overlapping the hero eyebrow text:

```css
.page-hero { height:60vh; min-height:520px; position:relative; overflow:hidden; }
.page-hero-content { position:absolute; top:110px; bottom:72px; left:64px; right:64px; z-index:2;
                     display:flex; flex-direction:column; justify-content:flex-end; }

@media (max-width:1024px) { .page-hero-content { top:90px; bottom:56px; left:36px; right:36px; } }
@media (max-width:768px)  { .page-hero { min-height:380px; }
                             .page-hero-content { top:70px; bottom:40px; left:20px; right:20px; } }
```

Note: `.section-pad` must be overridden explicitly in the 768px block — class specificity beats the generic `section` element rule.

## Deployment

Hosted on Vercel, auto-deploys on push to `main`.

1. Push changes to GitHub → Vercel deploys automatically
2. Verify at https://smartkteam.com

## SEO checklist

- [x] Multi-page architecture (each page ranks independently)
- [x] Per-page meta titles, descriptions, OG tags
- [x] Schema.org LocalBusiness structured data (single source in `partials/schema-org.html`; `sameAs` lists Google Business Profile, Facebook, Instagram)
- [x] llms.txt and llms-full.txt for AI assistants; robots.txt explicitly allows the main AI crawlers
- [x] Sitemap submitted to Google Search Console
- [x] Google Analytics 4 with conversion events; Search Console verified (Domain property)
- [x] Titles ≤ 60 / descriptions ≤ 155, keyword + Seattle, ending with a call to action; checked on every commit
- [x] Square 1200x1200 share image
- [x] Visible breadcrumbs generated from `BreadcrumbList`; Service JSON-LD on every service and industry page
- [x] Industry sub-pages, ad landing page (`/free-consultation`), privacy page, location section with Google Maps embed
- [x] Self-hosted fonts, responsive hero images, one-year caching for versioned assets
- [x] Unique titles/descriptions, Open Graph/Twitter tags, breadcrumb, Service and FAQ structured data
- [x] Real favicon, apple-touch-icon, manifest
- [x] Legacy Wix URLs redirected (301) in `vercel.json`; the removed Google Business Profile page redirects to `/seo`
- [ ] City-specific landing pages: not planned. The business has no storefront, so city pages would imply locations it doesn't have
- [ ] Real blog posts for ongoing SEO content

## Accessibility and motion

- Every page has a skip link and a `<main id="main">` landmark; keyboard focus shows an orange outline.
- `prefers-reduced-motion` is respected (ticker, hero particles, slideshow autoplay and scroll reveals are disabled).
- The custom cursor (dot and ring) is desktop-only and hides over form fields.
- Portfolio demos under `portfolio/` are `noindex`.
