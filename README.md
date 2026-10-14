# Sunvera Solar — website

Static multi-page marketing site for Sunvera home solar, batteries and EV charging.
Live at **https://solar.codebunny.net** (GitHub Pages, custom domain via `CNAME`).

## Pages
| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Hero, cited facts, solutions, calculator, impact, process, FAQ teaser |
| Solutions | `solutions.html` | Solar, batteries, EV charging, comparison table |
| Savings & financing | `savings.html` | Full calculator, how savings work, cash / loan / lease |
| Impact | `impact.html` | CO₂ calculator (home → street → town), data, **sources & method** |
| How it works | `how-it-works.html` | 5-step timeline: what we do / what you do |
| About | `about.html` | Mission, promises, contact |
| FAQ | `faq.html` | Searchable, grouped questions |
| Get a quote | `quote.html` | 4-step lead form (the conversion page) |
| 404 | `404.html` | Not-found page |

The visitor's calculator estimate carries across pages and pre-fills the quote form. ZIP boxes and "Get a quote" buttons link to `quote.html?zip=…` / `?plan=…`.

## Editing
The HTML in the repo root is **generated** — edit the sources, then rebuild:

```
src/partials/   head, header (nav), footer, calculator, impact-scaler, facts, cta, zip-form
src/pages/      one file per page (JSON metadata on the first line: title, description, nav, image)
python3 build.py   # writes *.html, sitemap.xml, robots.txt
```

Styles are in `styles.css`, behaviour in `script.js`. Preview locally with `python3 -m http.server`.

## Data
Every statistic is cited on `impact.html#sources`: EIA (2024 price & usage), EPA Greenhouse Gas Equivalencies
(CO₂ factors), IRENA (solar cost decline), SEIA (US installations), Zillow (home value), NREL (degradation).
Tune market assumptions at the top of the model in `script.js`: `KWH_PER_KW`, `COST_PER_KW`, `RATE_ESCALATION`, `BATTERY_COST`.

Photography from Unsplash (free to use under the Unsplash License), stored in `assets/img`.

## Before launch
- Replace `(800) 555-0199` and `hello@sunvera.com` with real contact details (search `src/`).
- Confirm warranty terms, offers ($0-down, financing types) and the About-page copy match your business.
- Connect the lead form to your CRM/backend in `script.js` (search `/api/leads`).
- Add genuine customer reviews and your own install photos when you have them.
