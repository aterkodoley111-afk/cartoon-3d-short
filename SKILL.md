---
name: "cartoon-3d-short"
description: "Make a ~55-70 s vertical cartoon story short: flat 2D ink-outlined characters in a painted 3D world, rendered with three.js in Remotion, with narration, synthesized SFX and music."
---

# Cartoon 3D story short (three.js + Remotion)

> **Supporting files:** `templates/` (bridge + molasses sources, audio, scripts), `tools/` (voice timing, stills sheets, assembly), `references/` (style reports) and `LESSONS.md` live in the skill's repo: `git clone --depth 1 https://github.com/aterkodoley111-afk/cartoon-3d-short.git` into its own empty folder and treat paths below as relative to that clone. (Original upstream: https://github.com/mromidev/claude-animated-shorts.)

Proven example: **The Bridge That Fell for a Song**. It is an original 67 s short about the 1831 Broughton bridge and 74 soldiers marching in step.
- Code: `src/videos/bridge/` of your Remotion project (composition `BridgeShort`, 1080x1920, 30 fps).
- Script, voice and sound: `~/bridge-short/`.
- Style research: `references/`.

Proven example 2: **The Sweetest Disaster** (Great Molasses Flood, Boston 1919), 82.9 s, made in a cloud workspace
with no GPU. Source `templates/molasses/` (waterfront town, live fluid heightfield, interior insert sets, present-day
set), sound `templates/molasses/audio/sound.py`, project files `projects/molasses-flood/`. Proven example 3: **The River That Caught Fire** (Cuyahoga, Cleveland 1969), 67.6 s: source `templates/river/`
(industrial river, wooden trestle + train, fireboat sprays, flame/smoke-card fire, three insert rooms, today set),
sound `templates/river/audio/sound.py`, project files `projects/river-fire/`. Start new shorts from whichever example
is closer: bridge (crowds marching, structure physics), molasses (flood/fluid, inserts, era change) or river (fire,
vehicles, industrial set, many small insert gags). Proven example 5: **The 250-Metre Monster Hiding Under London** (Whitechapel fatberg 2017), 61 s: source
`templates/fatberg/` (London terraces, a sewer + CUTAWAY diagram set, buses/tankers from boxes, five insert rooms),
project files `projects/whitechapel-fatberg/`. Start "something hidden underground / inside" shorts from it.
Proven example 4: **The Mountain That Suddenly Disappeared** (Hope
Slide, BC 1965), 66 s: source `templates/hope/` (landscape as height functions in `terrain.ts`, a travelling landslide,
conifer bands, vehicles with window holes), project files `projects/hope-slide/`. Start landscape/disaster shorts
from it.

