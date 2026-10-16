#!/usr/bin/env python3
"""Average the subframes of each frame (in sRGB, rounded) into frames/%05d.png, on all cores.
usage: average.py sub_dir frames_dir [plan.json [first_frame]]"""
import json, os, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
import numpy as np
from PIL import Image
sub, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
plan = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else [4] * 1200
first = int(sys.argv[4]) if len(sys.argv) > 4 else 0

def one(f):
    n = plan[f]
    acc = sum(np.asarray(Image.open(sub / f'{f:05d}_{k}.png').convert('RGB'), dtype=np.uint16) for k in range(n))
    Image.fromarray(((acc + n // 2) // n).astype(np.uint8)).save(out / f'{f:05d}.png', compress_level=3)
    return f

if __name__ == '__main__':
    with ProcessPoolExecutor(os.cpu_count()) as ex:
        for _ in ex.map(one, range(first, len(plan)), chunksize=8): pass
    print(f'averaged {len(plan) - first} frames, subframes in plan: {sum(plan)}')
