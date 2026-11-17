# Sound for "The Volcano That Didn't Erupt" (Tangiwai, Christmas Eve 1953): the user's narration (gain only), an
# original score (low dread under the hook -> a gentle music-box carol of our own for the express -> a cold high
# pad on the summit -> a driving low ostinato for the lahar that stops dead on "Too late." -> silence and a soft pad
# for the dead -> a hopeful rising figure for the rescue -> cheeky pizzicato for the bathtub -> a warm, safe ending),
# ducked under the voice, and synthesized SFX timed to the words. Standard mix: music +3 dB, SFX -6 dB; voice
# unchanged; the SFX bed passes sfx_ceiling() so nothing is ever annoying. Master -15 LUFS, <= -1 dBTP.
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
FR = math.ceil((WJ["duration"] + 0.9) * 30)   # = TOTAL in story.ts
DUR = FR / 30.0
N = ns(DUR)
w = lambda i: WS[i]
T_HIT, T_RIP = w(81), w(86) + 0.05
T_BRAKE, T_EDGE = w(109) - 0.15, w(118) - 0.3
T_IMPACT = T_EDGE + 0.75
T_FALL6 = w(148) - 0.3
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

def roar(dur, r, f=500, att=0.4, rel=0.8, body=1.0):
    """a lahar: low churn + mid hiss of water and grinding gravel (hiss low-passed at 3.5 kHz)"""
    n = ns(dur)
    lo = lp(r.standard_normal(n), 140) * 3.0 * body
    mid = lp(bp(r.standard_normal(n), 200, f * 4), 3500) * (0.8 + 0.2 * np.sin(np.arange(n) / SR * 2 * np.pi * 0.7))
    return st((lo + mid * 0.8) * env_seg(n, att, rel))

def boom(r, dur=0.9, f=110, k=4.0):
    n = ns(dur); return st(lp(r.standard_normal(n), f) * np.exp(-np.arange(n) / SR / (dur * 0.3)) * k)

def chuffs(dur, r, rate=5.0, level=1.0):
    """steam exhaust: rhythmic breathy bursts"""
    n = ns(dur); x = np.zeros(n); t = 0.0; k = 0
    while t < dur:
        m = ns(0.12); s = bp(r.standard_normal(m), 250, 1800) * np.exp(-np.arange(m) / SR / 0.04) * (1.0 if k % 2 == 0 else 0.7)
        i = ns(t); j = min(n, i + m); x[i:j] += s[: j - i]; t += 1 / rate; k += 1
    return st(lp(x, 3500) * level)

def clacks(dur, r, period=0.55):
    """rail joints: a pair of soft clicks per joint"""
    b = np.zeros((2, ns(dur))); t = 0.1
    while t < dur - 0.2:
        for dt in (0.0, 0.12):
            c = X.clink(r, f0=r.uniform(700, 1000), dur=0.06, bright=0.4)
            i = ns(t + dt); j = min(b.shape[1], i + len(c)); b[:, i:j] += c[: j - i] * 0.5
        t += period
    return b

def whistle_chime(dur, r, f0=440):
    t = tt(dur); e = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.25)
    x = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 5.5 * t)) for f in (f0, f0 * 1.26, f0 * 1.5)) / 3
    x = x + 0.15 * bp(r.standard_normal(len(t)), f0, f0 * 3)
    return lp(x * e, 3000)

def squeal(dur, r, f0=1900):
    t = tt(dur); f = f0 * (1 - 0.12 * t / dur) + 40 * np.sin(2 * np.pi * 11 * t)
    return lp(np.sin(phase(f)) * np.minimum(1, t / 0.05) * np.exp(-t / (dur * 0.7)) * 0.3 + 0.08 * hp(r.standard_normal(len(t)), 2500), 3800)

def hiss(dur, r, f0=1500):
    n = ns(dur); return lp(hp(r.standard_normal(n), f0), 3600) * env_seg(n, 0.03, 0.3)

