# Sound for "The Sweetest Disaster" (Great Molasses Flood): the user's narration (gain only), an original score in
# five sections (1919 ragtime bounce -> silence at the split -> dark low bed -> gentle music-box explanation ->
# pizzicato "blame" march -> warm golden ending) ducked under the voice, and synthesized SFX timed to the words.
# Standard mix: music +3 dB, SFX -6 dB relative to the bed defaults; voice unchanged. Master to -15 LUFS, <= -1 dBTP.
# usage: python sound.py  -> ../out/molasses/{mix.wav, stem_*.wav, cues.md}
import os, json, math
import numpy as np
from scipy import signal
from dsp import SR, ns, dbg, read_wav, write_wav, integrated, true_peak, pan, st, lp, hp, rng
import instruments as I
import sfx_gen as X

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out", "molasses"); os.makedirs(OUT, exist_ok=True)
WJ = json.load(open("/root/molasses-short/voice/words.json"))
WS = [w["s"] for w in WJ["words"]]
FR = math.ceil(WJ["duration"] * 30)
DUR = FR / 30.0
N = ns(DUR)
w = lambda i: WS[i]
SPLIT = w(96) - 0.08
RIVETS = [w(89) - 0.03, w(90) + 0.02, w(91) - 0.03, w(91) + 0.17, w(91) + 0.33]
GAVEL, SEAL = w(177) - 0.05, w(195) - 0.06
cues = []

def add(buf, x, t, g_db=0.0, p=0.0, name=None):
    x = np.asarray(x, float)
    x = pan(x, p) if x.ndim == 1 else x
    i = ns(max(0.0, t)); j = min(N, i + x.shape[1])
    if j > i: buf[:, i:j] += x[:, : j - i] * dbg(g_db)
    if name: cues.append((round(t, 2), name))

