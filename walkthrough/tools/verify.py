#!/usr/bin/env python3
"""Loop and dead-time checks on the averaged frames, then on the decoded MP4.  usage: verify.py frames_dir loop.mp4"""
import subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
fr_dir, mp4 = Path(sys.argv[1]), sys.argv[2]
L = lambda f: np.asarray(Image.open(fr_dir / f'{f:05d}.png').convert('RGB'), dtype=np.int16)
N = len(list(fr_dir.glob('*.png')))
first = L(0)
e = np.zeros(N)
prev = first
for i in range(1, N + 1):                                   # streamed: 1200 frames of int16 RGB would not fit in memory
    cur = L(i % N) if i < N else first                      # change from frame i-1 to i, wrapping the last frame to 0
    e[i - 1] = np.abs(cur - prev).mean(); prev = cur
d = np.abs(L(N - 1) - first)
print(f'PNG   frame {N - 1} vs frame 0: max {d.max()}, {int((d.max(axis=2) > 0).sum())} px differ')
def longest_still(thr):
    still = np.concatenate([e < thr] * 2); best = (0, 0); i = 0
    while i < 2 * N:
        if still[i]:
            j = i
            while j < 2 * N and still[j]: j += 1
            if j - i > best[0]: best = (j - i, i)
            i = j
        else: i += 1
    n = min(best[0], N); return n, best[1] % N
for thr, label in ((1e-9, 'pixel-identical'), (0.02, 'visibly still (<0.02 mean level/frame)')):
    n, s = longest_still(thr)
    print(f'{label}: longest run {n} frames = {n / 60:.3f} s = {n / 30:.2f} beats, from frame {s} (t = {s / 60:.3f} s)')
print('per beat (mean change per frame):', ' '.join(f'{e[b * 30:(b + 1) * 30].mean():.1f}' for b in range(N // 30)))
with tempfile.TemporaryDirectory() as td:
    subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-vf', f'select=eq(n\\,0)+eq(n\\,{N - 1})', '-vsync', '0', f'{td}/d_%d.png'], check=True)
    a, b = (np.asarray(Image.open(f'{td}/d_{i}.png').convert('RGB'), dtype=int) for i in (1, 2))
    dd = np.abs(a - b); print(f'MP4   frame {N - 1} vs frame 0: max {dd.max()}, mean {dd.mean():.4f} (h264 residual, not a seam)')
