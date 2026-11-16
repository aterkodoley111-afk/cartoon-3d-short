import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
M = "/root/molasses-short/models/"
k = Kokoro(M + "kokoro.onnx", M + "voices.bin")
lines = [l.strip() for l in open(sys.argv[1]) if l.strip()]
out, sr = [], 24000
PAUSE = {6: 0.35, 9: 0.75, 12: 0.3}
for li, l in enumerate(lines):
    a, sr = k.create(l, voice="bm_george", speed=float(sys.argv[3]) if len(sys.argv)>3 else 1.0, lang="en-gb")
    out += [a, np.zeros(int(PAUSE.get(li, 0.18) * sr), dtype=a.dtype)]
w = np.concatenate([np.zeros(int(0.3 * sr), dtype=out[0].dtype)] + out + [np.zeros(int(0.8 * sr), dtype=out[0].dtype)])
sf.write(sys.argv[2], w, sr)
print(len(w) / sr, "s")
