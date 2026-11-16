# Sound for "The 250-Metre Monster Hiding Under London" (Whitechapel fatberg, 2017): the user's narration (gain only),
# an original cheeky-creepy score (low tuba "monster" motif, a street groove, a tense crawl, three big stabs for the
# numbers, a marching crew, a sad trombone after the clang, sly vibes for the chemistry, a snare roll to the seal,
# a warm golden ending) ducked under the voice, and synthesized SFX timed to the words.
# Standard mix: music +3 dB, SFX -6 dB relative to the bed defaults; voice unchanged. Master to -15 LUFS, <= -1 dBTP.
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
FR = math.ceil((WJ["duration"] + 0.8) * 30)
DUR = FR / 30.0
N = ns(DUR)
w = lambda i: WS[i]
# must match story.ts
STRIKE = w(92) + 0.02; LID = w(71) - 0.04; SEAL = w(144) - 0.1; SOAP = w(106) - 0.05
busIn = lambda i: w(58) - 0.1 + i * ((w(60) + 0.25 - w(58)) / 10)
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

def hiss(dur, r, f0=2500):
    n = ns(dur); return hp(r.standard_normal(n), f0) * env_seg(n, 0.05, 0.3)

def traffic(dur, r):
    n = ns(dur); x = lp(r.standard_normal(n), 300) * 0.6 + bp(r.standard_normal(n), 300, 1500, 1) * 0.2
    return st(x * env_seg(n, 0.4, 0.4))

def engine(dur, r, f=38.0, rough=0.3):
    t = tt(dur); x = np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * 2 * t) * 0.3
    x = lp(x + rough * r.standard_normal(len(t)), 500)
    return x * env_seg(len(t), 0.3, 0.4)

def drip(r, f0=None):
    d = 0.18; t = tt(d); f0 = f0 or r.uniform(900, 1600)
    return np.sin(phase(f0 + 1400 * np.exp(-t / 0.02))) * np.exp(-t / 0.05) * 0.6

def echo(x, delay=0.11, fb=0.45, n=5):
    y = x.copy(); k = ns(delay)
    for i in range(1, n):
        if k * i >= len(x): break
        y[k * i:] += x[: len(x) - k * i] * fb ** i
    return y

def squelch(r, dur=0.35):
    t = tt(dur); f = 160 + 260 * (t / dur)
    return lp(np.sin(phase(f)) * (0.6 + 0.4 * r.standard_normal(len(t))) * np.exp(-t / 0.1), 1400) * 0.8

def buzz(dur, r, f0=210.0):
    t = tt(dur); f = f0 * (1 + 0.04 * np.sin(2 * np.pi * 3.3 * t) + 0.02 * np.sin(2 * np.pi * 7.1 * t))
    s = signal.sawtooth(phase(f)) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t))
    return bp(s, 180, 2600, 1) * env_seg(len(t), 0.05, 0.2) * 0.5

def metal_clang(r):
    d = 1.4; t = tt(d); x = np.zeros(len(t))
    for f, a, tau in [(523, 1.0, 0.5), (1187, 0.7, 0.35), (1903, 0.5, 0.25), (2741, 0.35, 0.18), (3911, 0.25, 0.12)]:
        x += a * np.sin(2 * np.pi * f * t * (1 + 0.002 * np.sin(2 * np.pi * 6 * t))) * np.exp(-t / tau)
    x += hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.01) * 0.8
    return x * 0.5

def pop(r, f0=900):
    d = 0.12; t = tt(d); return np.sin(phase(f0 * np.exp(-t / 0.03) + 200)) * np.exp(-t / 0.03)

def gurgle(dur, r, lo=80, hi=400, rate=10):
    return X.bubbles(dur, r, rate, f_lo=lo, f_hi=hi)