def siren(dur, r):
    t = tt(dur); f = 700 + 350 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 1.8))
    x = np.sin(phase(f)) + 0.3 * np.sin(phase(2 * f)) + 0.15 * np.sin(phase(3 * f))
    return lp(x * env_seg(len(t), 0.2, 0.3), 3500) * 0.4

def engine(dur, r, f0=30, rough=0.5):
    n = ns(dur); t = np.arange(n) / SR; f = np.full(n, f0)
    x = np.sign(np.sin(phase(f))) * 0.3 + rough * lp(r.standard_normal(n), 300) * (0.5 + 0.5 * np.sin(phase(f)))
    return lp(x, 800) * env_seg(n, 0.2, 0.4)

def glass(r):
    n = ns(0.6); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / r.uniform(0.05, 0.2)) * r.uniform(0.3, 1) for f in r.uniform(2200, 3600, 7))
    return lp(x * 0.25 + hp(r.standard_normal(n), 2000) * np.exp(-t / 0.06) * 0.5, 3800)

def crickets_soft(dur, r):
    return st(lp(X.crickets(dur, r, voices=3), 3800))

# ======================= SFX =======================
def sfx():
    b = np.zeros((2, N)); r = rng(41)
    # 1 hook: the bore hits the bridge, the pier cracks, a span drops; whoosh into the flash
    add(b, roar(w(10), r, 400, 0.2, 0.6), 0.0, -4, name="lahar roar (hook)")
    add(b, boom(r, 0.9, 120, 4), 0.86, -6, name="bore hits piers")
    add(b, X.splash_big(r), 0.9, -8)
    add(b, X.timber_tear(r, 0.9), T_RIP - T_HIT + 0.9 - 0.05, -10, 0.2, name="pier cracks")
    add(b, X.whoosh(0.8, r, peak=0.6, f_lo=200, f_hi=1200), w(12), -8, name="whoosh into flash")
    add(b, X.breeze(w(13) - w(10), r, level=0.6, gust=0.1, bright=500), w(10), -16, name="night wind (mountain)")
    # 2 the express: chuffs, rail joints, the chime whistle; inside: rumble, chatter, a laugh
    add(b, chuffs(w(20) - w(13) + 0.3, r, 5.5), w(13), -10, -0.2, name="Ka chuffing")
    add(b, clacks(w(20) - w(13), r, 0.6), w(13), -14, 0.2)
    add(b, whistle_chime(1.1, r, 415), w(15) - 0.1, -12, -0.3, name="chime whistle")
    add(b, st(lp(r.standard_normal(ns(w(29) - w(20))), 200) * 0.6), w(20), -14, name="carriage rumble")
    add(b, clacks(w(29) - w(20), r, 0.6) * 0.7, w(20), -18)
    add(b, st(X.babble(w(29) - w(20) - 0.4, r, base=190, scale=1.0, rate=4.0, active=0.5)), w(20) + 0.2, -22, name="passengers chatting")
    # 3 the quiet river: crickets, a trickle
    add(b, crickets_soft(w(38) - w(29) + 0.3, r), w(29), -22, name="crickets")
    add(b, X.water_bed(w(38) - w(29), r, close=0.4, slosh_rate=0.6), w(29), -18, name="trickle")
    # 4 the summit: high wind, lapping, the seep, crumbs of ash
    add(b, X.breeze(w(59) - w(38), r, level=1.0, gust=0.3, bright=800), w(38), -14, name="summit wind")
    add(b, X.water_bed(w(59) - w(52), r, close=0.5, slosh_rate=0.8), w(52), -18, name="seep")
    add(b, X.rattle(w(59) - w(52), r, density=6), w(52), -22, 0.2)
    # 5 the wall gives way
    add(b, X.timber_tear(r, 1.0), w(63) - 0.15, -8, name="dam cracks")
    add(b, boom(r, 1.2, 90, 4), w(63) - 0.05, -6, name="BOOM")
    add(b, roar(w(65) - w(63) + 0.6, r, 600, 0.15, 0.4), w(63), -4, name="burst roar")
    # 6 the lahar down the gorge: roar, tumbling boulders, ice
    add(b, roar(w(80) - w(65) + 0.3, r, 450, 0.3, 0.3, 1.2), w(65), -2, name="lahar roar")
    add(b, st(X.rattle(w(80) - w(65), r, density=45, heavy=True)), w(65), -10, name="boulders grinding")
    for k in range(5): add(b, X.clink(r, f0=r.uniform(1400, 2200), dur=0.2, bright=0.5), w(78) + k * 0.18, -18, r.uniform(-0.5, 0.5), name="ice" if k == 0 else None)
    # 7 the hit: boom, splash, the pier torn out, a span crashing
    add(b, roar(w(90) - w(80) + 0.4, r, 450, 0.2, 0.6), w(80), -3)
    add(b, boom(r, 1.0, 120, 4), T_HIT - 0.03, -4, name="hits the bridge")
    add(b, X.splash_big(r), T_HIT, -6)
    add(b, X.timber_tear(r, 1.1), T_RIP - 0.05, -8, name="pier ripped out")
    add(b, X.clink(r, f0=320, dur=0.8, bright=0.6) * 1.5, T_RIP + 0.8, -10, -0.2, name="span clang")
    add(b, X.splash_big(r), T_RIP + 0.95, -8)
    # 8-9 ten minutes later: the river roaring on, a far chuff and whistle; Ellis's truck, his running feet
    add(b, roar(w(113) - w(90), r, 400, 0.6, 0.4, 0.6), w(90), -12, name="flood roar (steady)")
    add(b, chuffs(w(96) - w(90) + 0.3, r, 6.0, 0.5), w(90), -16, 0.3, name="far chuffs")
    add(b, whistle_chime(1.4, r, 415) * 0.5, w(93), -14, 0.3)
    add(b, engine(w(101) - w(96), r, 28, 0.4) * 0.4, w(96), -20, -0.2, name="truck idling")
    t = w(101); k = 0
    while t < w(107) + 0.2: add(b, X.stroll_step(r, scuff=0.8), t, -14, 0.1 * (k % 2) - 0.05, name="running steps" if k == 0 else None); t += 0.28; k += 1
    add(b, chuffs(w(108) - w(101) + 0.2, r, 7.0, 1.0) * np.linspace(0.3, 1.2, ns(w(108) - w(101) + 0.2))[None, :], w(101), -10, 0.4, name="train bearing down")
    add(b, whistle_chime(1.0, r, 415), w(104), -10, 0.4)
    # 10 brakes: squeal and hiss, sparks
    add(b, squeal(w(113) - T_BRAKE + 1.0, r), T_BRAKE, -12, name="brakes squeal")
    add(b, hiss(1.2, r, 1500), T_BRAKE + 0.1, -14, -0.2, name="brake hiss")
    add(b, clacks(w(113) - w(108), r, 0.35), w(108), -16)
    # 11 the plunge: steel crunch, splash, steam; then only the river
    add(b, X.timber_tear(r, 1.0), T_EDGE + 0.2, -8, name="engine goes over")
    add(b, boom(r, 1.4, 100, 5), T_IMPACT, -4, name="engine hits the river")
    add(b, X.splash_big(r), T_IMPACT + 0.05, -5)
    add(b, hiss(2.0, r, 900) * np.linspace(1, 0, ns(2.0)), T_IMPACT + 0.2, -14, name="steam")
    for k in range(3): add(b, X.splash_big(r), T_IMPACT + 0.7 + k * 0.55, -10 - 2 * k, 0.2 * k)
    add(b, roar(w(128) - w(122) + 0.3, r, 350, 0.3, 0.5, 0.5), w(122), -16, name="river (quiet beat)")
    # 12 the carriage on the edge creaking; inside; it falls
    add(b, roar(w(150) - w(128), r, 350, 0.5, 0.3, 0.5), w(128), -16)
    for k in range(3): add(b, X.creak(0.8, r, rate0=40, rate1=60, scale=0.9), w(129) + k * 0.95, -12, 0.2 * k - 0.2, name="carriage creaks" if k == 0 else None)
    add(b, X.creak(0.9, r, rate0=50, rate1=80), w(143), -12, name="it tips")
    add(b, X.timber_tear(r, 0.8), T_FALL6 + 0.2, -8, name="coupling snaps")
    add(b, boom(r, 1.0, 120, 4), T_FALL6 + 0.85, -5, name="carriage hits")
    add(b, X.splash_big(r), T_FALL6 + 0.9, -6)
    # 13 the window smashes; water rushing past the carriage
    add(b, roar(w(162) - w(150), r, 350, 0.3, 0.6, 0.5), w(150), -16)
    add(b, glass(r), w(151) + 0.1, -8, name="window smashes")
    add(b, X.water_bed(w(162) - w(152), r, close=0.8, slosh_rate=1.2), w(152), -16)
    # 14 the bathtub: a drip, the plug wearing, the drain gurgling; the duck squeaks
    for k in range(4): add(b, X.clink(r, f0=1800, dur=0.08, bright=0.3), w(163) + k * 1.4, -20, 0.2, name="tap drips" if k == 0 else None)
    add(b, X.water_bed(w(175) - w(162), r, close=0.6, slosh_rate=0.5), w(162), -20)
    add(b, X.bubbles(w(180) - w(176) + 0.2, r, rate=6, f_lo=300, f_hi=1500), w(176), -16, name="plug wears")
    add(b, X.bubbles(w(187) - w(180), r, rate=40, f_lo=150, f_hi=1200), w(180), -10, name="drain gurgles")
    add(b, X.swing_squeak(r, 0.6), w(183), -16, 0.2, name="duck squeak")
    add(b, X.breeze(w(190) - w(187) + 0.3, r, level=0.5, gust=0.1, bright=500), w(187), -18)
    # 15 day: birds, breeze, the fitter's taps
    tD = w(190) - 0.2
    add(b, X.bird_chirps(w(198) - tD, r, density=0.4), tD, -18, -0.3, name="day birds")
    add(b, X.breeze(w(198) - tD, r, level=0.6), tD, -20)
    for k in range(6): add(b, X.hammer_hit(r, 0.4), w(191) + k * 0.45, -18, 0.2)
    # 16 2007: the dam goes again; the bigger wave
    add(b, boom(r, 1.2, 90, 4), w(202) - 0.05, -6, name="2007 breach")
    add(b, roar(w(209) - w(201) + 0.3, r, 550, 0.2, 0.3, 1.3), w(201), -3, name="2007 lahar")
    # 17 the alarm, the held train idling, the wave going by, everyone safe
    add(b, siren(w(217) - w(209) + 0.5, r), w(209) + 0.1, -12, -0.2, name="alarm siren")
    add(b, engine(w(217) - w(214) + 0.4, r, 34, 0.4) * 0.6, w(214) - 0.2, -16, 0.2, name="diesel idling")
    add(b, roar(DUR - w(209), r, 500, 0.4, 1.2, 1.0), w(209), -8, name="wave passes")
    add(b, X.bird_chirps(DUR - w(217), r, density=0.3), w(217), -20, 0.3)
    return b

