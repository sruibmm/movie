# Cinema: Akwam private catalog staging and expiring-link refresh

This is a **draft/private-only** integration; no production deployment or library replacement.

## Verified behavior (2026-11-17)
Akwam's episode-30 download page `/download/140992/76921/...` linked to a different `downet.net` MP4 URL than the one supplied earlier for the same file. An attempt to fetch the new URL encountered binary `application/octet-stream`. A full playable stream, 720p+ and Samsung remote seeking have **not** been verified. URL lifetime is unknown. Treat direct MP4 URLs as ephemeral.

## 1) Stage metadata without importing streams
```bash
node scripts/akwam-bulk-stage.mjs --self-test
node scripts/akwam-bulk-stage.mjs --pages 2 --with-episodes --ack-provider-permission
node scripts/akwam-bulk-stage.mjs --pages 20 --with-episodes --with-download-pages --ack-provider-permission
```
The second run resumes completed pages and episodes in `docs/akwam-staging.json`. Series, films, episodes, provider IDs and stable download pages are stored. Quality and playback status remain unverified. Page limit and 1.5s default throttle protect the provider. This importer does not download videos, refresh signed URLs, merge into the live catalog or deploy.

The user's report of site-operator permission should be checked against the scope of any copyright holder or distributor rights before enabling playback in a public website.

## 2) Configure explicitly authorized assets on the worker
Set `AKWAM_APPROVED_ASSETS_JSON` as an operator-managed secret/binding; do not commit it into the repository. Only include assets within the granted permission. Sample structure (EXAMPLE ONLY — not a rights statement):

```json
{
  "version": 1,
  "assets": [{
    "id": "jaafar-e30-1080",
    "quality": "1080p",
    "downloadPage": "https://akwam.ss/download/140992/76921/%D8%AC%D8%B9%D9%81%D8%B1-%D8%A7%D9%84%D8%B9%D9%85%D8%AF%D8%A9/%D8%A7%D9%84%D8%AD%D9%84%D9%82%D8%A9-30",
    "rights": {
      "reference": "REPLACE-WITH-GRANT-REFERENCE",
      "webPlayback": false,
      "territories": ["KW"],
      "expires": "REPLACE-WITH-ACTUAL-EXPIRY-DATE"
    }
  }]
}
```
Only set `webPlayback:true` after its scope is confirmed. Set `CINEMA_TERRITORY=KW` where applicable. For personal-only rights, keep the refresh route private; do not publish these assets to anonymous users.

## 3) Owner-only refresh request
Send `GET /api/private-catalog/akwam-refresh?id=jaafar-e30-1080` with the **existing** Cinema owner authorization. This returns a JSON direct MP4 URL parsed from the configured stable download page, and a `playbackVerified:false` flag. Cache TTL is 20s per isolate; returning the URL does not claim it is playable or permanent. Retry once upon native player failure, with a cooldown; never loop on failures or bypass a blocked origin.

No arbitrary input URL, unrestricted proxy, CORS bypass, DRM evasion, background mass download, or anonymous endpoint. Host matching is limited to `akwam.ss` for source pages and subdomains of `downet.net` for MP4s. Any different officially approved media CDN requires a deliberate adapter change.

## Validation still pending
- Run `npm run test:akwam` and full `npm run build:cloudflare` in a supported CI/terminal.
- Stage 2 pages and inspect title identity, duplicates, season numbering and download-page links.
- Confirm `GET` binary MIME/partial ranges, time seeking, URL expiry, TV codecs and any CORS restrictions with a permitted test asset.
- Verify authorized reuse rights, including public versus personal playback.
- Obtain independent review and explicit approval before merging/deploying.
