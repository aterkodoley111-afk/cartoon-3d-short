# Sound for "The Mountain That Suddenly Disappeared" (the Hope Slide, 1965): the user's narration (gain only), an
# original score (low dread under the hook -> a cold, curious winter waltz-box for the valley -> a ticking pulse that
# stops dead on "let go" -> a heavy brass-and-timpani slide that climbs and falls back -> a quiet pad, no percussion,
# for the four people -> sly vibes for the seismograph -> a cookie pizzicato -> a building beat to "On top of it" ->
# a warm golden ending) ducked under the voice, and synthesized SFX timed to the words.
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
FR = math.ceil((WJ["duration"] + 0.8) * 30)   # = TOTAL in story.ts
DUR = FR / 30.0
N = ns(DUR)
w = lambda i: WS[i]
RELEASE = w(65) + 0.05
SQUIG = w(131) - 0.05
COOKIE = w(171) + 0.2
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

def rumble(dur, r, f=90, att=0.6, rel=1.0, wob=0.7):
    n = ns(dur); x = lp(r.standard_normal(n), f) * (0.7 + 0.3 * np.sin(np.arange(n) / SR * wob * 2 * np.pi))
    return st(x * env_seg(n, att, rel) * 3.0)

def rocks(dur, r, density=40, heavy=True):
    return st(X.rattle(dur, r, density=density, heavy=heavy))

def hiss(dur, r, f0=2500):
    n = ns(dur); return hp(r.standard_normal(n), f0) * env_seg(n, 0.03, 0.3)

def engine(dur, r, f0=32, rough=0.5, rev=None):
    n = ns(dur); t = np.arange(n) / SR
    f = np.full(n, f0) if rev is None else f0 * (1 + rev * np.clip(np.sin(np.pi * t / dur), 0, 1))
    x = np.sign(np.sin(phase(f))) * 0.3 + rough * lp(r.standard_normal(n), 300) * (0.5 + 0.5 * np.sin(phase(f)))
    return lp(x, 900) * env_seg(n, 0.2, 0.4)

def squeal(dur, r, f0=2100):
    t = tt(dur); f = f0 * (1 - 0.15 * t / dur) + 40 * np.sin(2 * np.pi * 13 * t)
    return np.sin(phase(f)) * np.exp(-t / (dur * 0.6)) * 0.25 + 0.1 * hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.2)

def tick(r):
    return X.clink(r, f0=3300, dur=0.03) * 0.8