# ======================= MUSIC =======================
def music():
    b = np.zeros((2, N)); r = rng(43)
    bpm = 92; beat = 60 / bpm
    # hook: low dread + timpani on "volcano" and "erupting"
    add(b, I.pad([I.m2f(38), I.m2f(45), I.m2f(50)], w(13), 0.5, r, att=0.3, rel=0.4, warm=500), 0.0, -8, name="hook dread")
    add(b, I.timpani(I.m2f(38), 1.0, r, dur=2.0), w(5) - 0.03, -4)
    add(b, I.timpani(I.m2f(36), 0.9, r, dur=2.2), w(12) - 0.03, -5); add(b, I.cymbal(0.5, r, dur=1.6), w(12) - 0.03, -15)
    # A: the express: a music-box carol of our own over a plucked bass, with sleigh-like triangle ticks
    tA0, tA1 = w(13), w(38) - 0.1
    mel = [76, 74, 72, 74, 76, 76, 76, 79, 77, 76, 74, 72, 74, 76, 74, 72]
    bass = [48, 43, 45, 41]
    t, k = tA0, 0
    while t < tA1:
        add(b, I.pluck(I.m2f(bass[(k // 4) % 4]), 0.6, r, dur=0.5, bright=0.2), t, -9) if k % 2 == 0 else None
        add(b, I.musicbox(I.m2f(mel[k % 16]), 0.5, r, dur=1.1), t, -11, -0.25)
        if k % 2 == 1: add(b, I.triangle(0.25, r, dur=0.4), t, -24, 0.4)
        t += beat; k += 1
    add(b, I.pad([I.m2f(48), I.m2f(55), I.m2f(64)], tA1 - tA0, 0.3, r, att=1.0, rel=0.6, warm=1100), tA0, -18)
    # B: the summit: cold high pad, a slow low pulse, a crack of timpani on "gave way"
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(64), I.m2f(69)], w(63) - w(38) + 0.2, 0.4, r, att=1.0, rel=0.3, warm=1600), w(38) - 0.1, -12, name="summit pad")
    t = w(38)
    while t < w(63) - 0.2: add(b, I.pluck(I.m2f(38), 0.5, r, dur=0.6, bright=0.1), t, -12); t += beat * 2
    for tr, vr in I.snare_roll(w(61) - 0.2, w(63) - 0.08, 0.1, 0.6, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -16)
    add(b, I.timpani(I.m2f(36), 1.0, r, dur=2.5), w(63) - 0.05, -3); add(b, I.cymbal(0.7, r, dur=2.0), w(63) - 0.05, -13)
    # C: the lahar and the train: a driving low brass ostinato that tightens and stops dead on "Too late."
    t, k = w(65) - 0.05, 0
    ost = [38, 38, 41, 38, 43, 41, 40, 38]
    while t < w(111) - 0.1:
        up = 0 if t < w(90) else 2 if t < w(101) else 4
        add(b, I.brass(I.m2f(ost[k % 8] + up), beat / 2 * 0.85, 0.7, r, kind="tuba"), t, -9)
        if k % 2 == 0: add(b, I.timpani(I.m2f(38 + up), 0.45, r, dur=0.5), t, -15)
        if t > w(101) and k % 2 == 1: add(b, I.snare(0.35, r, dur=0.12), t, -18)
        t += beat / 2 * (0.9 if t > w(101) else 1.0); k += 1
    add(b, I.brass(I.m2f(50), 0.6, 0.9, r, kind="stab") + I.brass(I.m2f(53), 0.6, 0.85, r, kind="stab"), T_HIT - 0.03, -6, name="hit stab")
    # D: silence on "Too late.", then a low, soft pad for the 151, no percussion
    add(b, I.pad([I.m2f(41), I.m2f(48), I.m2f(53), I.m2f(56)], w(128) - w(113) + 0.6, 0.4, r, att=1.5, rel=1.2, warm=600), w(113), -11, name="quiet pad (151)")
    add(b, I.vibes(I.m2f(65), 0.3, r, dur=3.0), w(124), -18)
    # E: "Luckily": tense pizzicato on the edge; inside; the fall
    t, k = w(128), 0
    while t < w(146):
        add(b, I.pluck(I.m2f([62, 65, 62, 64][k % 4]), 0.45, r, dur=0.25, bright=0.4), t, -13, (k % 2) * 0.4 - 0.2); t += beat / 2; k += 1
    add(b, I.timpani(I.m2f(38), 0.9, r, dur=1.8), T_FALL6 + 0.85, -6)
    # F: the rescue: a hopeful rising figure
    for k, n_ in enumerate([62, 66, 69, 74, 78]): add(b, I.vibes(I.m2f(n_), 0.5, r, dur=1.4), w(150) + k * 0.55, -11, (k % 2) * 0.4 - 0.2)
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(62), I.m2f(66)], w(162) - w(150) + 0.4, 0.4, r, att=0.8, rel=0.6, warm=1300), w(150), -13, name="rescue pad")
    # G: the bathtub: cheeky pizzicato, a descending slide when it drains
    t, k = w(162), 0
    while t < w(180) - 0.1:
        add(b, I.pluck(I.m2f([67, 71, 74, 71][k % 4]), 0.5, r, dur=0.3, bright=0.5), t, -12, (k % 2) * 0.4 - 0.2); t += beat / 2; k += 1
    for k, n_ in enumerate([79, 76, 72, 67, 64, 60, 55]): add(b, I.pluck(I.m2f(n_), 0.5, r, dur=0.3, bright=0.5), w(180) + k * 0.18, -11)
    add(b, I.glock(I.m2f(84), 0.5, r), w(188), -14, name="no eruption ding")
    # H: alarms and safety: a warm ending
    tH = w(190) - 0.2
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(66), I.m2f(69)], DUR - tH - 0.2, 0.5, r, att=1.0, rel=1.0, warm=1400), tH, -10, name="warm ending")
    t, k = tH, 0
    while t < w(209):
        add(b, I.pluck(I.m2f([50, 54, 57, 54][k % 4]), 0.5, r, dur=0.4, bright=0.3), t, -12); t += beat; k += 1
    add(b, I.timpani(I.m2f(38), 0.8, r, dur=1.5), w(202) - 0.05, -7)
    gm = [74, 78, 81, 79, 78, 76, 74]
    for k, n_ in enumerate(gm): add(b, I.vibes(I.m2f(n_), 0.5, r, dur=1.5), w(209) + k * 0.65, -11, (k % 3 - 1) * 0.3)
    add(b, I.musicbox(I.m2f(76), 0.5, r, dur=2.0), w(222), -11); add(b, I.musicbox(I.m2f(74), 0.5, r, dur=2.0), w(223) + 0.2, -12)
    add(b, I.musicbox(I.m2f(72), 0.55, r, dur=2.5), w(225), -11, name="carol tag")
    return b

