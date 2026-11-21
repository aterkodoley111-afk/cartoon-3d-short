# Gaps: look-lab v3 vs the 13 reference shorts (Nov 2026)
Measured on 7 matched pairs (top 300 px of 480, captions excluded):
ours luma 0.64 / contrast 0.26 / sat 0.34 / darkest 2% 0.07 ; ref 0.53 / 0.22 / 0.37 / 0.16.

## Characters
1. Clothes too busy: refs are mostly SOLID colours with a few details (pockets, buttons, buckle, lanyard, badge);
   patterns (plaid, dots) only on 1 character per video as a gag. Our every-character pattern reads noisy.
2. No form shading: ref torsos and heads have a soft darker band on the shadow side + light-side highlight, tinted by
   the scene (blue sky bounce, warm lamp). Ours are flat-lit cutouts.
3. Limbs: refs use thicker (~1.5x) dark navy/brown legs, not pure black hairlines; sleeves come out of the torso side.
4. Size in frame: refs frame characters at medium/close (head ~25-35% of frame width) most of the time; ours too small
   in wides.
5. Interaction: refs touch the world (lean on cars, dust kicked up, sitting on kerbs, holding story props).
## World
6. Grade: ours 20% too bright with crushed blacks; refs darker mid-tones, lifted blacks (haze), deeper saturated sky.
7. Sun too high: refs use ~30-40 deg sun with long tree/car shadows across the road and dappled leaf shadows.
8. Road: refs have visible aggregate grain, tyre marks, worn edge lines, gravel shoulder into grass; our drawn black
   cracks look cartoonish.
9. Grass: refs mix heights and colours (dry yellow tufts, clover, dandelions, wildflowers); ours uniform lime blades.
10. Trees: refs have dense crowns with dark self-shadowed interiors and real vertical furrowed bark; our bark reads
    as zig-zag stripes and the crown is too see-through.
11. Car: refs wedge shape, big wheels filling the arches, wide stance, sharp crease lines, chrome trim, dark
    reflective glass, LED DRL strip, black lower intakes. Ours still soft/blobby, small wheels, odd red pillars.
12. Effects missing: dust trails behind cars, skid marks, debris, heat haze.
13. Story props missing: signs, counters, tyres, tow truck, light bars - refs fill each shot with props that carry the
    joke.

## v4 fixes (all 13 addressed; sheet templates/looklab/v4_test_sheet.jpg)
Grade now luma 0.54 / contrast 0.22 / sat 0.40 (ref 0.53 / 0.22 / 0.37). Plain clothes (one patterned gag
character), blue-tinted form shading + lit rim on cast (`SHADE` in chars2.ts), 15 px navy legs / 12 px arms,
closer framing, dust under feet and behind cars, sun at 27 deg from the left, chip-seal road with worn markings,
mixed-height grass with 14% dry tufts + 7000 wildflowers, furrows along the trunk (TubeGeometry u = length),
420 cards per crown with dark interiors, deeper sky, car: 0.36 m wheels at the body edge, gloss-black pillars, chrome
belt trim, LED strip, lower intake, darker glass; props: warning sign, tyre stack, cones, mailbox, hay bales.
Never put skid marks in a repeating road texture (they repeat every tile); use a single decal.
Still open: ink keeps the darkest 2% at 0.04 (ref 0.16, haze); car still slightly soft vs ref crease lines.
