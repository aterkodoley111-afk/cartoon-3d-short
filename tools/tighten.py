# Shorten pauses in a mono wav: lead/tail trimmed to LEAD s, inner gaps capped at CAP s (with short fades).
import sys, numpy as np
from scipy.io import wavfile
src, dst, cap = sys.argv[1], sys.argv[2], float(sys.argv[3])
sr, x = wavfile.read(src); x = x.astype(np.float32) / (32768 if x.dtype == np.int16 else 1)
win = int(sr * 0.01); n = len(x) // win
rms = np.sqrt((x[:n*win].reshape(n, win) ** 2).mean(1) + 1e-12)
loud = 20 * np.log10(rms) > -40
# silence runs in 10 ms windows
runs, i = [], 0
while i < n:
    if not loud[i]:
        j = i
        while j < n and not loud[j]: j += 1
        runs.append((i, j)); i = j
    else: i += 1
out, pos, LEAD = [], 0, 0.12
for a, b in runs:
    a_s, b_s = a*win, min(b*win, len(x))
    dur = (b_s - a_s) / sr
    keep = LEAD if (a == 0 or b >= n) else min(dur, cap)
    if dur < 0.2 and a != 0 and b < n: continue
    out.append(x[pos:a_s])
    k = int(keep * sr); h = k // 2
    out.append(x[a_s:a_s+h]); out.append(x[b_s-(k-h):b_s]); pos = b_s
out.append(x[pos:])
y = np.concatenate(out)
wavfile.write(dst, sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
print(f"{len(x)/sr:.2f}s -> {len(y)/sr:.2f}s")
