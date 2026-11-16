# usage: python flicker.py video.mp4 [frame_offset] [shots.json] -> per-frame flicker score (% of pixels that flip
# brighter-darker-brighter beyond smooth motion), runs listed, cuts/planned frames ignored
import sys, json, subprocess, numpy as np
vid = sys.argv[1]; off = int(sys.argv[2]) if len(sys.argv) > 2 else 0
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", vid, "-vf", "scale=135:240", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1, 240, 135).astype(np.float32)
skip = set()
if len(sys.argv) > 3:
    sh = json.load(open(sys.argv[3]))
    for s in sh["shots"]: skip.update(range(s["a"] - 2, s["a"] + 2))
    for x in sh.get("planned", []) + sh.get("xfade", []) + [sh.get("flash", [0, 0])]: skip.update(range(x[0] - 2, x[1] + 2))
d2 = np.abs(2 * a[1:-1] - a[:-2] - a[2:]); d1 = np.abs(a[2:] - a[:-2]) / 2
sc = (np.clip(d2 - d1, 0, None) > 12).mean((1, 2)) * 100
f = np.arange(1, len(a) - 1) + off
ok = np.array([x not in skip for x in f])
print(f"flicker mean {sc[ok].mean():.2f}%  p95 {np.percentile(sc[ok], 95):.2f}%  max {sc[ok].max():.2f}% at f{f[ok][np.argmax(sc[ok])]}")
bad = f[ok][sc[ok] > 3]
print("frames > 3%:", len(bad), list(bad[:40]))
