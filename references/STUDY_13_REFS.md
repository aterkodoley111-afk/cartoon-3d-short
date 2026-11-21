# Study of 13 reference shorts (Nov 2026) — what to copy as a CRAFT, never as content

Private study, numbers and rules only. The reference videos, their frames, transcripts and sheets are NOT stored
anywhere in this repo and must never be. Never reuse their stories, names, lines, characters or shots.

How they were studied: every frame was decoded (25,000+ frames, 13 videos, 56-78 s each) for brightness, saturation,
contrast, hue, frame-to-frame change and camera motion (optical-flow affine fit: pan / zoom / roll). Every frame was
OCR'd at 6 fps for the burned captions (script structure). Audio: integrated loudness, loudness range, transient and
low-end "boom" detection, voice-gap detection. Visual read: contact sheets at 2 frames per second, all videos, start
to end, plus full-resolution crops of the characters.

## 1. Script: hook, build-up, payoff (the 7-beat formula all 13 follow)
| beat | time | what happens | pattern |
|---|---|---|---|
| HOOK | 0-3 s | ONE sentence, <= 15 words: a person doing a strange, specific action + the stakes | "He [does odd exact thing with a NUMBER] because/while [big threat]." / "If you [do X], [absurd result]." / "They [did X], and not just any X." |
| MOCKERY | 3-12 s | the crowd / boss / court laughs; one short mocking line in quotes | a rhetorical joke question ("...or are we making soup?") |
| ESCALATION | 12-30 s | 2-3 weirder details, each with an exact number, time stamps ("That night", "By the fifth race") | "But it gets weirder." / "Then summer comes, and something weird happens." |
| TEST / THREAT | 25-40 s | the danger arrives or the idea is tested; it seems to FAIL first | mockers laugh harder |
| "YOU SEE," | 35-50 s | the hidden mechanism, in plain words, with ONE vivid physical metaphor | starts literally with "You see," or "See," |
| PAYOFF | 45-60 s | the weird idea works spectacularly; the mockers are proven wrong | visual climax: explosion, wave, collapse, money rain |
| BUTTON | last 2-3 s | an ironic / circular one-liner that calls back to the hook; video ends ON the last word | "Nobody's laughing anymore." / "...the exact opposite." / "And that's why X was invented." |

- Length 56-78 s (median 64.5 s). ~165-185 words per minute, 170-200 words total.
- Voice is nearly continuous: total pauses only 2-6 s per video; sentences 3-12 words; present tense.
- Characters get a short memorable name or label (a nickname, "the toy guy", "Slow Eddie"-type) — invent our own.
- Second person ("Imagine you're...", "your body just did") is used to pull the viewer inside the explanation.
- Mix of real history/science (most) and original fables (a town around a button, a memory shop) — both use the same beats.
- No call-to-action, no intro, no outro. The tail after the last word is 0.05-0.3 s.

## 2. Visuals follow the narration word by word
- Every concrete noun is ON SCREEN when it is spoken: "82 holes" -> macro of holes; "stopwatch" -> stopwatch insert;
  "a sheet of paper" -> paper sliding into a gap. Numbers become physical objects: day counters, calendars, gauges,
  tally counters, price tags, newspaper headlines (invented, unreadable-small text is fine).
- Abstract ideas get a 3D metaphor: a control room inside the head seen through the eyes; a cutaway/x-ray of a machine;
  a geological cross-section; heat shown as glowing rail colours (purple -> pink -> yellow); an aerial map with routes.
- After every claim, a REACTION shot (face close-up) — the comedy lives there.
- Macro inserts of objects (hands working, liquids pouring, mechanisms) every 5-10 s.
- Crowds: dozens to hundreds of characters with varied outfits for "everyone", "the whole town", "the army".

## 3. Editing (transitions)
- A new picture every 1.2-1.5 s on average (about 40-55 picture changes per minute) — but few hard cuts are needed,
  because the camera itself changes the picture (push-ins, fly-throughs, whips).
- Measured hard cuts are rare (0-15 per video); most changes are: a fast camera move to a new subject, a 0.3-0.5 s
  crossfade on a time/place jump ("That night", "The next morning", "Meanwhile"), match/zoom transitions (push into a
  pupil -> black -> new place), iris/telescope circular vignettes, whip-pans with motion blur, POV through glass.
