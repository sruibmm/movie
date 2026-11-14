# Cloudflare Pages deployment

Connect the GitHub repository sruibmm/movie, select branch cloudflare-ready, build command `npm run build:cloudflare`, output directory `dist`, Node.js 22 or 24. The static build uses the verified saved catalog instead of remote publisher discovery. Optional `YOUTUBE_DATA_API_KEY` is a server-side Pages secret; no key is required for the saved catalog. Vercel remains unchanged on its existing branch. The Dailymotion embed playback issue is separate from hosting and is not resolved by migration.