# ======================= SFX =======================
def sfx():
    b = np.zeros((2, N)); r = rng(29)
    # hook: the mountain going, a whoosh into the flash
    add(b, rumble(w(16) + 0.3, r, 80, 0.3, 0.6), 0.0, -2, name="slide rumble (hook)")
    add(b, rocks(w(16), r, 55), 0.3, -10)
    add(b, X.timber_tear(r, 0.9), w(3) - 0.1, -10, -0.3, name="face cracks")
    add(b, X.whoosh(0.9, r, peak=0.6, f_lo=200, f_hi=1400), w(14) + 0.1, -5, name="whoosh into flash")
    # dawn: cold wind down the valley, a far-off car
    add(b, X.breeze(w(41) - w(16), r, level=0.9, gust=0.25, bright=700), w(16), -14, name="cold wind")
    add(b, engine(3.0, r, 26, 0.4) * 0.4, w(21) + 0.3, -22, 0.4, name="distant car")
    # the snow avalanche: a soft whumph and a thud on the road
    add(b, X.whoosh(1.6, r, peak=0.4, f_lo=120, f_hi=900), w(31) - 0.2, -6, name="snow whumph")
    add(b, st(lp(r.standard_normal(ns(0.5)), 160) * np.exp(-np.arange(ns(0.5)) / SR / 0.12) * 3), w(35) + 0.2, -6, name="snow lands")
    # the convertible: engine revving, wheels spinning in snow; tanker air brakes; hay truck squeal
    add(b, engine(w(48) - w(43), r, 34, 0.6, rev=0.9), w(43), -10, -0.2, name="rev + spin")
    add(b, st(hiss(w(48) - w(44), r, 1500) * 0.5), w(44), -16)
    add(b, engine(w(54) - w(48) + 0.5, r, 22, 0.7) * 0.8, w(48) - 0.4, -12, 0.2, name="tanker diesel")
    add(b, hiss(0.7, r, 2000), w(51) + 0.3, -9, 0.2, name="air brakes")
    add(b, squeal(0.7, r), w(57) - 0.1, -12, -0.2, name="hay truck brakes")
    add(b, engine(w(65) - w(54), r, 24, 0.6) * 0.6, w(54), -18)
    # the watch: ticks
    t = w(58) - 0.1
    while t < w(63) - 0.1: add(b, tick(r), t, -10, 0.1, name="watch ticks" if t < w(58) else None); t += 0.5
    # let go: a deep crack, the rumble begins
    add(b, X.timber_tear(r, 1.2), w(64) + 0.1, -4, name="the face cracks")
    add(b, st(lp(r.standard_normal(ns(0.8)), 120) * np.exp(-np.arange(ns(0.8)) / SR / 0.25) * 4), RELEASE - 0.04, -3, name="BOOM")
    add(b, rumble(w(97) - RELEASE + 0.5, r, 70, 1.5, 2.0, 0.4), RELEASE, 0, name="slide rumble")
    add(b, rocks(w(96) - RELEASE, r, 70), RELEASE + 0.5, -8)
    # the forest: snapping trunks; the lake: a huge splash
    for k in range(7): add(b, X.wood_crack(r), w(76) - 0.1 + k * 0.28 + r.uniform(0, 0.1), -10, r.uniform(-0.6, 0.6), name="trees snap" if k == 0 else None)
    add(b, X.splash_big(r), w(80) + 0.1, -2, name="the lake")
    add(b, X.water_bed(1.4, r, close=1.0, slosh_rate=2.0), w(80) + 0.3, -8)
    # across and up the other side, then back
    add(b, X.whoosh(1.8, r, peak=0.75, f_lo=150, f_hi=900), w(85) - 0.2, -4, name="across")
    add(b, X.whoosh(1.4, r, peak=0.3, f_lo=500, f_hi=180), w(93) - 0.1, -5, name="slides back")
    # the bathtub
    add(b, X.water_bed(w(103) - w(97), r, close=1.0, slosh_rate=1.4), w(97) - 0.1, -6, name="tub slosh")
    add(b, X.swing_squeak(r, 0.6), w(99) + 0.1, -14, 0.3, name="duck squeak")
    # the bus: brakes hiss, idling diesel, settling dust
    add(b, hiss(0.9, r, 1800), w(103) - 0.25, -10, -0.2, name="bus brakes")
    add(b, engine(w(113) - w(103), r, 21, 0.5) * 0.5, w(103), -18)
    # the four people: wind only
    add(b, X.breeze(w(126) - w(113), r, level=0.7, gust=0.12, bright=600), w(113), -15, name="quiet wind")
    # the station: drum motor, pen scratch, the burst
    add(b, st(lp(r.standard_normal(ns(w(132) - w(126))), 120) * 0.2), w(126) - 0.2, -18, name="drum motor")
    add(b, X.rattle(w(132) - w(126), r, density=14), w(126), -18, 0.1, name="pen scratch")
    add(b, X.rattle(0.7, r, density=90), SQUIG, -8, 0.1, name="pen scribbles")
    add(b, X.breeze(w(136) - w(132), r, level=0.8), w(132) - 0.1, -16)
    add(b, X.rattle(0.4, r, density=40), w(137), -18, -0.2, name="paper rustle")
    add(b, X.rattle(0.9, r, density=30), w(143), -16, 0.2, name="pencil sketch")
    # cracks: deep creaks in the rock; the cookie: snap, scrape, drop, plate, floor
    for k in range(3): add(b, X.creak(0.7, r, rate0=30, rate1=45, scale=0.8), w(150) + k * 0.9, -12, 0.2 * k - 0.2, name="rock creaks" if k == 0 else None)
    add(b, X.wood_crack(r) * 0.6, w(162) - 0.1, -8, name="cookie cracks")
    add(b, X.rattle(0.35, r, density=50), COOKIE - 0.3, -14, name="half slides")
    add(b, X.clink(r, f0=2400, dur=0.15), COOKIE + 0.05, -12)
    add(b, X.push_thump(r) * 0.7, COOKIE + 0.3, -8, name="cookie lands")
    # the crew: a bulldozer
    add(b, engine(w(185) - w(173), r, 18, 0.8) * 0.8, w(173) - 0.2, -12, name="bulldozer")
    for k in range(5): add(b, X.clink(r, f0=r.uniform(500, 900), dur=0.25), w(174) + k * 0.9, -18, r.uniform(-0.5, 0.5))
    # today: birds, breeze, the car passing
    tE = w(185) - 0.3
    add(b, X.bird_chirps(DUR - tE, r, density=0.35), tE, -18, -0.3)
    add(b, X.breeze(DUR - tE, r, level=0.6), tE, -20)
    add(b, X.whoosh(1.4, r, peak=0.5, f_lo=200, f_hi=1200), w(186), -10, 0.3, name="car passes")
    add(b, engine(w(189) - w(185), r, 40, 0.3) * 0.5, w(185), -16)
    return b

