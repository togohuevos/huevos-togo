---
description: Deploy changes locally and to production (Vercel via GitHub)
---
// turbo-all

After making ANY code change to the huevos-togo app, ALWAYS do the following steps:

1. Ensure the local dev server is running so changes are visible at http://localhost:5173.
   If not running, start it:
   ```
   cd /Users/manuelagarcia/Desktop/huevos-togo && npm run dev
   ```

2. Stage, commit, and push all changed files to GitHub so Vercel auto-deploys to production:
   ```
   cd /Users/manuelagarcia/Desktop/huevos-togo && git add -A && git commit -m "[description of change]" && git push origin main
   ```
   Replace `[description of change]` with a short description of what was changed.

3. Inform the user that:
   - Local: visible at http://localhost:5173
   - Online (teléfono): Vercel will deploy in 1-2 minutes. They should close and reopen the app.