def duck_curve():
    g = np.zeros(N)
    for wd in WJ["words"]: g[ns(wd["s"]):ns(wd["e"])] = 1
    k = ns(0.3); g = np.convolve(g, np.ones(k) / k, "same").clip(0, 1)
    return dbg(-3.0 * g)

def sfx_ceiling(s, vb, margin=9.0, gap_max=-26.0):
    hop = ns(0.05); win = ns(0.4); n = s.shape[1]
    def env(x):
        p = np.convolve((x ** 2).mean(0), np.ones(win) / win, "same")
        return 10 * np.log10(p[::hop] + 1e-12)
    S, V = env(s), env(vb)
    lim = np.where(V > -45, V - margin, gap_max)
    g = np.minimum(0.0, lim - S)
    k = 5; g = np.array([g[max(0, i - k):i + k + 1].min() for i in range(len(g))])
    g = np.convolve(g, np.ones(4) / 4, "same")
    gl = np.interp(np.arange(n), np.arange(len(g)) * hop, g)
    return s * dbg(gl)[None, :]

if __name__ == "__main__":
    v, sr = read_wav(os.path.join(HERE, "..", "voice", "voice.wav"))
    v = np.asarray(v, float); v = v if v.ndim == 1 else v.mean(0) if v.shape[0] <= 2 else v.mean(1)
    if sr != SR: v = signal.resample_poly(v, SR, sr)
    vb = np.zeros((2, N)); vb[:, : min(N, len(v))] = v[:N]
    m = music() * duck_curve()[None, :]
    s = sfx()
    Lv = integrated(vb)
    m *= dbg(Lv - 10 - integrated(m)); s *= dbg(Lv - 10 - integrated(s))
    s = sfx_ceiling(s, vb)
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