# ======================= SFX =======================
def sfx():
    b = np.zeros((2, N)); r = rng(7)
    # hook: the roar of the wave chasing the runners, screams, whoosh into the flash
    roar = lp(hp(r.standard_normal(ns(6.8)), 40), 420) * np.linspace(0.25, 1.0, ns(6.8)) ** 1.5
    add(b, st(roar * 0.5), 0.0, -4, name="wave roar (hook)")
    for k, t0 in enumerate([0.8, 2.3, 3.9, 5.1]): add(b, X.whoa(r, dur=0.45), t0, -10, (-0.4, 0.3, -0.1, 0.5)[k])
    add(b, X.whoosh(0.9, r, peak=0.6), w(19) + 0.2, -6, name="whoosh into flash")
    # harbour: gulls/birds + water + breeze through the setting shots
    t2, t4 = w(20) - 0.2, w(56)
    add(b, X.water_bed(t4 - t2, r, close=0.4), t2, -16)
    add(b, X.bird_chirps(t4 - t2, r, density=0.3, kind="sparrow"), t2, -20, 0.3)
    # the hose: a feeble trickle
    add(b, X.bubbles(w(56) - w(49), r, 6.0, f_lo=900, f_hi=2600), w(49), -18, -0.2, name="hose trickle")
    # leaks: slow drips (bloops)
    for k in range(9): add(b, X.bubbles(0.12, r, 30, f_lo=300, f_hi=700), w(56) + 0.1 + k * 0.62, -12, (k % 3 - 1) * 0.3)
    add(b, X.bubbles(0.15, r, 30, f_lo=250, f_hi=600), w(62) + 0.05, -9, name="drip into bucket")
    # paint: brush strokes
    for k in range(7): add(b, I.brush(0.6, r, dur=0.3, swish=True), w(69) + k * 0.33, -10, 0.2)
    # cold: wind, then the thermometer slide up (glock glissando)
    add(b, X.breeze(w(78) - w(73) + 0.6, r, level=1.0), w(73), -9, name="winter wind")
    for k in range(10): add(b, I.glock(I.m2f(72 + k * 2), 0.35, r, dur=0.6), w(78) + 0.12 * k, -14, 0.2)
    # noon: watch ticking
    for k in range(int((w(88) - w(84)) / 0.5)): add(b, X.clink(r, f0=3200, dur=0.03), w(84) + k * 0.5, -16, 0.4)
    # rivets: gunfire pops
    for t0 in RIVETS: add(b, X.bolt_snap(r), t0, -4, r.uniform(-0.4, 0.4), name="rivet pop")
    # the split: tearing steel + a deep boom + the release roar
    add(b, X.timber_tear(r, dur=0.9), SPLIT - 0.15, -4, name="tank tears")
    boom = lp(r.standard_normal(ns(2.5)), 90) * np.exp(-np.arange(ns(2.5)) / SR / 0.7)
    add(b, st(boom * 2.2), SPLIT, -2, name="boom")
    add(b, I.timpani(55, 1.0, r, dur=2.5), SPLIT, -4)
    rel = lp(r.standard_normal(ns(4.0)), 300) * np.exp(-np.arange(ns(4.0)) / SR / 1.8)
    add(b, st(rel), SPLIT + 0.1, -6)
    # slow spoon drip: one tiny plink at the end
    add(b, X.bubbles(0.15, r, 30, f_lo=400, f_hi=900), w(103) - 0.25, -10, name="slow drip lands")
    # unluckily: the wave hits the lens
    add(b, st(lp(r.standard_normal(ns(1.8)), 500) * np.linspace(0.2, 1, ns(1.8)) ** 2), w(103), -5, name="wave at lens")
    add(b, X.whoosh(0.7, r, peak=0.7), w(105) - 0.3, -6)
    # El bends (metal groan + crack), firehouse shoved (creak + rumble), sloshing street
    add(b, X.chain_groan(1.6, r, 0.5, 1.0), w(109) - 0.1, -6, -0.2, name="El groans")
    add(b, X.wood_crack(r), w(111), -8)
    add(b, X.creak(1.4, r, rate0=60, rate1=110, scale=0.7), w(113) - 0.1, -6, 0.3, name="firehouse shoved")
    add(b, st(lp(r.standard_normal(ns(1.5)), 120)), w(113), -8)
    add(b, X.water_bed(w(126) - w(119), r, close=1.0, slosh_rate=0.6), w(119), -12, name="slosh")
    # "Twenty-one people died": near silence, a soft wind only
    add(b, X.breeze(w(129) - w(126) + 0.8, r, level=0.5), w(126), -16)
    # honey: cold shiver ticks, then a warm pour
    for k in range(6): add(b, I.glock(I.m2f(96 + (k % 2)), 0.2, r, dur=0.2), w(137) + k * 0.09, -16, 0.3)
    add(b, X.bubbles(0.9, r, 12, f_lo=200, f_hi=600), w(143), -11, name="honey pours")
    # flowing -> setting: slosh fades out, wind comes in, a sticky squelch on "glue"
    add(b, X.water_bed(w(152) - w(145) + 0.5, r, close=1.0, slosh_rate=1.2), w(145), -10)
    add(b, X.breeze(w(164) - w(152), r, level=0.9), w(152), -12, name="January air")
    add(b, X.creak(0.5, r, rate0=30, rate1=18, scale=1.4, rough=0.3), w(159) - 0.05, -9, name="squelch")
    # rescuers wading
    for k in range(4): add(b, X.bubbles(0.35, r, 14, f_lo=180, f_hi=500), w(164) + 0.2 + k * 0.85, -12, -0.3 + 0.2 * k)
    # blame: bubble pop + tiny fizz, gavel
    add(b, X.clink(r, f0=1800, dur=0.06), w(172) - 0.1, -12, 0.3, name="thought bubble")
    add(b, X.hammer_hit(r, big=1.2), GAVEL, -3, name="gavel")
    # engineer: pen scratches, stamp
    add(b, X.rattle(1.0, r, density=40), w(188), -20, 0.1, name="pen scratch")
    add(b, X.rattle(1.2, r, density=40), w(191), -20, 0.1)
    add(b, X.push_thump(r), SEAL, -4, name="seal stamp")
    # today: evening birds/crickets, kids cheering, bat crack, sweet-smell shimmer
    add(b, X.crickets(DUR - w(196) + 0.5, r, voices=3), w(196) - 0.3, -20)
    add(b, X.bird_chirps(DUR - w(196), r, density=0.25), w(196), -22, -0.3)
    add(b, X.wood_crack(r), w(196) + 0.9, -12, 0.2, name="bat crack")
    add(b, X.hurrah(r, 260, 1.15, kid=True), w(196) + 1.1, -14, 0.3)
    for k in range(8): add(b, I.glock(I.m2f(84 + [0, 4, 7, 12, 7, 4, 0, 12][k]), 0.25, r, dur=0.9), w(217) + k * 0.13, -14, -0.2, name="sweet shimmer" if k == 0 else None)
    return b

