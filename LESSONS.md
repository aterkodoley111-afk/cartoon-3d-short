# Lessons log

One entry per finished video, newest first. Each entry records what went wrong, what fixed it and what changed in
SKILL.md, so the next video starts from a better place. SKILL.md holds the distilled rules; this file keeps the history.

## Video 5: The 250-Metre Monster Hiding Under London (Whitechapel fatberg, 2017), 2026-11-17

- Result: 61.2 s, 1440x2560 (rendered 1080x1920, lanczos upscale), 12 shots / 26 camera setups, user's ElevenLabs
  voiceover (185 words; raw 72.5 s -> 66.4 s after `tighten.py 0.25` -> 60.3 s with atempo 1.10; align matched 178/185),
  original score + synthesized SFX, -15.0 LUFS / -1.1 dBTP, 1835 frames, 104 MB. Render 3.2-10.2 s/frame (sewer +
  lens blur and insert rooms 7-10, plain street 3.5), 41 chunks, two runs (7000 s budget ran out at 26/41), ~3.6 h total.
- Project: `projects/whitechapel-fatberg/`. Source: `templates/fatberg/` (a London street of brick terraces with
  shopfronts + `londonFacade()` texture, a sewer as two half-cylinders, a lumpy 250 m plug mesh, a CUTAWAY set: soil
  face at z = 0 + pipe back half + the plug as a flat cross-section `ShapeGeometry` + a flood plane scaled in y,
  double-decker bus / tanker / van built from boxes, CCTV crawler, five insert rooms; new fx cards in `fxfat.ts`).

### What went wrong, and the fix
1. **`IcosahedronGeometry` is non-indexed, so `computeVertexNormals()` gave faceted rocks** (every facet got an ink
   crease). Fix: `mergeVertices()` (after deleting normal/uv) before displacing -> smooth blobs.
2. **A tube mesh's rounded end with radial UVs pinched into an "onion" at the pole.** Fix: planar UVs on the cap rings
   plus a cluster of lump meshes covering the pole.
3. **Low golden sun in a street canyon puts the whole road and the bus in shadow** (terraces 12-15 m tall, 10 m from
   the road centre). The bus turned magenta (red x violet shade). Fix: sun along the street axis (backlit sunset, az 4)
   and a per-shot warm `uBounce` (1.0, 0.2, 0.06) so shaded faces turned to the lens stay red.
4. **Camera placed inside a terrace block** (aerial over the bus line at z = 15 with houses at z 10-22): a brick wall
   filled a quarter of the frame. Keep street cameras over the road or the pavement (|z| < 10).
5. **A bathtub seen from 2.1 m at lens height 1.25 m showed only its outer wall** (sight line below the 0.62 m rim).
   Turn long props so they recede from the lens and raise the camera above the rim line.
6. **A flat document card shot with the standard horizontal insert camera became a sliver.** Lay documents flat
   (`flat: true, rot: PI`) and shoot from ~1.5 m above at ~45 degrees.
7. **Hand-held props past the canvas edge are cut off**: the 600-unit design canvas only reaches ~1.3 m wide. Long
   tools (jet lance) start from the chest-held hand (x ~ tcx + 0.45 T.a) and stay under ~100 u.
8. Verifier: half its list were frames taken before an animation started (empty sink, no flood yet, no flies yet).
   Give the verifier the mid frame of every setup plus first frames, and label which frames precede their action.
   Real catches: buses merged into one red train (gap 0.6 -> 2.6 m), tanker passing in 2 frames (46 m/s -> 14 m/s),
   scum ring too faint, a crop at the frame edge.

### What worked (keep)
- The **cutaway** reads instantly as a diagram: soil face with a brick rim above/below the pipe, the plug as a flat
  textured cross-section, cards standing in the half pipe; the jet and the clang shots work in it with no tight camera.
