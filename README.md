# Ahaan's Table Tennis Journal (tintinopedia.com)

Next.js + Tailwind + Recharts front end, Firebase Auth (Google) + Firestore back end, hosted on Vercel.

- `/` public analytics dashboard
- `/train` login-only entry page (only `ahaan@tintinopedia.com` can sign in and write)

## Data sources
- `src/data/plan.json` is generated from `Ahaan-Table-Tennis-Training-Plan-Dec2026-May2027.xlsx` and `02_Drill-Cards-v1.1.pdf`.
- Tracker codes, targets and levels mirror `Progress-Tracker-v1.0.xlsx` (`src/lib/plan.ts`).
- Exhibit images come from the Visual Exhibits Handbook (`public/exhibits`).
- YouTube links: paste them into `src/data/videos.ts`.

## Local preview
`npm install && npm run dev`. The Firebase config is built in. Set `NEXT_PUBLIC_DEMO=1` to run in preview mode with sample data in the browser instead.

## Go live
1. Firebase console > project `tintinopedia`:
   - Build > Authentication > Get started > Sign-in method > Google > Enable.
   - Authentication > Settings > Authorized domains > add `tintinopedia.com` and `www.tintinopedia.com`.
   - Build > Firestore Database > Create database (production mode, region asia-south1).
   - Firestore > Rules > paste `firestore.rules` > Publish.
   - Project settings > Your apps > Add app (Web) > copy `apiKey` and `appId`.
2. Vercel > Add New Project > import `tintinopedia/tabletennis` > Deploy (no environment variables needed; the Firebase config is built in).
3. Vercel project > Settings > Domains > add `tintinopedia.com` (and `www`). Add the DNS records Vercel shows in Squarespace > Domains > DNS. Keep the Google Workspace MX/TXT records.