# ======================= SFX =======================
def sfx():
    b = np.zeros((2, N)); r = rng(31)
    # hook: street traffic, the bus pulling away; then the drip and hum underground; whoosh into the flash
    add(b, traffic(w(7) + 0.2, r), 0.0, -10, name="street traffic")
    add(b, st(engine(2.2, r, 34)), 0.0, -12, 0.2, name="bus engine")
    for k in range(5): add(b, X.stroll_step(r, 0.3), 0.3 + k * 0.45, -20, -0.3)
    t0 = w(7) - 0.1
    add(b, st(lp(r.standard_normal(ns(w(13) - t0)), 90) * 0.6), t0, -12, name="sewer hum")
    for k in range(3): add(b, echo(drip(r)), t0 + 0.3 + k * 0.6, -14, (k - 1) * 0.4, name="drip" if k == 0 else None)
    add(b, X.whoosh(0.8, r, peak=0.6), w(12) + 0.15, -6, name="whoosh into flash")
    # setting: street ambience, the crawler's cable reel clicking as it goes down the manhole
    add(b, traffic(w(24) - w(13), r), w(13), -14)
    add(b, X.rattle(w(23) - w(17), r, density=18), w(17), -16, 0.2, name="cable reel")
    # crawl: echoey pipe, motor whine, drips, squelches on fat, a thud stop on the wall
    tc0, tc1 = w(24) - 0.1, w(40)
    n = ns(tc1 - tc0)
    add(b, st(lp(r.standard_normal(n), 120) * 0.5), tc0, -12, name="pipe rumble")
    tm = tt(tc1 - tc0); mot = np.sin(phase(np.full(len(tm), 520.0) + 30 * np.sin(2 * np.pi * 2 * tm))) * 0.25 + bp(r.standard_normal(len(tm)), 400, 1200, 1) * 0.15
    add(b, st(mot * env_seg(len(tm), 0.2, 0.4)), tc0, -16, name="crawler motor")
    for k in range(8): add(b, echo(drip(r)), tc0 + 0.4 + k * 0.75, -18, r.uniform(-0.6, 0.6))
    for i in [26, 29, 32, 33, 35]: add(b, squelch(r), w(i) - 0.05, -10, r.uniform(-0.3, 0.3), name="squelch" if i == 26 else None)
    add(b, X.push_thump(r), w(36) - 0.03, -6, name="wall-to-wall thud")
    # length: three heavy thumps on the numbers, eleven pop-ins for the buses
    for i in [47, 54]: add(b, X.push_thump(r), w(i) - 0.04, -4, name=f"thump {i}")
    for i in range(11): add(b, pop(r, 700 + 40 * i), busIn(i), -10, (i - 5) / 8, name="bus pops" if i == 0 else None)
    add(b, st(engine(1.8, r, 34)), busIn(10) + 0.1, -16)
    # flood: water rising gurgle (cutaway), lid rattle + clank, the splash
    add(b, gurgle(w(66) - w(61), r, 60, 300, 14), w(61) - 0.1, -6, name="water rising")
    add(b, X.water_bed(w(66) - w(61), r, close=0.8, slosh_rate=1.2), w(61), -12)
    t = w(68)
    while t < LID - 0.05: add(b, X.clink(r, f0=r.uniform(700, 1000), dur=0.08), t, -12, 0.1); t += r.uniform(0.07, 0.13)
    add(b, X.hammer_hit(r, 0.6), LID, -6, name="lid clank")
    add(b, X.splash_big(r), LID + 0.02, -6, name="spurt")
    add(b, traffic(w(74) - w(66), r), w(66), -18)
    # crew: marching boots on tarmac; then the jet hose hiss + spatter
    t, k = w(74) - 0.1, 0
    while t < w(79) - 0.05: add(b, X.boot(r, 0.6), t, -12, 0.2 if k % 2 else -0.2, name="crew boots" if k == 0 else None); t += 0.28; k += 1
    add(b, st(hiss(w(85) - w(80) + 0.2, r, 700)), w(80) - 0.1, -6, name="jet hose")
    add(b, gurgle(w(85) - w(80), r, 300, 1800, 25), w(80), -14)
    # clang: shovel on concrete-hard fat, a dazed ringing; then tankers whooshing past in the time-lapse
    add(b, metal_clang(r), STRIKE, -2, name="CLANG")
    add(b, X.oof(r, kind="oof"), STRIKE + 0.35, -14)
    for k in range(3): add(b, X.whoosh(1.0, r, peak=0.5, f_lo=150, f_hi=900), w(93) + k * 1.45 - 0.2, -8, (k - 1) * 0.5, name="tankers pass" if k == 0 else None)
    add(b, traffic(w(98) - w(93), r), w(93), -18)
    # explanation: soap pop + bubbles, fat pouring, tap water, bath drip + duck squeak, wipe squish
    add(b, pop(r, 1200), SOAP, -6, name="soap pop"); add(b, X.bubbles(0.8, r, 18, f_lo=900, f_hi=2600), SOAP + 0.05, -14)
    add(b, gurgle(1.6, r, 150, 500, 8), w(107), -10, name="fat pours")
    add(b, hiss(1.2, r, 1800), w(111) - 0.1, -16, name="tap water")
    for k in range(3): add(b, drip(r, 1300), w(118) + k * 0.7, -14)
    add(b, I.whistle([(0.0, 76), (0.12, 81)], r) if hasattr(I, "whistle") and False else pop(r, 1800), w(123), -16, name="duck squeak")
    for k in range(3): add(b, squelch(r, 0.25), w(126) + 0.2 + k * 0.5, -14)
    # ban: pen scratch + stamp
    add(b, X.rattle(SEAL - w(139) - 0.2, r, density=45), w(139), -18, 0.1, name="pen scratch")
    add(b, X.push_thump(r), SEAL, -3, name="seal stamp")
    # museum: room tone, buzzing flies, mould squelches
    add(b, st(lp(r.standard_normal(ns(w(164) - w(145))), 400) * 0.2), w(145), -24)
    for k in range(3): add(b, buzz(w(164) - w(158) - k * 0.2, r, 190 + 30 * k), w(158) - 0.1 + k * 0.2, -14, (k - 1) * 0.5, name="flies" if k == 0 else None)
    for k in range(4): add(b, squelch(r, 0.2), w(161) + k * 0.18, -16)
    # biodiesel: glug glug
    add(b, gurgle(w(170) - w(164) - 0.3, r, 120, 420, 7), w(164) + 0.3, -8, name="fuel glugs")
    # golden ending: evening street, the bus coming down the road, a cheerful horn toot as it passes
    tE = w(170) - 0.2
    add(b, traffic(DUR - tE, r), tE, -18)
    add(b, X.bird_chirps(DUR - tE, r, density=0.3), tE, -22, -0.3)
    add(b, st(engine(DUR - tE, r, 34) * np.linspace(0.6, 1.0, ns(DUR - tE))), tE, -12, name="bus approaching")
    add(b, I.brass(I.m2f(64), 0.35, 0.6, r, kind="stab") + I.brass(I.m2f(68), 0.35, 0.5, r, kind="stab"), w(181) - 0.05, -14, name="bus toot")
    return b

