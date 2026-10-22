# Hyperframes Composition Brief: Prospect and Outreach Agent

## Objective
Short launch film with narration for the Prospect and Outreach Agent.

## Output
- Composition: `brag-output/composition/` · Render: `brag-output/brag.mp4`
- 1920x1080, 30fps, 38.43s

## Source material
- README.md, assets/arch.png (architecture), app/pipeline.py (flow: source → filter → signals → score + rank → gate → outreach → verify), tools/score_prospect.py (account fit, persona fit, intent, timing), frontend/src/index.css (palette, fonts), DashboardPage.tsx ("Run prospecting")
- Verbatim UI copy used: "Run prospecting"; score factors "account fit · persona fit · intent · timing"; "set aside"

## Creative direction
See brag-plan.md. Aesthetic minimalism, Tokyo night grade (teal shadows, magenta highlights, grain, bokeh, vignette). No vendor or stack names on screen or in audio.

## Implementation notes
- Fonts and GSAP vendored locally under `assets/` (CDN blocked in this sandbox).
- Narration: `assets/voiceover.wav` (Kokoro am_michael), pre-timed per line; scene boundaries follow it.
- Music bed at 0.14 (ducked under voice for the whole film), fades in/out.
- Audio-reactive: `assets/rms.js` (music RMS at 15 samples/s) drives bokeh glow.
- Beat locks marked in code comments (`// beat-locked`, `// beat-grid`).
