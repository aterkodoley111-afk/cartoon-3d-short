# usage: python align.py voice.wav lines.txt words.json
# Word timings for the script: sherpa-onnx zipformer ASR (token timestamps) on ~20 s chunks, then the script words are
# aligned to the recognised words (difflib), unmatched script words interpolated between neighbours.
import sys, json, re, difflib, numpy as np, soundfile as sf, sherpa_onnx
import os
D = os.environ.get("ZIPFORMER_DIR", os.path.expanduser("~/models/sherpa-onnx-zipformer-en-2023-06-26")) + "/"
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=D + "encoder-epoch-99-avg-1.int8.onnx", decoder=D + "decoder-epoch-99-avg-1.onnx",
    joiner=D + "joiner-epoch-99-avg-1.int8.onnx", tokens=D + "tokens.txt", num_threads=2, decoding_method="greedy_search")
wav, sr = sf.read(sys.argv[1], dtype="float32", always_2d=True); wav = wav.mean(1)
if sr != 16000:
    import scipy.signal as ss; wav = ss.resample_poly(wav, 16000, sr).astype("float32"); sr = 16000
# chunk at quiet points near every 18 s
env = np.convolve(np.abs(wav), np.ones(800) / 800, "same"); cuts = [0]
while len(wav) - cuts[-1] > 22 * sr:
    lo, hi = cuts[-1] + 15 * sr, cuts[-1] + 21 * sr; cuts.append(lo + int(np.argmin(env[lo:hi])))
cuts.append(len(wav))
asr = []  # (word, start, end)
for a, b in zip(cuts, cuts[1:]):
    s = rec.create_stream(); s.accept_waveform(sr, wav[a:b]); rec.decode_stream(s); r = s.result
    toks, ts = r.tokens, list(r.timestamps) + [(b - a) / sr]
    cur, st = "", 0.0
    for i, t in enumerate(toks):
        if t.startswith(" ") and cur: asr.append((cur, st + a / sr, ts[i] + a / sr)); cur = ""
        if not cur: st = ts[i]
        cur += t.strip()
    if cur: asr.append((cur, st + a / sr, min(ts[-1], st + 0.6) + a / sr))
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
script = [w for l in open(sys.argv[2]) for w in l.split()]
A, S = [norm(w[0]) for w in asr], [norm(w) for w in script]
out = [None] * len(script)
for blk in difflib.SequenceMatcher(None, S, A, autojunk=False).get_matching_blocks():
    for k in range(blk.size): out[blk.a + k] = [asr[blk.b + k][1], asr[blk.b + k][2]]
# fill gaps by interpolation
idx = [i for i, o in enumerate(out) if o]
for i in range(len(out)):
    if out[i]: continue
    p = max([j for j in idx if j < i], default=None); n = min([j for j in idx if j > i], default=None)
    t0 = out[p][1] if p is not None else 0.0; t1 = out[n][0] if n is not None else t0 + 0.4
    k0 = p if p is not None else -1; k1 = n if n is not None else len(out)
    u0 = (i - k0 - 1) / (k1 - k0 - 1); u1 = (i - k0) / (k1 - k0 - 1)
    out[i] = [t0 + (t1 - t0) * u0, t0 + (t1 - t0) * u1]
words = [{"i": i, "w": w, "s": round(o[0], 3), "e": round(o[1], 3)} for i, (w, o) in enumerate(zip(script, out))]
json.dump({"duration": round(len(wav) / sr, 3), "matched": len(idx), "total": len(script), "words": words}, open(sys.argv[3], "w"), indent=0)
print("matched", len(idx), "/", len(script), "dur", len(wav) / sr)