- Location/time jumps always get a crossfade + a grade change (day -> blue night -> warm dawn).

## 4. Camera movement per 10 seconds (measured)
- The camera moves in 85-100% of all frames. A static frame almost never lasts more than ~0.5 s.
- Typical 10 s window: median pan 8-25% of frame width per second, zoom +2 to +8%/s (slow push-in dominates).
- Per 10 s include at least: one slow push-in on a face or object, one lateral/orbit move, and at most one fast
  fly-over/whip (location change). Big fly-throughs (40-60%/s) are saved for "racing", chases and reveals.
- Low angles for power, high/top-down for maps and crowds, over-the-shoulder for dialogue, insert close-ups for props.

## 5. Characters (implemented as Cast v2: `templates/cast2/chars2.ts`)
- White, slightly squashed round head, heavy ink outline thicker on the shadow side, soft grey jaw shading.
- Tiny vertical-oval dot eyes with a highlight; THICK tapered brows do most of the acting; mouth is small.
- Expression switches: half-lid smug eyes, big round white eyes with small pupils (shock), closed ^ ^ (laugh),
  glowing red eyes (fury), whole face turns purple with steam puffs (rage), sweat drop, tear streams, D-mouth with
  teeth, big O scream with tongue.
- Hair and hats are painted, textured, shaded objects (curl strokes, cap seams, straw weave, metal rivets, plumes).
- Bean-shaped torso with real fabric: quilting, stripes, plaid, polka dots, scale armour, knit, denim; belts with
  buckles, buttons, pockets, badges, ties, bow ties, aprons, hi-vis stripes.
- Long thin ink limbs, small ink-blob hands and feet, ~3.6 heads tall. Kids shorter; "big" build for heavies.
- Poses: always leaning or tilted, elbows and knees bent, props in hand; head nods/tilts on stressed words.
- Lighting tints the characters with the scene (warm lamp light, blue night, red alarm glow).

## 6. Vehicles
- Glossy stylised-real cars (clear-coat paint, reflections, alloy wheels, LED light bars), liveries (police, tow truck),
  visible drivers through tinted glass, detailed dashboards (gauges, screens, wipers) for POV shots.
- Trains with smoke plumes, sailing ships, carts, horses, delivery trucks; vehicles always in motion with dust/spray.

## 7. Environment
- Fully modelled 3D sets crowded with props (desks, posters, clocks, plants, crates, lamps, signs).
- Two looks appear: semi-realistic PBR (roads, offices, prisons, canyons) and painted/stylised (western town, ships,
  palace). Both: strong key light, coloured practical lights, god rays, volumetric haze, rain/particles, DOF blur.
- Time-of-day is a story tool: bright noon for setup, stormy blue night for danger/explanation, golden/pink sunset or
  dawn for payoff.

## 8. Colour (measured over all frames)
- Mean luma 0.44 (0-1), contrast (luma std) 0.20, HSV saturation 0.46 (high).
- Hue mix: blue (210-240 deg) ~28% of coloured pixels, red/orange ~33%, yellow ~4%, green/teal ~12%:
  complementary BLUE shadows/backgrounds vs WARM orange/red subjects and practicals.
- One signature accent colour per video (hot pink cell, red button, gold jar, yellow coat).

## 9. Music and sound effects (measured)
- Integrated loudness exactly -14 LUFS on all 13; loudness range only 1.7-3.2 LU (dense, compressed mix).
- Music: continuous light, quirky underscore ~8 dB below the voice; low end never fights the voice.
- SFX: ~1 audible transient per second (whooshes on every camera move, pops, clicks, cloth, footsteps) and a low
  "boom/impact" every 2-4 s on reveals (16-29 per video).
- Ends hard on the last word (0.05-0.3 s tail).

## 10. Why they are so watchable (apply all)
1. A mystery hook in the first sentence (strange action + number + stakes).
2. Relentless visual novelty: a new picture every ~1.3 s, the camera never stops.
3. Simple faces with huge brow acting and reaction shots after every claim.
4. A rich, lit, crowded 3D world with a strong day/night colour arc.
5. Literal visualisation of every noun + macro inserts + 3D metaphors for the science.
6. Running gags and doubters who get proven wrong.
7. An ironic last line that calls back to the hook, ending on the last word.