The style reference is a channel studied privately (`references/`: STYLE_BIBLE.md, reports/*.md, frames/).
- Those videos are private study material. Never upload, publish or send them.
- Never copy their scripts, characters or shots. Story, characters and voice are always OUR OWN.
- Never say the channel's name in a voice-over or description.

User rules that apply:
- No captions or labels in the video.
- English only.
- Voice: one steady tone.
- Jokes are researched real facts.
- Standard mix: music +3 dB, SFX -6 dB, voice unchanged.
- Final export 2K vertical: 1440x2560, `--scale 1.3333`.
- Opus max verifies every check.
- Save after every step.
- "Just do it" once the script is approved.
- Ask who voices it TOGETHER with script approval (own recording / ElevenLabs etc. / offline AI voice) and give the
  script as one flowing paste-ready block for a TTS tool. Don't generate an AI voice first.

## Get better after every video (mandatory last step)
After delivering each video, before ending the turn:
1. Write a new entry at the top of `LESSONS.md`: result specs, what went wrong + the fix, what worked. Concrete numbers
   and file names, no adjectives.
2. Distil any rule that would have saved time into this SKILL.md (Pipeline, Gotchas, Readability traps or the cloud
   recipe). Change existing rules when a lesson contradicts them; keep the file one coherent set of instructions.
3. Copy reusable new code into the repo (`templates/<name>/`, `tools/`, `templates/scripts/`) and the project's
   SCRIPT.md, words.json, shots.json, cues.md and a contact sheet into `projects/<name>/`. Never commit renders, voice
   audio or anything over ~20 MB, and never commit `references/frames` or `references/sheets` (private study material).
4. Commit and push to the skill repo (message: `Lessons from <title>`), then propose the SKILL.md changes to the user
   with propose_skills (kind "improvement") so their saved skill matches the repo.

## Pipeline
1. **Topic and facts.** Pick one surprising true story with a physical cause and effect (it should be visual), plus a simple everyday analogy that explains it.
   - Write the facts with their source at the top of `SCRIPT.md`.
2. **Script** (~3.7 words/s, 55-70 s). Beat formula from the bridge short:
   - **Hook:** the absurd fact in one line ("Seventy-four soldiers knocked down an iron bridge just by walking across it.").
   - **Setting:** year, place, pride.
   - **Action:** escalation over three or four beats, each a little bigger.
   - **Snap:** the moment it breaks.
   - **Deadpan double line:** "Luckily ... / Unluckily ...".
   - **Explanation:** one physics idea through an everyday analogy (the kid on a swing).
   - **Consequence:** the rule it created.
   - **Callback twist:** the ending.
   - Never describe on screen what the viewer already sees.
3. **Voice.** Record or generate `voice.wav`, then make its word timings `words.json` (any speech-to-text with word times).
   - Put them in the project folder, e.g. `~/bridge-short/voice/`.
   - Hand-fix the word timings. Everything is timed to words.json.
4. **Shot plan** in `story.ts`: copy `templates/bridge/` (the final bridge source, same as `src/videos/bridge/` of your Remotion project) to `src/videos/<name>/`, register a new composition next to `BridgeShort` in `src/Root.tsx`, and rename it.
   - `SHOTS`: id, a/b frames, light day/golden, crowd mode, `tau` story time.
   - `XFADE`: crossfades at place/time changes.
   - `FLASH_AT`: a white flash after the hook.
   - `CAMS`: per-shot keys `{f, dur?, cut?, s: f => {pos, look, fov, roll}}`.
   - `KICKS`: impact flip-shakes.
   - `DOF`/`dofAt`: lens blur per beat.
   - `FOREGROUND`: near framing props.
   - Every visual reaction lands 0-3 frames before its word.
5. **World.**
   - `lights.ts`: LIGHTS plus the LOOK sky/river/cloud palette per light.
   - `shade.ts`: two-tone shading and `untone()`.
   - `build.ts`: town, houses and Kenney CC0 kit props, recoloured, with sight-line culling of anything blocking a camera.
   - `paint.ts`: HD Canvas2D painted textures with seams painted in as dark tints.
   - `world.ts`: sky shader, fog = horizon colour, river, per-frame posing, sun frozen per shot and camera-relative.
6. **Characters.**
   - `toon.ts`: the Canvas2D `Pen` drawing API, 600x1000 design canvas, soles at y = 975, bean heads, stick limbs, plum variable-width outline, face library.
   - `cast.ts`: camera-facing billboards, crowds, effect cards, blinks, walk cycles. All billboards go on the `NOINK` layer.
   - `cardshade.ts`: cards lit by the scene light, no emissive.
7. **Post** (`Bridge.tsx` + `ink.ts` + `lensblur.ts` + `grade.ts`).
   - Composer order: ink → lens pre → lens main → bloom → NEUTRAL tone map → grade (MSAA 4).
   - Every pixel parameter scales with output height / 1920.
8. **Sound** (`~/bridge-short/audio/`: timeline.py, sfx_gen.py, sfx.py, music.py, instruments.py, dsp.py, mix.py).
   - Event table → synthesized SFX plus an original score ducked under the voice.
   - SFX must never be annoying: pass the SFX bed through `sfx_ceiling()` (templates/fatberg/audio/sound.py), which
     keeps it >= 9 dB under the voice in every 400 ms window and <= -26 dBFS in gaps. Low-pass every hiss
     (jet, tap, steam) at 3.5-4 kHz; place hits/clanks at -8..-11 dB, not -2..-6 (user: "too loud, annoying").
   - Output: mix.wav (48 kHz, exact length), stems and cues.md.
   - Lock the picture's time constants before the sound is made. Any later timing change means re-running the sound.
9. **Look checks.** Run `node scripts/bridge-stills.mjs out/<name>/x_ 100,400 0.5`.
   - Set `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx` to render a sandbox copy.
   - Make side-by-sides against reference frames with `python scripts/sbs_sheet.py out.jpg --ours ... --ref ...`.
   - Send them to an Opus max verifier: 1-3 images, a ≤200-word verdict. Give it the narration per frame AND the
     facts list: it catches pictures that contradict history (river: an unsigned-by-Nixon bill, the photo inside Time
     not on the cover, a fire that was small).
   - Do this BEFORE the first full render; a verifier round after the render started cost a restart.
   - Before any stills, run `tools/check_framing.ts` (bundle with `npx esbuild tools/check.ts --bundle --platform=node`)
     after every camera edit: it projects named subject points per setup and flags terrain occlusion and low lenses.
     It replaced most still rounds on the Hope Slide.
10. **Final render.**
    - `npx remotion render src/index.ts <Comp> out/<name>/video.mp4 --codec h264 --crf 16 --scale 1.3333`
    - Mux with `-map 0:v:0 -map 1:a:0` (Remotion writes a silent audio track).
    - QA: `python scripts/short_qa.py final.mp4 out/<name>/qa shots.json` checks every frame for black, white, frozen and pop frames, plus loudness and sheets.
    - Flicker: `python tools/flicker.py final.mp4 0 shots.json` (pixels that flip bright-dark-bright beyond smooth
      motion). Users see flicker the QA script misses. Test a fix on 18 frames with `node scripts/range.mjs out.mp4 a b`
      and compare the score on the same frames of the old render BEFORE re-rendering everything.
    - Fix anything it finds, then run a deep Opus audit.
11. **Deliver.** SendUserFile the final mp4, update memory, write notes.

## Voice + timing without a studio (cloud workspace)
- Word timings for ANY recording: `python tools/align.py voice.wav lines.txt words.json` (sherpa-onnx zipformer ASR
  from GitHub releases, then the script words are aligned with difflib; numbers/hyphenated words get interpolated). The
  Molasses Flood voiceover matched 212 of 221 words. Then generate `words.ts` from words.json and key every cut to
  word indices `W(i)` so a new recording retimes the whole film.
- A slow recording (natural TTS ~2.5 words/s, long pauses): `python tools/tighten.py raw.wav tight.wav 0.25` caps
  every pause at 0.25 s and trims the lead-in, then `atempo` up to 1.10 keeps the voice natural (Hope: 79.4 -> 65.3 s).
- Scratch/offline voice: `tools/scratch_tts.py` (Kokoro onnx from GitHub releases, `bm_george`, speed 1.4 = ~3.7 w/s).
- Length: brisk AI read ~3.7 words/s; natural TTS/human read ~2.7 words/s. For 60 s with a natural voice, write ~165 words.
- HuggingFace, kenney.nl and most model hosts are blocked in the cloud; GitHub release assets work.

## Rendering in a cloud workspace without a GPU
- Chrome `/usr/bin/google-chrome`, `gl: "swiftshader"`. Expect 3 s/frame (wide, no blur) to 6.5 s/frame (lens blur)
  at a 1080x1920 buffer: ~3-4 h for 80 s. Native 1440x2560 is not practical: render 1080x1920 and upscale with
  lanczos in `tools/assemble.sh`. Tell the user the render time and resolution before starting.
- Speed settings (in templates/molasses): lens passes only when `dofAt(f).cInf > 0.05`, bloom only in golden light,
  MSAA 2, shadow map 2048, lens taps 40 + 16 near, concurrency 1.
- Render with `node scripts/chunks.mjs <budgetSeconds> 45` (2000 frames at 3-7 s/frame need ~2.5 h; interiors and
  close sewer/insert shots with lens blur run 7-10 s/frame, so 1835 frames took 3.6 h: plan the rerun): resumable 45-frame chunks in `out/<name>/chunks/`. Run it as
  a background job (2 h limit) and poll with `sleep 590`; when it stops, rerun it (it skips finished chunks).
- Before any restart: kill `chunks.mjs`, `chrome-linux64` and `compositor-linux` (a surviving old process renders
  stale code), and delete `out/<name>/bundle.txt` after any code change.
- Stills: `node scripts/stills.mjs out/st/x_ f1,f2,... 0.5` costs ~15-20 s each (page rebuild), so ~18 per 10-minute
  call. Make contact sheets with `python tools/sheet.py sheet.jpg <cols> imgs...`.
- QA without the long script: `ffmpeg -i final.mp4 -vf "scale=180:320,blackdetect=d=0.1:pix_th=0.08,freezedetect=n=0.002:d=0.4" -af ebur128=peak=true -f null -`.

## Final look values (bridge after 4 verifier rounds; all in `templates/bridge/`)
Start every new short from `templates/bridge/` (copy to `src/videos/<name>/`): the look lives in these values, the
story lives in story.ts / build.ts layout / cast.ts roles. Opus max scores at the end: colour day 7, golden 5-6,
lighting 5-6, ink 6, textures 5-6, characters 7, depth 6-7, composition 6-7 (from 5/3/4/5/4/7/4/6 at the start).
- **Light presets** (`lights.ts`, sun camera-relative and frozen per shot):
  - day: az 75 / el 48, lit [1.58,1.5,1.33], shade [.30,.29,.36], lift [.05,.06,.11] (cool tint ONLY in shade), sky
    top #3e7fd2 → horizon #b8d0ec, fog = horizon, 25→300 m, uSat 1.08, ~15 % blue haze past 60 m.
  - golden: az 6 / el 7 (backlit low sun), key toward #FFB36B ×1.5, violet-blue shade (facade ≈ #444380), sky
    #ffc47c → #8a6f8a, peach fog only past 50 m, sun disc #ffcf9e + bloom, contact blobs + real card shadows.
- **Albedos** (`paint.ts`/`build.ts`): muted brick / cream / ochre / terracotta houses with plinth, cornice, sills,
  hoods, door step, chimney + pot, heights 7 / 8.4 / 9.8 m; warm grey/beige stone (saturation −35 % from "storybook");
  ochre wood deck C* ~51-58 with near-black seams; iron dark and desaturated. Never lemon, never lavender lit faces.
- **Ink** (`ink.ts`): #030303, 5.1 px near (6 m) → 3.3 px far (90 m) at 1080x1920, creases ×0.8 from 35°, depth
  jumps from 1 %, fog tint 0.3 only far; character cards on layer `NOINK` (they carry their own plum ink).
- **Lens** (`lensblur.ts` + `dofAt` in story.ts): cInf px at 1080: hook/river CU 15-16, close-ups 12-14, MS 10-12,
  park 7, golden sway 5, wides/aerials 0. Focus on the eyes of the front row.
- **Post** (`Bridge.tsx`): ink → lens pre → lens main → bloom (thr 1.0, int .5, 6 levels, radius .6) → NEUTRAL tone
  map → grade; MSAA 4. Film grain exists but is OFF (reference measures no grain; it quadruples the file size).
- **Characters** (`toon.ts`/`cast.ts`/`cardshade.ts`): bean heads h/w .94, plum ink #241726, eyes .26 W apart, no blush,
  14 expressions; adults 3.5 head-heights; walk bob 5 %, lean 1-7°, planted 0.8 m stride; blinks 0.5-2.3 s; tight
  contact shadow ~.5 under the feet + sun-direction tail by day; golden rim inner only (never an offset outer copy).
- **Camera** (`story.ts`): cuts on big jumps, smootherstep glides 18-40 f, every hold creeps (no static hold ≥4 f),
  damped impact shakes (4-frame period over 10 f, gain <= 0.8; a per-frame sign flip strobes), 4-4.6° rolls, foreground props (`FOREGROUND`) in ~1/3 of shots.

## Look targets (measured from the reference; see references/reports/)
- **Ink:**
  - World lines: about 3 px at 1080 wide, near-black #0b0a0c, nearly constant with distance. Silhouettes, depth jumps and normal creases only. No line on wall/floor joins or the horizon. Character cards are never outlined by the world ink.
  - Character ink: dark plum #201628-#2f1d28, thicker on the bottom/shadow side.
- **Colour:**
  - Day median luma ~.57. Non-ink p5 ~.23 (no crushed blacks). Lit chroma C* p90 ~55. Day sky top ~#5e93d9, horizon 1.28x brighter.
  - Golden: peach horizon #ffd08a, violet-blue shadows (never brown), backlit sun.
- **Depth:**
  - DOF on about 1/3 of screen time (CU, MS, inserts), cInf 10-16 px at 1080, focus on the eyes. Establishing and wide shots stay sharp.
  - Fog = horizon colour, 25→420 m day, 20→360 m golden.
  - Bloom only on HDR emissives: threshold 1.0.
- **Camera:**
  - Hard cuts on big jumps. Everything else is a smootherstep glide of 18-40 f, peak ≤ 25 px/f at 720p.
  - Every hold pushes in 0.15-0.35 %/f, with 0.6 %/f on punch words.
  - Rolls of 4-5°.
  - No hand-held float. Impact shakes: damped cos with a 4-frame period over 10 f (per-frame sign
    flips read as flicker to viewers).
- **Characters:**
  - About 3.5 head-heights tall, legs 1.4 HH.
  - Stick limbs about 0.055 of head width, ink-dot hands.
  - Bean head (h/w ~0.93, narrower chin, pointier crown).
  - No blush or eye highlights. Faces at brightness ~.93.
  - Walk bob 3-7 %, lean 1-7°, planted feet.
  - Blinks every 0.5-2.3 s, lasting 4 f.

## Look-match loop (how the bridge look was reached; reuse for any "make it look like X" pass)
1. **Measure the reference first.** One analysis agent per topic (motion, depth, textures, characters, lighting, outlines, grade), each writing numbers, not adjectives, to `references/reports/<topic>.md`. Shared brief: `compare/CONTEXT.md`. Reports are the source of truth for every agent after.
2. **Sandboxes, one owner per file.** Copy the project folder to `src/videos/<name>_{cam,world,mat,char,post}` with entries `src/sandboxes/<n>/index.tsx` (same `index.tsx` as main, only the import path changed). Ownership used for the bridge:
   - cam: story.ts (camera keys, cuts, kicks, DOF table, foreground props)
   - world: world.ts, lights.ts, shade.ts, grade.ts (sun, sky, fog, river, colour, grade)
   - mat: paint.ts, build.ts (painted textures, buildings, props)
   - char: toon.ts, cast.ts, cardshade.ts (character drawing, posing, card lighting, fx cards)
   - post: ink.ts, Bridge.tsx, lensblur.ts (outline pass, composer, lens blur, bloom)
   Agents only edit their own files in their own sandbox and render stills with `BRIDGE_ENTRY=src/sandboxes/<n>/index.tsx node scripts/bridge-stills.mjs out/<name>/<n>/x_ <frames> 0.5`.
3. **Merge** with `python scripts/bridge_merge.py [cam,world,mat,char,post]` (backs main up to `backup/bridge_<time>/`, copies owned files only). Then `npx tsc --noEmit` (filter to the project folder), then **re-sync every sandbox from main** (`cp -f src/videos/<name>/* src/videos/<name>_<n>/`) before the next round.
4. **Verify** with a fresh Opus max agent: side-by-side sheets (`python scripts/sbs_sheet.py out.jpg --ours a b --ref r1 r2`), score each area out of 10 (colour day / golden, lighting, ink, textures, characters, depth, composition) plus a numbered fix list with frame numbers. Map each fix to the file owner and resume that owner's agent with SendMessage (keeps its context). Bridge scores: round 1 5/3/4/5/4/7/4/6 → round 2 5/4/5/6/4/7/6/6 → round 3 see notes.
5. Contracts between owners live in exported constants (e.g. `NOINK` layer from ink.ts, `dofAt`/`FOREGROUND` from story.ts, `LIGHTS`/`LOOK` from lights.ts). Changing a contract means telling every owner that reads it.

## Gotchas
- Kenney nature-kit materials are teal: recolour them by material name in build.ts.
- Cameras end up inside houses: the sight-line culler in build.ts/world.ts removes anything blocking any camera ray.
- Ink in the same merged effect pass as DOF gets overwritten. Ink must be its own pass before the blur.
- Pixel-sized post parameters must scale with resolution: stills are at 0.5, the final at 1.333. R3F clamps dpr to ≥ 1, so `--scale 0.5` stills still render a 1080x1920 buffer.
- **Disk:** every Remotion bundle copies `public/` (~1.3 GB) into `the temp folder\remotion-webpack-bundle-*` and never deletes it. 60+ GB filled the system drive during the bridge passes and a render died with ENOSPC. Always render with `export TEMP='<big drive>/remotion-tmp' TMP='<big drive>/remotion-tmp'` (bridge-stills.mjs sets it itself) and ask the user before deleting old bundle folders in the shared the temp folder (auto mode blocks the sweep). <big drive>/remotion-tmp fills too (~500 folders / 110 GB after the 4 bridge rounds): when a project is finished and nothing is rendering, delete its `remotion-webpack-bundle-*` and `puppeteer_dev_chrome_profile-*` folders there.
- In JS strings write `"<big drive>/remotion-tmp"`, never `"<big drive>\remotion-tmp"` (`\r` becomes a carriage return).
- Remotion writes a silent audio track: mux with `-map 0:v:0 -map 1:a:0`.
- Sub-agents can't write report files in this harness: ask them for a ≤150-word final message and save it yourself to `out/<name>/<n>/REPORT.md`.
- Scratch `.ts` files inside `out/` break `tsc`: name them `.txt`.
- Crossfade layers unmount mid-render: guard pass `dispose()` calls (the InkPass dispose crashed at frame 1096).
- No Kenney models offline: `loadKit()` returns `{}`; `prop()` still draws the cartoon trees and bushes; build everything else from code.
- 2K renders run ~4 fps (≈10 min for 67 s). Stills at 0.5 take 3-8 s each after a ~40 s bundle.
- Film grain at 2.5 % made the 2K file 910 MB instead of ~250 MB and will turn to mush on YouTube; the reference has none. Keep it off.

## Ink line stability (user: "the ink lines of the road, buildings, cars flicker in the entire video")
- The world ink pass (ink.ts) runs SUPERSAMPLED (`ss: 2`, RMAX 12) and sizes itself from the input buffer every frame.
  Never set ss below 2: at 1 sample per pixel every line snaps to whole pixels and crawls when the camera moves.
- Ground is never inked: road, kerb, pavement, grass, floors go on NOINK (`decal()` in templates/fatberg/world.ts).
  Ground-to-ground seams open sub-pixel cracks (dashed ink lines that come and go) and a 15 cm kerb seen edge-on is a
  1-2 px sliver whose line blinks. Build each ground area as ONE quad, and PAINT kerb edges, road markings, gutters and
  paving joints into the textures. No decal strips floating mm above a surface (they z-fight and blink).
- Outdoor cameras use near = 0.4 m (sewers/interiors 0.05-0.12): 3x the depth precision, no z-fighting at 30 m+.
- Anything thinner than ~3 px on screen (poles, rails, cables, steps, window bars) is either thick enough to stay
  >= 3 px in every frame of the shot, or NOINK with its edge painted in. Check with an 18-frame range render: count
  dark (ink) pixels per frame in a crop; the count must change smoothly, never alternate up/down.

## Real objects must look real (user: "buses, grass, animals, real objects must have their real shape and size")
- Before building any real object, look up a reference photo (image search) and its real dimensions; write them in
  the code comment. Model to scale: double-decker 11.2 x 2.55 x 4.4 m, car 4.5 x 1.8 x 1.5 m, kerb 0.12-0.15 m,
  door 2.1 m, storey 2.9 m, adult 1.7 m, sewer as in the facts (do not enlarge a real structure without saying so).
- No bare boxes for vehicles: rounded body corners (bevelled boxes or ExtrudeGeometry with a rounded outline), wheel
  arches with recessed wheels + hubs, windscreen raked/rounded, separate window panes with pillars, doors, mirrors,
  head/tail lights, number-plate shape (no text), bumper. Buildings: window reveals (inset glass), sills, doors,
  gutters/downpipes, roof with real pitch and chimneys. Plants: cartoon vegetation from build.ts, never cones/spheres.
  Animals: real silhouette proportions from a reference, legs on the ground, correct size against people.
- Verifier prompt must include "does every real object match its real shape and size?" with the reference photos.

## Real motion and real physics (user: "liquid flowing, a person driving, a person in a bus don't feel real;
## grass in the wind must move like real grass")
Use `templates/real/realism.ts` (tested in `templates/real/RealTest.tsx`, sheet `templates/real/test_sheet.jpg`):
- **Liquids** never as a flat card: `new Pour({from, dir, speed, radius, surfaceY, liquid, foam, slick})` and
  `pour.update(t)` = ballistic arc from the mouth with exit speed, thinning with speed, gentle surface ripple, crown
  splash, hopping droplets, fading ripple rings, a slick that grows. The pipe mouth is real geometry with a rim.
  Known polish item: a faint kink in the stream shading at one ring; check it in the first shot that uses it.
- **Vehicles** from `car()` / `bus()` at real size with interiors; `drive(v, dist, t, accel)` every frame: wheels
  spin from distance, suspension bob, pitch on accelerate/brake. Moving vehicles always move in the world (and the
  world moves past them: passing posts, trees, road marks), never a still box with a sliding background.
- **Car detail checklist** (all in `car()` with `carMaterials(paint)`, sheet `templates/real/test_sheet_car.jpg`):
  glossy Phong paint with clear-coat highlights; tinted glass texture (sky reflection at the top, dark at the bottom,
  diagonal reflection streaks) with rubber seals and a chrome sill strip; raked windscreen + rear screen with wipers;
  door shut lines, handles, rubbing strip, shaped mirrors with glass; headlight units = chrome housing + reflector +
  twin bulbs + domed clear lens + amber indicator; tail lights = red segmented lens; chrome-barred grille; bumpers;
  UK plates (white front, yellow rear, blank); tyres with tread texture and rounded sidewalls; 5-spoke alloys with rim
  lip, centre cap and nuts; dark wheel-well liners. Anything placed on an extruded body must be offset by the bevel
  (the surface is `bevel` outside the profile points), or it ends up buried inside the body.
- **Cars are hollow above the belt line** (roof on A/B/C pillars, glass quads between them): a solid cabin hides
  the windscreen texture and everyone inside. Glass uses the glass texture the right way up (sky at the top).
- **Wheels while driving**: textured tread (chevrons, sipes, centre groove) and sidewall marks so the roll reads;
  pass the speed to `drive(..., speed)`: a motion-blurred wheel face fades in above ~0.15 rad per frame, like film.
- **Nature** (`tree()`, `grassField()`, `bladeTex/leafTex/barkTex/turfTex/asphaltRealTex`, sheet
  `templates/real/test_sheet_drive_nature.jpg`): trees = bent tapered bark trunk + 5-7 branches + ~420 textured leaf
  cards per branch end (translucent, alpha-tested, NOINK), swaying in WIND (trunk barely, tips more, leaves flutter);
  grass = instanced textured blades (dark base, light tip) on a turf texture. All placement uses the integer hash in
  realism.ts: a sin() hash lines thousands of instances up into visible stripes.
- **The driver** (sheet `templates/real/test_driver.jpg`): card in `mode: "sit"`, `prop: "wheel"`, `belt: true`,
  `steer` = the same angle given to `steer(vehicle, a)` (front wheels yaw, wheel turns); place at
  `seatWorld(v, v.seats.driver)` every frame (rides the suspension bob), sole at seat.y + 0.04, scale ~0.7; hide
  `v.steering` (the card draws the wheel under its hands). Glass is a LIGHT tint (opacity ~0.42) or occupants turn
  into silhouettes. Interior seen through the glass: low dashboard with glowing gauges, rear-view mirror, sun
  visors, gear lever, seatbelts on the pillars, headliner. Hands on the wheel only show from the side window or an
  inside 3/4 view: frame driving close-ups there, not straight through the windscreen.
- **Paint, glass and chrome reflect** the surroundings (`skyEnv()` in carMaterials; pass golden=true at sunset);
  cars sit on a soft contact shadow; tailpipe under the rear bumper.
- **Occupants** sit on the vehicle's seat anchors (`v.seats.driver`, `v.seats.rows`) in sit mode, at scale 1, the
  driver's hands on the wheel; seen through glass framed by pillars; some other seats filled; never a figure standing
  in a hole of a box.
- **Wind**: grass = `grassField()` (instanced tapered blades, NOINK), trees/reeds/flags/cloth = `windSway(material)`;
  set `WIND.time.value = t` each frame. Gusts travel across the field; tips move more than bases.
- **Everything that should move, moves**: water ripples, smoke drifts and spreads, leaves flutter, hair/clothes on
  wind, wheels turn, people breathe and blink, doors swing on hinges. A still element in a "living" place reads fake.
- Before a full render, render 3-4 test stills of every new real object/effect in RealTest-style isolation and look
  at them against a reference photo.

## Flicker traps (swiftshader render; measured with tools/flicker.py)
- Transparent depthWrite:false meshes (glass cases) behind/in front of lens-blurred subjects stair-step and change
  every frame: leave glass out, draw only the frame edges.
- Sun shadow camera must be locked per camera setup (size from the widest frame, centre snapped to the shadow texel
  grid, `shadowFrame()` in templates/fatberg/world.ts); small interior/insert sets get no sun shadows at all.
- No anisotropic filtering in swiftshader: no pixel-size speckle, no fine seams, bricks >= 12 cm rows on surfaces seen
  at grazing angles (roads, pavements, tunnel walls). MSAA 4 vs 2 changed nothing in swiftshader: keep 2.
- Vehicles passing close to the lens: <= ~7 m/s at 5 m, or they judder (no motion blur).

## Readability traps the verifier caught (check every new prop/shot for these)
- **Hidden things (pipes, tunnels, insides): use a cutaway set** (soil face at one plane, the far half of the pipe,
  the contents as a flat textured cross-section, a brick rim). Cards stand in the half pipe; no cramped interior lens.
- Displaced `IcosahedronGeometry`/`SphereGeometry` must go through `mergeVertices()` first or every facet gets an ink
  crease. Rounded mesh ends need planar UVs (radial UVs pinch into an onion).
- Low golden sun in a street of 12 m+ buildings shadows the road and anything on it: put the sun along the street
  axis, and add a per-shot warm `TONE.uBounce` so hero objects in shade keep their colour (a red bus went magenta).
- Never place a street camera inside a building footprint; long props (bathtub) should recede from the lens, and the
  lens must sit above their rim line. Documents lie flat and are shot from above at ~45 degrees.
- Fast passes: a 10 m vehicle at 46 m/s crosses a 3 m-wide frame in 2 frames. Keep screen crossings >= ~20 frames.
- **Test the first, middle and last frame of every shot**, not just one mid frame: the Molasses hook's opening frames
  (column dead centre, runners behind the lens) were only caught after rendering. Cameras that follow a moving event
  must be functions of it (e.g. `frontX(tau)`).
- A vertical frame is narrow: at 6 m with fov 42 it is only ~2.6 m wide. Keep characters in a mid shot ≤ 0.9 m apart.
- A fluid wave reads as a mud bank or mesa when it is a uniform cliff. Use a dark body, amber vertex colour on steep
  faces only and a rounded nose (`sqrt(smoothstep)` edge profile).
- Characters standing in fluid: put the surface at their waist, never the chin; check against the depth function.
- Interior sets need a ceiling (built with cast shadows off), or the sky shows above the walls.
- Large curved subjects (tanks, towers) go blue-dark with a side sun: use day az ~118 (more frontal).
- Stage scenes away from structures you deform (bent El spans hung across a nearby shot).
- Keep big vertical structures (columns, posts) off the frame centre; put the lens between them.
- **A swing drawn as one rope that disappears behind the kid reads as a HANGING.** Always two ropes to a wide plank
  with the kid between them (`swingKid` in toon.ts), and a frame whose legs clear the arc (A-frame at each end).
- Props or flotsam closer than ~2 m to a lens become huge cut-off blobs at the frame edge. When a camera moves, re-check
  every prop near its new position (the river cameras moved into the floating hats).
- A foreground bush cut by the frame edge reads as a "green ball"; a foreground prop must be recognisable or gone.
- Flags: red + yellow star/diamond reads as Vietnam's. Use a period-correct flag (St George's cross for England 1831).
- Painted signs lit by a side sun go grey-blue and unreadable: give the sign face an unlit material.
- Golden rim light done as an offset outer copy turns every hat into a picture frame: inner rim only, head/torso only.
- Balcony/railing rails at chest height through characters: put the lens ~2.5 m up so rails cross legs, not torsos.
- Flat holds read as freezes in QA (frozen span ≥12 f): every hold needs a creeping push-in.
- **Insert cards** (photos, documents, bowls) at ~1.25 m with fov 38 get a frame only ~0.48 m wide: keep them ≤ 0.45 m.
- Poles (lamp posts, bollards) in the middle third of a wide read as a split screen: no street furniture near the action.
- A character walking across a narrow vertical frame leaves it: the camera follows a shared position function.
- Golden backlight on a frame full of big walls goes to blue silhouettes: turn the ending's sun to az ~140, el ~14.
- Smoke/fog cards near the lens black out the frame: none within ~10 m of the camera.
- Short stroke marks in a water texture read as a lawn or deck at grazing angles: water gets soft blotches only.
- **Landscapes:** a steep face seen head-on is a flat wall; frame peaks obliquely from along the valley so their
  silhouette meets the sky. Keep cameras off the opposite slope (the lens gets lifted onto it). Terrain must not cast
  shadows (whole faces go violet at a low sun). Check the ground height at every set piece (a lake ended up under the
  mountain foot) and keep footprints apart (an embankment buried the old road).
- Cracks or marks on terrain: draped ribbon meshes along polylines, not camera-facing cards (they float) or vertex
  colours (they blur).
- Soft cards in front of detailed scenery get world ink lines through them: use mesh effects (a snow tongue) or keep
  dust where the background is plain.
- Big buildings within ~10 m behind a low-angle subject fill the frame with wall: move them back or put the hero
  object (stacks) in front of them.