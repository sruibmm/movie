# Cinema — Project acceptance rules

These rules record the user's product requirements for future Cinema work. They are acceptance criteria, not a claim that every current source meets them.

## User experience
- Playback remains inside Cinema: clicking Watch opens the video, not a third-party website, download page, or external navigation.
- Preserve the existing design, Arabic and foreign catalogues, artwork, search, favorites, viewing history, resume, synchronized couples mode, and Samsung TV experience.
- Keep remote navigation smooth; Back returns to the previous screen; double left/right advances or rewinds 10 seconds as appropriate.
- Prefer the existing native player; an alternative player is acceptable only if it integrates cleanly. No full external website presented as a finished player.
- No intrusive advertisements, pop-ups or external redirects. Prefer ad-free sources or supported integration configurations that provide a clean experience.
- Free to the viewer; a free account is acceptable if genuinely necessary.

## Content and sources
- Broad, modern and classic Arabic and international content; exact film, season, episode and complete runtime.
- Large catalogue expansions of at least 100 works per batch when expanding the library. Distinguish indexed works from individually verified playable works.
- Any reliable, compatible source is eligible for evaluation; no blanket preference for a particular host. Avoid generic EmbedWave-like sources for Arabic content unless the user explicitly changes that preference.
- Use legitimate, permitted delivery methods: native MP4/HLS, provider player SDKs, official embeds, or authorized streaming intermediaries. Technical feasibility alone is not proof of permission. Do not bypass source restrictions or mandatory advertising.
- Prefer 720p/1080p or better; account for widescreen cinema aspect ratios instead of using height alone.

## Engineering and execution
- Test real playback, exact content identity, runtime, quality, startup, seek, resume and platform compatibility before counting a source as playable.
- If a method fails, diagnose it and test other supported methods; distinguish confirmed failures from unknowns. Never present guesses as facts.
- Prefer automatic discovery, exact matching, source verification and safe fallback. No substitution of a different film or episode.
- Preserve catalogue and history; use incremental changes and regression tests. Verify production separately from GitHub commits or CI.
- Do the work directly where tools permit. Ask the user only for a simple essential action or confirmation (e.g. opening Desktop Commander, creating a free account, or testing a TV control).
- Do not send the user to negotiate with distributors or obtain rights as the proposed workflow. Search for sources with suitable existing permissions instead; state any genuine blocker clearly.
- Do not claim completion before the requested result actually works. Report what was tested, what is live, and what remains unverified.
