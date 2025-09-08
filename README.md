# Clubview Landing + API

## Local dev
1. Create `.env.local` at project root with:
   - `MONGODB_URI=...`
   - `ALLOWED_ORIGIN=http://localhost:3000`
2. Install deps: `npm i`
3. Run: `npx vercel dev`
   - Visit http://localhost:3000
   - API available at http://localhost:3000/api/subscribe

## Deploy to Vercel
- `npx vercel` and follow prompts.
- In Vercel Project → Settings → Environment Variables:
  - Add `MONGODB_URI`, `ALLOWED_ORIGIN`
- Redeploy.