# ======================= MUSIC =======================
def music():
    b = np.zeros((2, N)); r = rng(43)
    bpm = 108; beat = 60 / bpm
    # hook: the monster motif, low tuba creeping under a dark pad
    add(b, I.pad([I.m2f(36), I.m2f(43), I.m2f(48)], w(13), 0.5, r, att=0.4, rel=0.3, warm=500), 0.0, -10, name="hook bed")
    for k, n_ in enumerate([36, 39, 41, 42, 41, 39, 36]): add(b, I.brass(I.m2f(n_), beat * 0.9, 0.7, r, kind="tuba"), 0.2 + k * beat * 0.75, -6)
    # A: street groove (pluck bass + brushes + a whistling top line), flash -> crawler going down
    tA0, tA1 = w(13) - 0.05, w(24) - 0.1
    bass = [41, 41, 48, 46, 43, 43, 45, 46]
    t, k = tA0, 0
    while t < tA1:
        add(b, I.pluck(I.m2f(bass[k % 8]), 0.7, r, dur=0.4, bright=0.25), t, -7)
        if k % 2: add(b, I.brush(0.35, r, dur=0.2), t, -16, 0.3)
        if k % 4 == 0: add(b, I.vibes(I.m2f([72, 76, 77, 72][(k // 4) % 4]), 0.45, r, dur=0.8), t, -14, -0.3)
        t += beat / 2; k += 1
    # B: crawl: ticking low plucks that step up on each "fat", a stab on "wall"
    t, k = w(24), 0
    while t < w(36) - 0.1:
        step = 0 if t < w(27) else 3 if t < w(30) else 6
        add(b, I.pluck(I.m2f(36 + step + (k % 2) * 7), 0.6, r, dur=0.3, bright=0.2), t, -9)
        add(b, I.brush(0.25, r, dur=0.12), t + beat / 4, -20)
        t += beat / 2; k += 1
    add(b, I.pad([I.m2f(42), I.m2f(45), I.m2f(48)], w(36) - w(30), 0.4, r, att=1.5, rel=0.2, warm=900, trem=None), w(30), -14)
    stab = lambda root: I.brass(I.m2f(root), 0.8, 0.95, r, kind="stab") + I.brass(I.m2f(root + 3), 0.8, 0.9, r, kind="stab") + I.brass(I.m2f(root + 6), 0.8, 0.85, r, kind="stab")
    add(b, stab(42), w(36) - 0.04, -5, name="wall-to-wall stab"); add(b, I.timpani(I.m2f(36), 0.9, r, dur=1.6), w(36) - 0.04, -6)
    # C: the numbers: monster tuba stomps on 250, 130, eleven buses
    for i, root in [(46, 36), (53, 38), (58, 41)]:
        add(b, I.brass(I.m2f(root), 0.9, 0.95, r, kind="tuba") + I.brass(I.m2f(root + 12), 0.9, 0.6, r, kind="stab"), w(i) - 0.04, -4, name=f"stomp {i}")
        add(b, I.timpani(I.m2f(root), 0.8, r, dur=1.4), w(i) - 0.04, -8)
    add(b, I.glock(I.m2f(84), 0.6, r), w(60), -12)
    # D: flood: tremolo pad rising, stab on "flood"
    add(b, I.pad([I.m2f(38), I.m2f(45), I.m2f(50)], LID - w(61), 0.5, r, att=2.5, rel=0.1, warm=1200, trem=None), w(61) - 0.1, -9, name="flood tension")
    for tr, vr in I.snare_roll(LID - 1.4, LID - 0.03, 0.1, 0.7, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -16)
    add(b, stab(43), LID, -6, name="flood stab")
    # E: "Luckily": a jaunty march (tuba + snare) for the crew
    t, k = w(74) - 0.05, 0
    mb = [41, 48, 45, 48, 41, 48, 46, 45]
    while t < w(85) - 0.15:
        add(b, I.brass(I.m2f(mb[k % 8] - 12), beat * 0.45, 0.7, r, kind="tuba"), t, -8)
        add(b, I.snare(0.35 if k % 2 else 0.55, r, dur=0.15), t + (beat / 2 if k % 2 else 0), -16)
        if k % 2 == 0: add(b, I.pluck(I.m2f([72, 74, 76, 77][(k // 2) % 4]), 0.5, r, dur=0.3, bright=0.5), t, -12, 0.3)
        t += beat / 2; k += 1
    # F: "Unluckily": the march deflates; sad trombone after the clang; a slow plod for "nine weeks"
    t, k = w(85) - 0.05, 0
    while t < STRIKE - 0.2: add(b, I.pluck(I.m2f([60, 58, 56, 55][k % 4]), 0.5, r, dur=0.5, bright=0.3), t, -10); t += beat; k += 1
    add(b, I.brass(I.m2f(55), 1.4, 0.7, r, kind="soft", fall=-5.0), STRIKE + 0.45, -6, name="sad trombone fall")
    t, k = w(93), 0
    while t < w(98) - 0.1: add(b, I.brass(I.m2f([36, 35, 34, 33][k % 4]), beat * 1.3, 0.6, r, kind="tuba"), t, -9); t += beat * 1.5; k += 1
    # G: explanation: sly vibes + pizzicato
    tG0, tG1 = w(98) - 0.1, w(136) - 0.2
    seq = [69, 72, 76, 74, 72, 76, 79, 77, 76, 72, 74, 71, 69, 72, 76, 81]
    t, k = tG0, 0
    while t < tG1:
        add(b, I.vibes(I.m2f(seq[k % 16]), 0.42, r, dur=1.0), t, -12, (k % 3 - 1) * 0.3)
        if k % 2 == 0: add(b, I.pluck(I.m2f([45, 41, 43, 40][(k // 4) % 4]), 0.6, r, dur=0.5, bright=0.2), t, -10)
        t += beat * 0.75; k += 1
    add(b, I.glock(I.m2f(88), 0.6, r), SOAP, -10, name="soap ding")
    # H: the ban: snare roll to a brass chord on the seal
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(62)], SEAL - w(136), 0.5, r, att=1.5, rel=0.2, warm=1200), w(136) - 0.1, -9, name="ban build")
    for tr, vr in I.snare_roll(SEAL - 1.6, SEAL - 0.03, 0.15, 0.85, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -12)
    add(b, I.brass(I.m2f(50), 1.2, 0.9, r, kind="horn") + I.brass(I.m2f(54), 1.2, 0.85, r, kind="horn") + I.brass(I.m2f(57), 1.2, 0.85, r, kind="horn"), SEAL, -6, name="seal chord")
    # I: museum: the monster motif again, small and creepy (pizz + muted tuba)
    t, k = w(145), 0
    while t < w(164) - 0.2:
        add(b, I.pluck(I.m2f([48, 51, 53, 54, 53, 51][k % 6]), 0.55, r, dur=0.35, bright=0.4), t, -10, (k % 2) * 0.4 - 0.2)
        if k % 3 == 0: add(b, I.brass(I.m2f([36, 39, 41][(k // 3) % 3]), beat * 0.8, 0.55, r, kind="tuba"), t, -10)
        t += beat / 2; k += 1
    # J: biodiesel: sparkle
    for k, n_ in enumerate([79, 83, 86, 91]): add(b, I.glock(I.m2f(n_), 0.5, r), w(166) + k * 0.12, -12, name="fuel sparkle" if k == 0 else None)
    # K: golden ending: warm pad + vibes melody, the monster motif turned major on the last line, final chord
    tK0 = w(170) - 0.2
    add(b, I.pad([I.m2f(48), I.m2f(55), I.m2f(64), I.m2f(67)], DUR - tK0 - 0.3, 0.55, r, att=0.8, rel=1.0, warm=1400), tK0, -8, name="golden ending")
    for k, n_ in enumerate([72, 76, 79, 77, 76, 74, 72]): add(b, I.vibes(I.m2f(n_), 0.5, r, dur=1.4), tK0 + 0.3 + k * 0.55, -10, (k % 3 - 1) * 0.3)
    for k, n_ in enumerate([36, 40, 43, 48]): add(b, I.brass(I.m2f(n_), beat * 0.8, 0.6, r, kind="tuba"), w(180) - 0.05 + k * beat * 0.5, -9)
    add(b, I.vibes(I.m2f(72), 0.6, r, dur=2.0), DUR - 1.4, -9)
    return b

def duck_curve():
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