- Sewer lighting without new presets: override TONE/CHAR uniforms and fog (#1c1814, 1.2 -> 16 m) when set = sewer,
  sun shadows off; the dark fog gives the tunnel depth for free.
- Callback ending: "weighed as much as eleven buses ... now helps to run them": the eleven buses popping in on the
  number, then one bus at sunset.

### After delivery: user feedback (flicker, loud SFX, blue shadow) -> v2
- User saw flicker. `tools/flicker.py` located it: museum floor behind the glass case (lens blur + depth-less glass,
  4.36 % strong-flicker pixels -> 0.86 % with the glass removed), road/pavement texture crawl in the street shots
  (3.34 % -> 1.93 % with speckles removed, bigger slabs), per-frame-flip impact shakes (now damped, 4-frame period),
  a tanker crossing at 14 m/s (judder; now 7 m/s). Two fixes did NOT help and were measured before the full re-render:
  shadow-map locking alone (museum unchanged) and MSAA 4 (bit-identical output in swiftshader).
- User found SFX too loud: the jet hose hiss was only 2.6 dB under the voice, flood gurgle 5 dB, clank/spurt 6 dB.
  Fix: per-event gains down 5-9 dB, hisses low-passed, and `sfx_ceiling()` (>= 9 dB under voice everywhere).
- The blue road at the ending was the bus's long shadow at a 12-degree backlit sun, painted with the golden preset's
  violet shade next to bright orange road. Fix for backlit sunsets: per-shot warm dusky shade (0.36, 0.24, 0.26).
- v2 result: whole-film flicker mean 3.78 % -> 2.82 %, worst frame 43.97 % (clang shake) -> 21.34 % (real crawler
  motion); SFX >= 8.9 dB under the voice everywhere; -15.0 LUFS / -1.4 dBTP. Two workspace restarts killed the render:
  chunks.mjs resumed cleanly each time (check `ps` for it after any restart notice).
- Full re-render required (~3.6 h). Lesson: run tools/flicker.py on a range render of the busiest shots of each set
  BEFORE the first full render.

### Feedback after v2 (no re-render asked): ink lines flicker everywhere; objects must look real
- Cause 1: the ink mask was computed at 1 sample per pixel, so every world line snapped to whole pixels and crawled.
  Fix: ink.ts supersampled 2x (RMAX 12), mask downsampled with bilinear taps; now in every template.
- Cause 2 (the user's frames: a kerb line that appears and disappears, a dashed line on the pavement): ground built
  from several quads (seam at z = 10 opened sub-pixel cracks = dashed ink) and a 15 cm kerb seen edge-on (1-2 px
  sliver, detected in some frames only). Fix: ground on NOINK, one quad per ground area, kerb edge + road markings
  painted into the road texture. Measured on frames 0-17 of the hook: kerb/pavement ink toggles 36552 px -> 0.
- Cause 3: road markings as strips 6 mm above the road z-fought (the second yellow line vanished every few frames).
  Fix: markings painted in, outdoor near plane 0.12 -> 0.4 m. Yellow-line pixel count jump per frame 8.6 % -> 1.9 %.
- The bus, tanker and van were plain boxes; the user wants real shapes and sizes. New SKILL.md section "Real objects
  must look real": reference photo + real dimensions before modelling, rounded/bevelled vehicle bodies, wheel arches,
  window panes, lights, etc.

### Feedback on earlier videos (river pour, Hope car and bus): "doesn't feel real"
- River oil pipe: a flat wavy card hanging straight down from the pipe centre, no exit speed, no impact. Hope Slide
  car: a box with a flat lid and a floating head, no seat/wheel/glass; bus: a box frame with a standing figure.
- New `templates/real/realism.ts`: Pour (ballistic, thinning, splash, droplets, fading rings, slick), car()/bus() at
  real size (extruded rounded profiles, wheel arches, spoked wheels, glass panes on pillars, lights, grille, bumpers,
  mirrors, interior seats + dashboard + steering wheel + seat anchors), drive() (wheel spin, bob, pitch),
  windSway()/grassField() (gusting wind). Tested in RealTest.tsx (4 views, swiftshader): reads as real grass, a real
  car and bus; pour needs one shading polish. New SKILL.md section "Real motion and real physics".

### Feedback: "more realistic: car windows, texture, headlights"
- car() rebuilt: carMaterials() (Phong clear-coat paint, glass texture with sky reflection + streaks, tyre tread,
  UK plates), lamp() units (chrome housing, reflector, twin bulbs, domed lens, amber indicator / red segmented tail),
  door lines, handles, mirrors, wipers, grille bars, bumpers, alloy wheels with rim lip + cap + nuts, wheel-well liners.
- Bug found in testing: ExtrudeGeometry's bevel grows the outline by `bevel` (9 cm), so lamps, grille and plates placed
  on the profile points were buried inside the body and the wheel arches were 9 cm too tight. Fixed by offsetting
  along the surface normal; noted in profileBody(). Test sheets: templates/real/test_sheet_car.jpg.

### Feedback: "front glass has no texture; real environment, tyre texture while driving, grass/trees/leaves + motion"
- Cause of the plain windscreen: the cabin was a solid extrusion and the screens sat inside its bevel. Rebuilt the
  greenhouse hollow (roof + A/B/C pillars + glass quads + headliner/door cards): the windscreen shows its reflections
  and the interior is visible.
- Added tread/sidewall textures, a speed-driven wheel motion-blur disc, tree() with bark/branches/leaf cards + wind,
  textured grass blades, turf and asphalt textures. Bug found: sin()-hash placement made grass and turf into stripes;
  replaced with an integer hash. Test sheets in templates/real/.

---

## Video 4: The Mountain That Suddenly Disappeared (Hope Slide, BC 1965), 2026-11-16

- Result: 66.1 s, 1440x2560 (rendered 1080x1920, lanczos upscale), 14 shots / 29 camera setups, user's ElevenLabs
  voiceover (200 words; raw 79.4 s -> 65.3 s after tightening pauses + atempo 1.10), original score + synthesized SFX,
  -15 LUFS / -1.2 dBTP, 1983 frames. Render 3.1-6.9 s/frame (bus/room shots with lens blur slowest), 45 chunks, two runs
  (the 7000 s budget ran out at 36/45).
- Project: `projects/hope-slide/`. Source: `templates/hope/` (a whole mountain valley as height functions in
  `terrain.ts`: Johnson Peak, Mount Coulter, Outram Lake, an analytic slide = scar + travelling mass + deposit;
  ~4000 stylised conifers in toppling bands; vehicles built from boxes with real window holes; crack ribbons).

### What went wrong, and the fix
1. **Cameras placed by intuition landed on Mount Coulter's slope** (keepUp lifted them to the surface, frames were
   80 % slope) or looked at the wrong thing. Five still rounds (~12 s/still) were spent. Fix: `tools/check_framing.ts`
   (bundled with esbuild, runs in 1 s) projects named subject points for the first/mid/last frame of every setup,
   reports terrain occlusion, lens height above ground and what the top/centre/bottom rays hit. Run it after every
   camera edit, before any stills.
2. **A 45-degree face seen head-on reads as a flat wall**; profile/oblique views with the peak silhouetted against the
   sky read at once. Put landscape cameras along the valley axis, low, with the subject's silhouette against the sky.
3. **Terrain self-shadowing at a low sun turned whole faces violet.** Terrain `castShadow = false` (it still receives).
4. **Set pieces buried by the terrain:** the lake sat 7 m under the mountain foot; the new road's embankment covered
   the old road. Check `H0` at every set piece and keep features' footprints apart.
5. **Camera-facing crack card floated in the sky; vertex-colour cracks blurred into smudges.** Draped ribbon meshes
   (MeshBasic, polygonOffset, NOINK) along polylines on the face read as ink cracks; width per shot by distance.
6. **Soft puff cards in front of trees get the world ink drawn through them** (ink pass ignores NOINK cards). The snow
   avalanche became a mesh tongue + a few small puffs; big dust is kept away from busy backgrounds.
7. Verifier: "before dawn" lit like sunrise (hard 20-degree sun) -> softer pre-dawn preset (el 10, shade close to lit);
   forest vanished instead of falling -> tree bands pivot on their ground line and topple before hiding; inserts
   floated -> seat cards on floor/desk; official looked like a driver -> bowler, moustache, paper in hand.

### What worked (keep)
- One analytic terrain function shared by mesh, cameras and cast: deterministic per frame, cached by state key.
- Hook = the climax replayed ~2x fast; ending reuses the hook's camera (bookend) on today's scarred peak.
- Tragedy handled plainly: the "four people" beat is a quiet wide with a pad and no percussion.

---

## Video 3: The River That Caught Fire (Cuyahoga, Cleveland 1969), 2026-11-16

- Result: 67.6 s, 1440x2560 (rendered 1080x1920, lanczos upscale), 13 shots / 28 camera setups, user's ElevenLabs
  voiceover (181 words, 66.8 s = 2.71 words/s), original score + synthesized SFX, -15 LUFS / -2 dBTP, 2028 frames, 106 MB.
  Render: 2.3 h at 1080x1920 swiftshader (2.2-9.6 s/frame, 4.2 average), 46 chunks of 45 frames, two runs.
- Project: `projects/river-fire/` (script + sources, words.json, shots.json, cues.md, test frames).
  Source: `templates/river/` (industrial river world: bulkheads, mills + free-standing stacks, wooden trestle, train,
  fireboat with live Tube sprays, junk raft, slick plane, flame/smoke card fire, three interior insert sets, today set).

### What went wrong, and the fix
1. **Insert cards were too wide for the vertical frame.** At 1.2-1.3 m from the lens with fov 38 the frame is only
   ~0.48 m wide; 0.76-0.9 m cards were cropped. Fix: insert cards <= 0.45 m wide at ~1.25 m (or move the lens back).
2. **Big buildings right behind a subject** (shed 8 m behind the steelworker) filled a low-angle shot with wall. Fix:
   free-standing smokestacks in front of the sheds (z -29..-31), sheds pushed back to z <= -35.
3. **Lamp posts and bollards along the bank sat dead centre** in two wides. Fix: no street furniture within 45 m of
   the action; check every wide for vertical poles in the middle third.
4. **A walking character left the frame** (camera aimed at the end point). Fix: the camera follows the walker
   (`photogX(t)` shared by story.ts and cast.ts).
5. **Characters placed next to the trestle** got piles through them. Keep characters >= 8 m from structures that
   continue onto the bank.
6. **Golden backlight (az 6) turned the today set into blue silhouettes** when the frame is full of big walls. Fix:
   sunAz 140 / el 14 per shot for the ending.
7. **Near-lens smoke cards** blacked out the top half of the hook. Fix: no smoke card within 10 m of the lens, alpha 0.7.
8. **Verifier caught history errors I had baked into the pictures**: Nixon vetoed the Clean Water Act (Congress overrode
   it), so no signature on the bill; Time ran the 1952 photo inside, not on the cover; the 1969 fire was small and at
   the trestle, not the whole river (fire radius capped at 12.5 m). Fix: check every insert prop against the facts
   list, not just the narration.
9. **Streaky water texture read as a lawn/deck** at grazing angles. Fix: river textures are soft blotches only, no
   short strokes; 1969 water dark brown-grey #4c4636.
10. **A camera following a moving vehicle started behind a building** (fireboat shot: frames 895-920 were a blurred
    brick wall) because its test stills were taken late in the shot when the boat had moved. Fixed by re-rendering 3
    chunks. Same rule as before, now enforced: render the FIRST frame of every shot whose camera is a function of a
    moving object.
11. Render restarted once after the verifier (~15 min lost). Run the verifier on the first contact sheet BEFORE the
    first full render, not in parallel with it.

### What worked (keep)
- Fire as camera-facing flame cards on a jittered grid, lit by distance from the ignition point (`fireR(tau)`,
  bisection for each card's age), put out from the boat's side (`outAt`), with dark smoke turning to steam.
- Story beats as visual gags that are facts: chalk tally of earlier fires, photographer's flash on empty steam,
  dust blown off the 1952 photo, the ending's phone photo calling back "nobody took a single photo".
- Sad brass fall (`brass(kind="soft", fall=-5)`) on the punch line; music cut dead on "spark", brass stab on "flames".

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
