---
description: Deploy changes locally and to production (Vercel via GitHub)
---
// turbo-all

After making ANY code change to the huevos-togo app, ALWAYS follow these steps IN ORDER:

## 1. Update version.js (REQUIRED before every deploy)

Read the current `src/version.js` and apply these rules:

**Rule: 1 version per calendar day.**
- Check the date of the LATEST entry in CHANGELOG (top entry).
- Get today's local date (use the ADDITIONAL_METADATA timestamp provided to you).
- If the latest changelog date is **TODAY** → keep the same version number, but ADD the new change(s) to that entry's `changes` array.
- If the latest changelog date is a **DIFFERENT DAY** → bump the decimal by 0.1 (e.g., 1.2 → 1.3), and INSERT a new CHANGELOG entry at the top with today's date and the new changes.

Format for the date in changelog:
- Use Spanish: e.g., "10 de marzo de 2026"

The `changes` array should contain short, clear Spanish descriptions of what was added/fixed/changed.

## 2. Ensure local dev server is running

If not already running, start it:
```
cd /Users/manuelagarcia/Desktop/huevos-togo && npm run dev
```

## 3. Commit and push to GitHub

Stage all files, commit, and push:
```
cd /Users/manuelagarcia/Desktop/huevos-togo && git add -A && git commit -m "[descripción emoji]" && git push origin main
```
Use a short emoji commit message describing the change (in Spanish).

## 4. Inform the user

Tell the user:
- Local: visible en http://localhost:5173
- Online (teléfono): Vercel desplegará en 1-2 minutos. Cierra y vuelve a abrir la app.
- La versión fue actualizada a vX.X (o se mantuvo la misma si el cambio es del mismo día)
