# Lessons log

One entry per finished video, newest first. Each entry records what went wrong, what fixed it and what changed in
SKILL.md, so the next video starts from a better place. SKILL.md holds the distilled rules; this file keeps the history.

---

## Video 2: The Sweetest Disaster (Great Molasses Flood, Boston 1919), 2026-11-16

- Result: 82.9 s, 1440x2560 (rendered 1080x1920, lanczos upscale), 17 shots, user's ElevenLabs voiceover,
  original score + synthesized SFX, -15 LUFS / -1.1 dBTP, no black or frozen frames.
- Project: `projects/molasses-flood/` (script, word timings, shot table, cue list, test frames).
  Source: `templates/molasses/` (story/world/cast rewritten for a waterfront town, a live fluid heightfield, interior
  insert sets and a present-day set).

### What went wrong, and the fix
1. **Voice choice was asked too late and in the wrong order.** I generated an AI voice (Kokoro), the user disliked it
   and recorded their own with ElevenLabs. Fix: ask the voice question together with script approval, and offer the
   script as one flowing paste-ready block for their TTS tool.
2. **Length estimate was off.** 227 words was 63 s at a brisk AI pace, but the user's ElevenLabs read ran 82.9 s
   (2.7 words/s). Fix: for a 60 s target with a natural TTS voice, write about 165 words; tell the user the expected
   length at both paces.
3. **Rendering in a cloud workspace with no GPU.** Software WebGL (swiftshader) ran at 3-6.5 s per frame at
   1080x1920, so native 1440x2560 was not practical. Fix: render 1080x1920 and upscale; skip lens passes when the
   shot has no blur, bloom only in golden light, MSAA 2, shadow map 2048, lens taps 40/16; concurrency 1 (faster
   than 2 on 2 CPUs). Tell the user the render time up front.
4. **Two render processes ran at once** after a restart (the old Node process survived `pkill chrome`), one with
   stale code. Fix: before every restart, kill `chunks.mjs`, `chrome-linux64` and `compositor-linux`, delete
   `bundle.txt` after any code change, and use the resumable chunk renderer.
5. **Crash at frame 1096** when a crossfade layer unmounted (`fx.ink.dispose is not a function`). Fixed with a
   guarded dispose in the composer file.
6. **The hook's opening frames were broken** (El column dead centre, runners behind the lens) and were caught only in
   the first rendered chunk, because the test stills were taken mid-shot. Fix: test the first, middle and last frame of
   every shot, and make cameras that follow a moving event a function of that event (`frontX(tau)`).
7. **The wave read as a mud bank or orange mesa.** Fixed with dark syrup plus amber vertex colour on steep faces
   only (`#3a1608` to `#7a3c16`), and a rounded nose profile `sqrt(smoothstep)` instead of a cliff edge.
8. **The vertical frame is narrow.** At 6 m with fov 42 the frame is only about 2.6 m wide; the rescuers 1.6 m
   apart fell out of frame. Fix: space characters 0.9 m or less in mid shots.
9. **The tank sat in blue shade** with the bridge default side sun (az 75). The day default is now az 118 (more
   frontal) for big curved subjects.
10. **Interiors showed sky** above the walls. Fix: rooms get a ceiling, built with cast shadows off.
11. **Characters in fluid were buried to the chin.** Fix: place them so the surface sits at waist height, checked
   against the depth function.
12. **Deformed structures (the bent El) cut across nearby shots.** Fix: stage other scenes away from the
   deformation zone.
13. **No external model or asset hosts in the cloud** (kenney.nl and HuggingFace are blocked; GitHub release assets
   work). Built all props from code; Kokoro TTS and the sherpa-onnx ASR model come from GitHub releases.

### What worked (keep)
- story.ts keyed to word indices (`W(i)`, generated `words.ts`), so a new voice recording retimes every cut automatically.
- Canvas "insert" cards for analogies and close-ups: spoon drip, honey jars, thermometer, pocket watch, blueprint
  that signs itself, thought bubble.
- Tragedy handled plainly: jokes only on the company's choices and the old saying, deaths stated with a pause, a
  quiet wide shot with no faces.
- Contact sheets (`tools/sheet.py`) of 9-18 stills per review round; three rounds took the look from rough to deliverable.
