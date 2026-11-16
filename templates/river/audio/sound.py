# Sound for "The River That Caught Fire" (Cuyahoga, Cleveland 1969): the user's narration (gain only), an original
# score (1969 groove -> the train pulse -> silence on the spark -> fire stab -> cheeky plucks and a sad brass fall on
# "photo" -> light vibes for the explanation -> a rising build to "Act" -> a warm golden ending) ducked under the
# voice, and synthesized SFX timed to the words.
# Standard mix: music +3 dB, SFX -6 dB relative to the bed defaults; voice unchanged. Master to -15 LUFS, <= -1 dBTP.
# usage: python sound.py  -> ../out/{mix.wav, stem_*.wav, cues.md}
import os, json, math
import numpy as np
from scipy import signal
from dsp import SR, ns, dbg, read_wav, write_wav, integrated, true_peak, pan, st, lp, hp, bp, rng, phase, tt
import instruments as I
import sfx_gen as X

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out"); os.makedirs(OUT, exist_ok=True)
WJ = json.load(open(os.path.join(HERE, "..", "voice", "words.json")))
WS = [w["s"] for w in WJ["words"]]
FR = math.ceil((WJ["duration"] + 0.8) * 30)   # = TOTAL in story.ts (VOICE_DUR includes a 0.8 s tail)
DUR = FR / 30.0
N = ns(DUR)
w = lambda i: WS[i]
SPARK0 = w(71) - 0.05
LAND = w(72) + 0.32
OUT0, OUT1 = w(80) - 0.1, w(88) + 0.3
FLASH, DUST, SEAL, PHONE = w(98) - 0.04, w(116) - 0.05, w(163) - 0.06, w(180) + 0.12
cues = []

def add(buf, x, t, g_db=0.0, p=0.0, name=None):
    x = np.asarray(x, float)
    x = pan(x, p) if x.ndim == 1 else x
    i = ns(max(0.0, t)); j = min(N, i + x.shape[1])
    if j > i: buf[:, i:j] += x[:, : j - i] * dbg(g_db)
    if name: cues.append((round(t, 2), name))

def env_seg(n, a, r_):
    e = np.ones(n); ka, kr = min(n, ns(a)), min(n, ns(r_))
    if ka: e[:ka] = np.linspace(0, 1, ka)
    if kr: e[-kr:] *= np.linspace(1, 0, kr)
    return e

def fire_bed(dur, r, roar=1.0):
    """fire: low roar (filtered noise, slow swell) + crackle (sparse sharp pops)"""
    n = ns(dur)
    ro = lp(hp(r.standard_normal(n), 60), 600) * (0.6 + 0.4 * np.abs(np.sin(np.arange(n) / SR * 1.3))) * roar
    cr = np.zeros(n)
    k = int(dur * 40)
    for _ in range(k):
        i = r.integers(0, max(1, n - 2000)); L = r.integers(120, 900)
        cr[i:i + L] += hp(r.standard_normal(L), 2500) * np.exp(-np.arange(L) / (L / 4)) * r.uniform(0.3, 1.2)
    return st(ro * 0.5 + cr * 0.35)

def hiss(dur, r, f0=2500):
    n = ns(dur); return hp(r.standard_normal(n), f0) * env_seg(n, 0.05, 0.3)

def horn(dur, r):
    """diesel horn: a two-note chord of buzzy brass"""
    return I.brass(I.m2f(57), dur, 0.8, r, kind="stab", scoop=-30) + I.brass(I.m2f(61), dur, 0.7, r, kind="stab", scoop=-30)

def clack(r):
    d = 0.12; t = tt(d)
    return (bp(r.standard_normal(len(t)), 600, 3500, 1) * np.exp(-t / 0.012) + np.sin(phase(np.full(len(t), 140.0))) * np.exp(-t / 0.03) * 0.8)

