# Sunvera Solar — website

A fast, dependency-free marketing site for Sunvera home solar, battery and EV charging.

Open `index.html` in a browser, or serve the folder: `python3 -m http.server`.
To publish free: repo **Settings → Pages → Deploy from branch → `main` / root**.

## What's inside
- `index.html` — hero, cited fact bar, savings + impact calculator, "Your impact" scaler (home / street / town), how it works, systems, FAQ, 4-step lead form, sources
- `styles.css` — brand tokens, layout, animations (responsive, respects reduced motion)
- `script.js` — calculator model, impact section, lead form, scroll effects
- `assets/` — logo, favicon, and photography (`assets/img`, from Unsplash, free to use under the Unsplash License)

## Data
Every number on the page is cited in the **Sources** section:
EIA (2024 electricity price & usage), EPA Greenhouse Gas Equivalencies (CO₂ factors), IRENA (solar cost decline),
SEIA (US installations), Zillow (home value premium), NREL (panel degradation).

Calculator assumptions you should tune for your market live at the top of the model in `script.js`:
`KWH_PER_KW`, `COST_PER_KW`, `RATE_ESCALATION`, `BATTERY_COST`.

## Before launch
- Replace the phone number `(800) 555-0199` and `hello@sunvera.com` with your real contact details.
- Confirm the warranty terms and offers (25-year warranty, $0-down options) match what you actually provide.
- Connect the lead form to your CRM/backend in `script.js` (search for `/api/leads`).
- Once you have real customers, add genuine reviews and your own install photos.
