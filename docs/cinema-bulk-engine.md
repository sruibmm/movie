# Cinema Bulk Engine
Run from the repository root:
- npm run bulk:refresh: discover public publisher references, resolve canonical titles, validate complete season numbering and publisher identity, merge eligible preview rows atomically.
- npm run bulk:publish: refresh, run all Cloudflare regression tests, build and deploy.
- node scripts/arabic-bulk-engine.mjs --discover --workers 8 --discovery-limit 200 --limit 1000
- Use --dry-run to avoid changing the production catalogue; use --input path.json for curated publisher candidates.

Cache is local (.cinema-bulk-cache.json); metadata TTL is 7 days for YouTube and Dailymotion and 30 for TMDB. Retries are bounded. Existing video IDs and canonical film/season keys are preserved. Provider failures and ambiguous works remain held. Discovery pages only supply references; playback is through the original publisher embed. New rows remain optional previews because metadata cannot prove ad-free/HD/TV playback. A strict clean promotion requires independent playback and rights evidence; no ad blocking or access circumvention.

Input array: movie {kind:"movie",id,titles:[canonical title],raw,publisher,source,duration(seconds)}; tv {kind:"tv",id,titles:[canonical title],raw,publisher,source,season,episodes:[{number,id}]}. Dailymotion metadata checks use its supported advertising_instream_blocked field and HD format availability; ads remain possible. Publishers must be allowlisted and verified via original embed metadata; external seasons require each episode to match.

The build regenerates inventory, quality gate and validates all preview references before deployment. Reports are not playback certificates.
