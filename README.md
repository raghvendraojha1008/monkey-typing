# typeflow

A fast, minimal typing speed test, in the spirit of Monkeytype. Pure HTML/CSS/JS — no build step, no framework, no dependencies.

## Features

- **time**, **words**, and **quote** modes
- Adjustable time (15/30/60/120s) and word count (10/25/50/100)
- Optional punctuation and numbers
- Live WPM/timer while typing
- Results screen: WPM, accuracy, raw WPM, character breakdown, consistency, and a WPM-over-time chart
- `tab` + `enter` to restart instantly, like the original
- Light/dark theme toggle (persisted)
- Fully responsive, keyboard-first

## Run locally

No build tools required. Any static server works:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed URL in your browser.

## Deploy to Vercel

**Option A — Vercel CLI**
```bash
npm i -g vercel
vercel
```
Accept the defaults — Vercel will detect this as a static project (no framework, no build command needed).

**Option B — Git + Vercel dashboard**
1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. Go to https://vercel.com/new and import the repo.
3. Framework preset: **Other**. Build command: *(leave blank)*. Output directory: *(leave blank / `.`)*.
4. Click **Deploy**.

That's it — `index.html`, `style.css`, and `script.js` are served as-is.

## Project structure

```
.
├── index.html      # markup
├── style.css       # theme, layout, typography
├── script.js       # typing engine, stats, chart
├── vercel.json     # deployment config (clean URLs)
└── package.json    # metadata + local dev scripts
```

## Customizing

- **Word list**: edit the `WORDS` array in `script.js`.
- **Quotes**: edit the `QUOTES` array in `script.js`.
- **Colors/fonts**: edit the `:root` and `[data-theme="light"]` variables at the top of `style.css`.