# ======================= MUSIC =======================
def music():
    b = np.zeros((2, N)); r = rng(11)
    bpm = 116; beat = 60 / bpm
    # A: 1919 bounce (tuba oom-pah + pizzicato melody + glock sparkle), from the hook to the rivets
    prog = [[48, 52, 55], [53, 57, 60], [43, 47, 50, 53], [48, 52, 55]]  # C F G7 C
    mel = [72, 74, 76, 79, 77, 76, 74, 72, 74, 76, 74, 71, 72, 76, 79, 84]
    t, k = 0.15, 0
    endA = w(88) - 0.2
    while t < endA:
        ch = prog[(k // 4) % 4]
        add(b, I.brass(I.m2f(ch[0] - 12), beat * 0.8, 0.55, r, kind="tuba"), t, -6)
        add(b, I.pluck(I.m2f(ch[1] + 12), 0.4, r, dur=0.4), t + beat / 2, -12, -0.3)
        add(b, I.pluck(I.m2f(ch[2] + 12), 0.4, r, dur=0.4), t + beat / 2, -12, 0.3)
        add(b, I.pluck(I.m2f(mel[k % 16]), 0.55, r, dur=0.6, bright=0.7), t, -8, 0.1)
        if k % 8 == 7: add(b, I.glock(I.m2f(mel[k % 16] + 12), 0.4, r), t, -16, 0.4)
        t += beat; k += 1
    # tension under the rivets: a snare roll that stops dead at the split
    for tr, vr in I.snare_roll(w(88) - 0.2, SPLIT - 0.02, 0.2, 0.8, r): add(b, I.snare(vr, r, dur=0.18, buzz=True), tr, -12)
    # B: after the split: a dark low pad + slow timpani, fading out on "died"
    tB0, tB1 = SPLIT + 1.2, w(128) + 1.4
    add(b, I.pad([I.m2f(36), I.m2f(43), I.m2f(51)], tB1 - tB0, 0.6, r, att=1.2, rel=1.5, warm=500), tB0, -6, name="dark bed")
    for k in range(4): add(b, I.timpani(I.m2f(36), 0.5, r), tB0 + 1.5 + k * 2.6, -12)
    # C: explanation: music box, slow, minor-ish, from "Why so deadly" to the rescuers
    tC0, tC1 = w(129) - 0.2, w(169) - 0.3
    seq = [69, 72, 76, 74, 72, 71, 69, 64, 65, 69, 72, 71, 69, 68, 69, 76]
    t, k = tC0, 0
    while t < tC1:
        add(b, I.musicbox(I.m2f(seq[k % 16]), 0.5, r, dur=1.4), t, -10, (k % 3 - 1) * 0.3)
        if k % 4 == 0: add(b, I.pad([I.m2f(45), I.m2f(52), I.m2f(57)], 1.9, 0.35, r, att=0.4, rel=0.8), t, -14)
        t += 0.5; k += 1
    # D: blame + rule: pizzicato march, a little cheeky
    tD0, tD1 = w(169) - 0.2, w(196) - 0.3
    t, k = tD0, 0
    pz = [60, 64, 67, 64, 62, 65, 69, 65, 64, 67, 72, 67, 65, 62, 59, 55]
    while t < tD1:
        add(b, I.pluck(I.m2f(pz[k % 16]), 0.55, r, dur=0.35, bright=0.4), t, -9, (k % 2) * 0.4 - 0.2)
        if k % 2 == 0: add(b, I.pluck(I.m2f(pz[k % 16] - 24), 0.6, r, dur=0.5, bright=0.2), t, -9)
        t += beat / 2 * 1.15; k += 1
    # E: today: warm pad + glock melody, final chord
    tE0 = w(196) - 0.2
    add(b, I.pad([I.m2f(48), I.m2f(55), I.m2f(64), I.m2f(67)], DUR - tE0 - 1.0, 0.55, r, att=1.0, rel=1.2, warm=1400), tE0, -8, name="golden ending")
    gm = [76, 79, 84, 83, 81, 79, 76, 77, 79, 72]
    for k, n in enumerate(gm): add(b, I.vibes(I.m2f(n), 0.5, r, dur=1.6), tE0 + 0.4 + k * 0.62, -10, (k % 3 - 1) * 0.3)
    add(b, I.vibes(I.m2f(72), 0.6, r, dur=3.0), DUR - 2.6, -8)
    return b

def duck_curve():
    """music dips -3 dB under every spoken word (keyed on the word times, 80 ms attack / 300 ms release)"""
    g = np.zeros(N)
    for wd in WJ["words"]: g[ns(wd["s"]):ns(wd["e"])] = 1
    k = ns(0.3); g = np.convolve(g, np.ones(k) / k, "same").clip(0, 1)
    return dbg(-3.0 * g)

if __name__ == "__main__":
    v, sr = read_wav("/root/molasses-short/voice/voice.wav")
    v = np.asarray(v, float); v = v if v.ndim == 1 else v.mean(0) if v.shape[0] <= 2 else v.mean(1)
    if sr != SR: v = signal.resample_poly(v, SR, sr)
    vb = np.zeros((2, N)); vb[:, : min(N, len(v))] = v[:N]
    m = music() * duck_curve()[None, :]
    s = sfx()
    Lv = integrated(vb)
    # bed levels relative to the voice: music -13 LU (+3 dB standard -> -10), SFX -4 LU (-6 dB standard -> -10)
    m *= dbg(Lv - 10 - integrated(m)); s *= dbg(Lv - 10 - integrated(s))
    mix = vb + m + s
    g = dbg(-15.0 - integrated(mix)); mix *= g
    tp = true_peak(mix)
    if tp > -1.2:  # simple look-ahead-free soft limiter on peaks only
        c = dbg(-1.2); mix = np.where(np.abs(mix) > c * 0.8, np.sign(mix) * (c * 0.8 + (c * 0.2) * np.tanh((np.abs(mix) - c * 0.8) / (c * 0.2))), mix)
    write_wav(os.path.join(OUT, "mix.wav"), mix)
    for nm, x in [("voice", vb * g), ("music", m * g), ("sfx", s * g)]: write_wav(os.path.join(OUT, f"stem_{nm}.wav"), x)
    with open(os.path.join(OUT, "cues.md"), "w") as f:
        f.write(f"# Cues (s)\n\nduration {DUR:.3f} s, integrated {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP\n\n")
        for t, n in sorted(cues): f.write(f"- {t:6.2f}  {n}\n")
    print("done", DUR, "s", round(integrated(mix), 1), "LUFS", round(true_peak(mix), 1), "dBTP")
