# Sunvera Solar — landing page

A fast, dependency-free marketing site for **Sunvera**, a (fictional) premium home solar brand.

Open `index.html` in a browser, or serve the folder: `python3 -m http.server`.

- `index.html` — page markup (hero, trust bar, savings calculator, steps, plans, reviews, 4-step lead form, FAQ)
- `styles.css` — brand tokens, layout and animations (responsive, respects reduced motion)
- `script.js` — savings calculator, multi-step form, scroll reveals, counters, sticky mobile CTA
- `assets/logo.svg`, `assets/favicon.svg` — brand mark

Lead submissions are logged to the console; wire them to your CRM in `script.js` (look for `/api/leads`).
Phone number, reviews and stats are placeholders — replace them with real data before launch.
