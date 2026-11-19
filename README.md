# Tintin · My Table Tennis Journal (tintinopedia.com)

Next.js + Tailwind + Recharts, Firebase Auth (Google) + Firestore, hosted on Vercel. Dark theme.

Pages
- `/` Home (public): hero, My Videos carousel, weekly/monthly/quarterly/half-yearly/yearly trends for sessions, drills and heart rate (spikes flagged), season map, scoreboard, physical battery.
- `/train` Training (login): the next unfinished session with steps, exhibits and videos; scores and optional heart rate; sessions unlock in order.
- `/mantra` Mantra (login, private): editable mantra lines from the Mantra Builder, voice recordings saved with date and time.
- `/studio` Studio (login): plan sessions after Day 164 from the drill library, add or edit codes (steps, YouTube links, heart-rate default, scoring), manage My Videos.

Only `ahaan@tintinopedia.com` can sign in and write. Rules are in `firestore.rules`.

## After updating the code
Firebase console > Firestore Database > Rules: paste the new `firestore.rules` and click Publish.
No Storage bucket or paid plan is needed (voice recordings are stored in Firestore, up to about 2 minutes each).

## Local preview
`npm install && NEXT_PUBLIC_DEMO=1 npm run dev` runs with sample data stored in the browser.
