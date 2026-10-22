#!/usr/bin/env python3
"""Choose a subframe count per frame from the first pass: 4 where little moves, 8 for moderate motion, 16 where it is fast.
Four samples across a frame leave four separate ghost copies once something moves more than ~25 px per frame; more samples turn them into a streak.
usage: plan.py frames_dir plan.json"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
fr, out = Path(sys.argv[1]), sys.argv[2]
L = lambda f: np.asarray(Image.open(fr / f'{f:05d}.png').convert('L'), dtype=np.int16)
N = len(list(fr.glob('*.png')))
g = [L(f) for f in range(N)]
e = np.array([np.abs(g[(i + 1) % N] - g[i]).mean() for i in range(N)])   # change from frame i to i+1
motion = np.maximum(e, np.roll(e, 1))                                         # a frame is as busy as the busier of its two neighbours
n = np.where(motion >= 1.5, 16, np.where(motion >= 0.3, 8, 4)).tolist()
json.dump(n, open(out, 'w'))
print({k: n.count(k) for k in (4, 8, 16)}, 'shots:', sum(n))