# ======================= MUSIC =======================
def music():
    b = np.zeros((2, N)); r = rng(31)
    bpm = 96; beat = 60 / bpm
    # hook: low dread pad + timpani on "seconds" and "climbed"
    add(b, I.pad([I.m2f(38), I.m2f(45), I.m2f(50)], w(16), 0.55, r, att=0.4, rel=0.4, warm=500), 0.0, -7, name="hook dread")
    add(b, I.timpani(I.m2f(38), 1.0, r, dur=2.0), w(6) - 0.03, -4, name="timp seconds")
    add(b, I.timpani(I.m2f(41), 1.0, r, dur=2.0), w(12) - 0.03, -4)
    add(b, I.cymbal(0.5, r, dur=1.6), w(12) - 0.03, -14)
    # A: the valley at dawn: music-box waltz over plucked bass, cold and curious; a little tighter once stuck
    tA0, tA1 = w(16) - 0.05, w(58) - 0.15
    mel = [74, 77, 76, 74, 72, 74, 69, 72, 74, 77, 79, 77, 76, 74, 72, 69]
    bass = [38, 45, 41, 43]
    t, k = tA0, 0
    while t < tA1:
        if k % 3 == 0: add(b, I.pluck(I.m2f(bass[(k // 6) % 4]), 0.7, r, dur=0.6, bright=0.2), t, -7)
        else: add(b, I.pluck(I.m2f(bass[(k // 6) % 4] + 12 + (7 if k % 3 == 2 else 3)), 0.4, r, dur=0.3, bright=0.3), t, -14, 0.3)
        if k % 3 == 0 and t > w(16) + 0.5: add(b, I.musicbox(I.m2f(mel[(k // 3) % 16]), 0.5, r, dur=1.2), t, -11, -0.25)
        if t > w(44) and k % 3 == 1: add(b, I.pluck(I.m2f(62), 0.4, r, dur=0.2, bright=0.6), t, -15, 0.4)
        t += beat * (0.78 if t > w(48) else 0.8); k += 1
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(62)], tA1 - tA0, 0.3, r, att=1.5, rel=0.5, warm=1100), tA0, -16)
    # B: two minutes to seven: a ticking pulse that tightens, then silence on "let go"
    t, k = w(58) - 0.05, 0
    while t < w(65) - 0.08:
        add(b, I.pluck(I.m2f(38 if k % 2 else 50), 0.6, r, dur=0.25, bright=0.2), t, -9)
        t += beat / 2 * (0.9 if t > w(62) else 1.0); k += 1
    for tr, vr in I.snare_roll(w(63) - 0.1, w(65) - 0.06, 0.1, 0.55, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -15)
    # C: the slide: brass stab + timpani on "Forty-seven", a churning low ostinato that climbs with the mass
    add(b, I.brass(I.m2f(38), 1.0, 0.95, r, kind="stab") + I.brass(I.m2f(45), 1.0, 0.9, r, kind="stab") + I.brass(I.m2f(50), 1.0, 0.85, r, kind="stab"), w(67) - 0.05, -3, name="slide stab")
    add(b, I.timpani(I.m2f(38), 1.0, r, dur=2.5), w(67) - 0.05, -3); add(b, I.cymbal(0.7, r, dur=2.4), w(67) - 0.05, -12)
    t, k = w(67) + 0.5, 0
    climb = [38, 38, 41, 38, 43, 41, 45, 43]
    while t < w(92) + 0.2:
        up = 0 if t < w(85) else 3 if t < w(89) else 5
        add(b, I.brass(I.m2f(climb[k % 8] + up), beat / 2 * 0.9, 0.75, r, kind="tuba"), t, -8)
        if k % 2 == 0: add(b, I.timpani(I.m2f(38 + up), 0.5, r, dur=0.6), t, -14)
        t += beat / 2; k += 1
    for tr, vr in I.snare_roll(w(89) - 0.2, w(92) + 0.2, 0.2, 0.9, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -12)
    add(b, I.brass(I.m2f(55), 0.8, 0.9, r, kind="stab") + I.brass(I.m2f(59), 0.8, 0.85, r, kind="stab"), w(92), -5, name="top of Coulter")
    add(b, I.brass(I.m2f(55), 1.6, 0.8, r, kind="soft", fall=-7.0), w(93) + 0.1, -6, name="slides back fall")
    # the bathtub: cheeky pizzicato rocking side to side
    t, k = w(97) - 0.05, 0
    while t < w(103) - 0.2:
        add(b, I.pluck(I.m2f([62, 69, 62, 67][k % 4]), 0.55, r, dur=0.3, bright=0.5), t, -10, (k % 2) * 0.6 - 0.3); t += beat / 2; k += 1
    # D: "Luckily": a hopeful little rising figure ... "Sadly": strings-like pad alone, no percussion
    for k, n_ in enumerate([62, 66, 69, 74]): add(b, I.vibes(I.m2f(n_), 0.5, r, dur=1.2), w(103) + k * 0.3, -10, (k % 2) * 0.4 - 0.2)
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(62), I.m2f(66)], w(112) - w(103) + 0.6, 0.35, r, att=0.6, rel=0.6, warm=1200), w(103), -15)
    add(b, I.pad([I.m2f(46), I.m2f(53), I.m2f(58), I.m2f(62)], w(126) - w(113) + 0.4, 0.45, r, att=1.2, rel=1.5, warm=700), w(113) - 0.1, -9, name="quiet pad")
    add(b, I.vibes(I.m2f(65), 0.35, r, dur=3.0), w(119), -16); add(b, I.vibes(I.m2f(62), 0.3, r, dur=3.0), w(123), -17)
    # E: the station: sly vibes + pluck, a ding on "the slide itself"
    tE0, tE1 = w(126) - 0.1, w(147) - 0.2
    seq = [69, 72, 76, 74, 72, 76, 79, 77, 76, 72, 74, 71]
    t, k = tE0, 0
    while t < tE1:
        add(b, I.vibes(I.m2f(seq[k % 12]), 0.42, r, dur=1.0), t, -12, (k % 3 - 1) * 0.3)
        if k % 2 == 0: add(b, I.pluck(I.m2f([45, 41, 43, 40][(k // 4) % 4]), 0.6, r, dur=0.5, bright=0.2), t, -10)
        t += beat * 0.75; k += 1
    add(b, I.glock(I.m2f(86), 0.65, r), w(145) - 0.03, -8, name="aha ding")
    # F: cracks + cookie: a low mysterious pad, pizzicato, stops on "Nothing", a soft thump when it lands
    add(b, I.pad([I.m2f(43), I.m2f(50), I.m2f(55)], w(156) - w(147), 0.45, r, att=0.8, rel=0.4, warm=600), w(147) - 0.1, -10, name="cracks pad")
    t, k = w(156) - 0.05, 0
    while t < w(166) - 0.1:
        add(b, I.pluck(I.m2f([67, 71, 74, 71][k % 4]), 0.5, r, dur=0.3, bright=0.5), t, -11, (k % 2) * 0.4 - 0.2); t += beat / 2; k += 1
    add(b, I.brass(I.m2f(50), 1.3, 0.7, r, kind="soft", fall=-5.0), w(170) - 0.05, -9, name="gravity fall")
    add(b, I.timpani(I.m2f(36), 0.8, r, dur=1.2), COOKIE + 0.3, -7)
    # G: the rebuild: a building beat to a brass chord on "On top of it"
    t, k = w(173) - 0.05, 0
    while t < w(181) - 0.1:
        add(b, I.pluck(I.m2f([38, 43, 45, 47][(k // 4) % 4]), 0.65, r, dur=0.35, bright=0.3), t, -9)
        if k % 2: add(b, I.brush(0.4, r, dur=0.2), t, -16, 0.3)
        t += beat / 2; k += 1
    for tr, vr in I.snare_roll(w(180) - 0.5, w(181) - 0.03, 0.15, 0.8, r): add(b, I.snare(vr, r, dur=0.15, buzz=True), tr, -13)
    add(b, I.brass(I.m2f(50), 1.6, 0.9, r, kind="horn") + I.brass(I.m2f(54), 1.6, 0.85, r, kind="horn") + I.brass(I.m2f(57), 1.6, 0.85, r, kind="horn"), w(181), -5, name="On top chord")
    add(b, I.cymbal(0.6, r, dur=2.2), w(181), -13)
    # H: today: warm pad + vibes melody, final chord
    tG0 = w(185) - 0.2
    add(b, I.pad([I.m2f(50), I.m2f(57), I.m2f(66), I.m2f(69)], DUR - tG0 - 0.3, 0.55, r, att=1.0, rel=1.0, warm=1400), tG0, -8, name="golden ending")
    gm = [74, 78, 81, 79, 78, 76, 74, 73, 74]
    for k, n_ in enumerate(gm): add(b, I.vibes(I.m2f(n_), 0.5, r, dur=1.5), tG0 + 0.4 + k * 0.6, -10, (k % 3 - 1) * 0.3)
    add(b, I.vibes(I.m2f(74), 0.6, r, dur=2.0), DUR - 1.8, -9); add(b, I.glock(I.m2f(86), 0.5, r), w(199), -12)
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
