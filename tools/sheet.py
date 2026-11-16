# usage: python sheet.py out.jpg cols img1 img2 ... (labels each tile with its frame number)
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f) for f in files]; w, h = ims[0].size; w2, h2 = w // 2, h // 2
rows = (len(ims) + cols - 1) // cols
S = Image.new("RGB", (w2 * cols, h2 * rows), "black"); d = ImageDraw.Draw(S)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w2, (i // cols) * h2
    S.paste(im.resize((w2, h2)), (x, y)); d.rectangle([x, y, x + 60, y + 18], fill="black"); d.text((x + 4, y + 3), f.split("_")[-1].split(".")[0], fill="white")
S.save(out, quality=88)