def zing(r, f0=2400, f1=5200, d=0.35):
    t = tt(d); f = f0 + (f1 - f0) * (t / d)
    return np.sin(phase(f)) * np.exp(-t / 0.12) * 0.5

def typewriter(dur, r):
    b = np.zeros(ns(dur)); t = 0.0
    while t < dur - 0.1:
        x = X.clink(r, f0=r.uniform(1800, 2600), dur=0.05); i = ns(t); b[i:i + len(x)] += x[: len(b) - i]
        t += r.uniform(0.07, 0.16)
    return b

# ======================= SFX =======================
def sfx():
    b = np.zeros((2, N)); r = rng(17)
    # hook: the burning river (roar + crackle), the whoosh into the flash
    add(b, fire_bed(w(15) + 0.2, r, 1.0), 0.0, -4, name="river fire (hook)")
    add(b, X.whoosh(0.9, r, peak=0.6), w(14) + 0.1, -6, name="whoosh into flash")
    # the Flats: industrial hum, distant clanks, a factory whistle on "smokestack"
    t0, t1 = w(15) - 0.1, w(58)
    add(b, st(lp(r.standard_normal(ns(t1 - t0)), 160) * 0.5), t0, -14, name="mill hum")
    for k in range(9): add(b, X.clink(r, f0=r.uniform(600, 1200), dur=0.2), t0 + 1.2 + k * 1.9, -20, r.uniform(-0.6, 0.6))
    add(b, I.brass(I.m2f(74), 1.4, 0.6, r, kind="horn") + I.brass(I.m2f(79), 1.4, 0.5, r, kind="horn"), w(30) - 0.1, -14, 0.3, name="factory whistle")
    # pipes: oil glug, grease glop, drifting junk knocks, a gull
    add(b, X.bubbles(w(37) - w(31), r, 9, f_lo=120, f_hi=420), w(31), -8, -0.2, name="oil glugs")
    add(b, X.bubbles(w(39) - w(37), r, 7, f_lo=90, f_hi=300), w(37), -7, 0.2, name="grease glops")
    for k in range(6): add(b, X.stroll_step(r, 0.2), w(40) + k * 0.5, -12, r.uniform(-0.5, 0.5))
    add(b, X.bird_chirps(1.0, r, density=0.6, kind="sparrow"), w(45), -16, 0.3, name="gull")
    add(b, X.water_bed(w(49) - w(39), r, close=0.3, slosh_rate=0.2), w(39), -18)
    # tally: chalk scratches
    for k in range(3): add(b, X.rattle(0.35, r, density=60), w(54) + k * 0.45, -16, 0.2, name="chalk" if k == 0 else None)
    # the train: rumble + wheel clacks over the trestle, the horn
    tt0, tt1 = w(58) - 0.2, w(80)
    n = ns(tt1 - tt0)
    add(b, st(lp(r.standard_normal(n), 220) * env_seg(n, 1.0, 1.5)), tt0, -8, name="train rumble")
    k, t = 0, tt0 + 0.3
    while t < w(72) + 0.5: add(b, clack(r), t, -12 if k % 2 else -9, 0.1); t += 0.23 if k % 2 == 0 else 0.45; k += 1
    add(b, horn(1.1, r), w(59) - 0.1, -12, -0.3, name="diesel horn")
    for k in range(5): add(b, X.creak(0.5, r, rate0=50, rate1=80, scale=0.6), w(66) + k * 0.4, -14, 0.2, name="trestle creaks" if k == 0 else None)
    # the spark: wheel screech + zing, a tiny tick when it lands, then the ignition whoosh
    add(b, X.chain_groan(0.6, r, 0.3, 0.6), SPARK0 - 0.2, -14)
    add(b, zing(r), SPARK0, -8, name="spark zing")
    add(b, X.clink(r, f0=4200, dur=0.05), LAND, -14, name="spark lands")
    add(b, X.whoosh(1.4, r, peak=0.9, f_lo=200, f_hi=1500), w(73) - 0.4, -2, name="whoomph")
    tf0 = w(73); add(b, fire_bed(OUT1 + 1.0 - tf0, r, 1.4) * np.linspace(1, 0.2, ns(OUT1 + 1.0 - tf0))[None, :], tf0, -3, name="fire")
    # fireboat: engine putter, water cannon hiss, steam sizzle as it goes out
    add(b, st(lp(r.standard_normal(ns(4.0)), 90) * (0.6 + 0.4 * np.sin(np.arange(ns(4.0)) / SR * 2 * np.pi * 9))), w(80) - 0.3, -12, name="boat engine")
    add(b, st(hiss(OUT1 - w(80), r, 900)), w(80) + 0.9, -9, name="water cannon")
    add(b, st(hiss(3.0, r, 3500)), w(85), -12, name="steam sizzle")
    add(b, X.clink(r, f0=3000, dur=0.03), w(87), -14); add(b, X.clink(r, f0=3200, dur=0.03), w(87) + 0.5, -14)
    # the photographer: running steps, panting, the flash pop + whine
    for k in range(9): add(b, X.stroll_step(r, 0.6), w(89) + k * 0.24, -11, 0.3 - 0.06 * k, name="running" if k == 0 else None)
    add(b, zing(r, 6000, 9000, 0.6) * 0.5, FLASH - 0.5, -18, name="flash charge")
    add(b, X.push_thump(r) * 0.5, FLASH, -6, name="flash pop"); add(b, X.clink(r, f0=5200, dur=0.06), FLASH, -8)
    add(b, st(lp(r.standard_normal(ns(w(99) - w(89))), 300) * 0.3), w(89), -22)
    # newsroom: typewriter, a drawer, the dust puff
    add(b, typewriter(2.2, r), w(99) - 0.1, -14, -0.2, name="typewriter")
    add(b, X.creak(0.5, r, rate0=40, rate1=60, scale=0.5), w(106), -14, 0.3, name="drawer")
    add(b, X.whoosh(0.5, r, peak=0.1, f_lo=1500, f_hi=4000), DUST - 0.05, -10, name="blow dust")
    # kitchen: match strike, falling, the hiss in the water; soup spoon clink
    add(b, hiss(0.25, r, 3000), w(119) - 0.3, -10, name="match strike")
    add(b, X.bubbles(0.15, r, 30, f_lo=500, f_hi=1200), w(123) - 0.05, -10)
    add(b, hiss(0.8, r, 4000), w(123), -9, name="match hisses out")
    add(b, X.clink(r, f0=2600, dur=0.2), w(128), -12, 0.2, name="spoon")
    add(b, X.bubbles(1.5, r, 6, f_lo=120, f_hi=360), w(135) + 0.2, -10, name="oil pours")
    # readers gasp, signing: pen scratch + stamp
    add(b, X.whoa(r, dur=0.4), w(147) - 0.05, -14, -0.3, name="gasp"); add(b, X.whoa(r, dur=0.35), w(147) + 0.15, -15, 0.3)
    add(b, X.rattle(1.6, r, density=40), w(151), -20, 0.1, name="pen scratch")
    add(b, X.rattle(1.4, r, density=40), w(160), -18, 0.1)
    add(b, X.push_thump(r), SEAL, -3, name="seal stamp")
    # today: birds, gentle water, crickets, the fish splash, the phone shutter
    tE = w(164) - 0.3
    add(b, X.bird_chirps(DUR - tE, r, density=0.35), tE, -18, -0.3)
    add(b, X.crickets(DUR - tE, r, voices=2), tE, -24)
    add(b, X.water_bed(DUR - tE, r, close=0.4, slosh_rate=0.3), tE, -16)
    add(b, X.bubbles(0.4, r, 20, f_lo=300, f_hi=1200), w(175) - 0.2, -8, 0.2, name="fish splash")
    add(b, X.clink(r, f0=3800, dur=0.03), PHONE, -10, name="phone shutter"); add(b, X.clink(r, f0=3000, dur=0.04), PHONE + 0.06, -12)
    return b

# ======================= MUSIC =======================
def music():
    b = np.zeros((2, N)); r = rng(23)
    bpm = 104; beat = 60 / bpm
    # A: 1969 groove (plucked bass line + soft pad stabs + brushes), from the flash to the train
    tA0, tA1 = w(15) - 0.05, w(58) - 0.1
    bass = [38, 38, 50, 48, 45, 45, 43, 41]  # D minor walk
    t, k = tA0, 0
    while t < tA1:
        add(b, I.pluck(I.m2f(bass[k % 8]), 0.75, r, dur=0.45, bright=0.25), t, -6)
        if k % 2 == 1: add(b, I.brush(0.4, r, dur=0.2), t, -16, 0.3)
        if k % 4 == 0: add(b, I.pad([I.m2f(62), I.m2f(65), I.m2f(69)], beat * 1.6, 0.4, r, att=0.03, rel=0.2, warm=1800), t, -14, -0.2)
        if k % 8 == 6: add(b, I.vibes(I.m2f(74 + (k // 8 % 2) * 3), 0.5, r, dur=0.8), t, -14, 0.4)
        t += beat / 2 if k % 2 else beat / 2; k += 1
    # hook bed: low tense pad under the opening fire
    add(b, I.pad([I.m2f(38), I.m2f(45), I.m2f(50)], w(15), 0.5, r, att=0.3, rel=0.4, warm=500), 0.0, -8, name="hook bed")
    # B: the train: a ticking pulse that tightens, then stops dead on "spark"
    t, k = w(58), 0
    while t < SPARK0 - 0.1:
        add(b, I.pluck(I.m2f(38 if k % 4 else 50), 0.6, r, dur=0.3, bright=0.2), t, -9)
        add(b, I.brush(0.3, r, dur=0.15), t + beat / 4, -18)
        t += beat / 2 * (0.95 if t > w(66) else 1.0); k += 1
    for tr, vr in I.snare_roll(w(70) - 0.1, SPARK0 - 0.05, 0.1, 0.5, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -16)
    # C: flames: a big brass stab + timpani on "flames", then a low churning bed while it burns
    add(b, I.brass(I.m2f(50), 0.9, 0.95, r, kind="stab") + I.brass(I.m2f(53), 0.9, 0.9, r, kind="stab") + I.brass(I.m2f(57), 0.9, 0.85, r, kind="stab"), w(79) - 0.05, -4, name="flames stab")
    add(b, I.timpani(I.m2f(38), 1.0, r, dur=2.0), w(79) - 0.05, -4)
    add(b, I.cymbal(0.6, r, dur=2.0), w(79) - 0.05, -14)
    # D: "Luckily" cheeky pizzicato -> "Unluckily" sad brass fall on "photo"
    t, k = w(80) - 0.05, 0
    pz = [62, 66, 69, 66, 64, 67, 71, 67]
    while t < w(89) - 0.2:
        add(b, I.pluck(I.m2f(pz[k % 8]), 0.55, r, dur=0.3, bright=0.5), t, -9, (k % 2) * 0.4 - 0.2); t += beat / 2; k += 1
    t, k = w(89) - 0.05, 0
    while t < w(97):
        add(b, I.pluck(I.m2f([60, 58, 56, 55][k % 4]), 0.5, r, dur=0.5, bright=0.3), t, -10); t += beat; k += 1
    add(b, I.brass(I.m2f(55), 1.3, 0.7, r, kind="soft", fall=-5.0) * 1.0, FLASH + 0.05, -6, name="sad trombone fall")
    # E: newsroom + explanation: light vibes and pizzicato, a little sly
    tE0, tE1 = w(99) - 0.1, w(146) - 0.3
    seq = [69, 72, 76, 74, 72, 76, 79, 77, 76, 72, 74, 71, 69, 72, 76, 81]
    t, k = tE0, 0
    while t < tE1:
        add(b, I.vibes(I.m2f(seq[k % 16]), 0.45, r, dur=1.0), t, -11, (k % 3 - 1) * 0.3)
        if k % 2 == 0: add(b, I.pluck(I.m2f([45, 41, 43, 40][(k // 4) % 4]), 0.6, r, dur=0.5, bright=0.2), t, -10)
        t += beat * 0.75; k += 1
    add(b, I.glock(I.m2f(88), 0.6, r), DUST, -10, name="1952 ding")
    # F: consequence: rising pad + snare roll to a brass chord on "Act"
    tF0 = w(146) - 0.1
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(62)], SEAL - tF0, 0.5, r, att=2.0, rel=0.3, warm=1200), tF0, -8, name="rising build")
    t, k = tF0, 0
    while t < SEAL - 0.2:
        add(b, I.pluck(I.m2f([38, 43, 45, 47][(k // 4) % 4]), 0.65, r, dur=0.35, bright=0.3), t, -9); t += beat / 2; k += 1
    for tr, vr in I.snare_roll(SEAL - 2.2, SEAL - 0.03, 0.15, 0.85, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -12)
    add(b, I.brass(I.m2f(50), 1.6, 0.9, r, kind="horn") + I.brass(I.m2f(54), 1.6, 0.85, r, kind="horn") + I.brass(I.m2f(57), 1.6, 0.85, r, kind="horn"), SEAL, -5, name="Act chord")
    add(b, I.cymbal(0.7, r, dur=2.4), SEAL, -12)
    # G: today: warm pad + vibes melody, final chord
    tG0 = w(164) - 0.2
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(66), I.m2f(69)], DUR - tG0 - 0.3, 0.55, r, att=1.0, rel=1.0, warm=1400), tG0, -8, name="golden ending")
    gm = [74, 78, 81, 79, 78, 76, 74, 73, 74]
    for k, n_ in enumerate(gm): add(b, I.vibes(I.m2f(n_), 0.5, r, dur=1.5), tG0 + 0.4 + k * 0.6, -10, (k % 3 - 1) * 0.3)
    add(b, I.glock(I.m2f(86), 0.6, r), PHONE, -12)
    add(b, I.vibes(I.m2f(74), 0.6, r, dur=2.0), DUR - 1.6, -9)
    return b

def duck_curve():
    """music dips -3 dB under every spoken word (keyed on the word times)"""
    g = np.zeros(N)
    for wd in WJ["words"]: g[ns(wd["s"]):ns(wd["e"])] = 1
    k = ns(0.3); g = np.convolve(g, np.ones(k) / k, "same").clip(0, 1)
    return dbg(-3.0 * g)

if __name__ == "__main__":
    v, sr = read_wav(os.path.join(HERE, "..", "voice", "voice.wav"))
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
    if tp > -1.2:
        c = dbg(-1.2); mix = np.where(np.abs(mix) > c * 0.8, np.sign(mix) * (c * 0.8 + (c * 0.2) * np.tanh((np.abs(mix) - c * 0.8) / (c * 0.2))), mix)
    write_wav(os.path.join(OUT, "mix.wav"), mix)
    for nm, x in [("voice", vb * g), ("music", m * g), ("sfx", s * g)]: write_wav(os.path.join(OUT, f"stem_{nm}.wav"), x)
    with open(os.path.join(OUT, "cues.md"), "w") as f:
        f.write(f"# Cues (s)\n\nduration {DUR:.3f} s, integrated {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP\n\n")
        for t, n in sorted(cues): f.write(f"- {t:6.2f}  {n}\n")
    print("done", DUR, "s", round(integrated(mix), 1), "LUFS", round(true_peak(mix), 1), "dBTP")
