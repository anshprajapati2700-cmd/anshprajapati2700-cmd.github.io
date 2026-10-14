#!/usr/bin/env python3
"""120 BPM click track for the UI-motion loop, generated with numpy only, plus the beat grid the animation snaps to.

  python3 tools/audio.py [out_dir]     writes track.wav (8.000 s, 48 kHz, stereo, 16-bit) and beats.js

The grid in beats.js is *measured* from track.wav (first sample above threshold after silence), not copied from
the BPM, so every action in index.html lands on a transient that is actually in the audio.
Tails wrap around the loop point (circular add) so the loop is click-free without fades.
"""
import json, sys, wave
from pathlib import Path
import numpy as np

SR, BPM, BARS_BEATS = 48000, 120, 16
BEAT = 60 / BPM                       # 0.5 s
LOOP = BARS_BEATS * BEAT              # 8.0 s
N = int(round(LOOP * SR))
rng = np.random.default_rng(5)        # fixed seed: the noise bursts are reproducible

out = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
mix = np.zeros((N, 2))

def put(sig, t, gain=1.0, pan=0.0):
    """Add `sig` starting at time t, wrapping past the end of the loop."""
    i0 = int(round(t * SR))
    idx = (i0 + np.arange(len(sig))) % N
    l, r = gain * np.cos((pan + 1) * np.pi / 4), gain * np.sin((pan + 1) * np.pi / 4)
    np.add.at(mix[:, 0], idx, sig * l)
    np.add.at(mix[:, 1], idx, sig * r)

def tick(f, tau, dur=0.16):
    """Wood-block style tick: 0.6 ms attack, exponential decay, one inharmonic partial."""
    t = np.arange(int(dur * SR)) / SR
    env = (1 - np.exp(-t / 0.0006)) * np.exp(-t / tau)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / (tau * 0.4))) * env

def tap(dur=0.09):
    """Mouse-down: a 190 Hz thump plus a 4 ms noise burst, high-passed by differencing."""
    t = np.arange(int(dur * SR)) / SR
    thump = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.022) * (1 - np.exp(-t / 0.0005))
    nz = np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t / 0.0035)
    return thump * 0.9 + nz * 0.22

def release(dur=0.05):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.008) * (1 - np.exp(-t / 0.0004))

# metronome: accent on the bar line (beats 1, 5, 9, 13), softer ticks between
for b in range(BARS_BEATS):
    t = b * BEAT
    if b % 4 == 0:
        put(tick(1050, 0.030), t, 0.34)
    else:
        put(tick(1650, 0.016), t, 0.17)

# the cursor's clicks, by beat number (must match CLICKS in index.html): connect, row, chip, close, row, slider grab, toggle, done
CLICK_BEATS = [4, 7, 9, 10, 11, 13, 14, 15]
for cb in CLICK_BEATS:
    t = (cb - 1) * BEAT
    put(tap(), t, 0.42, pan=0.12)
    put(release(), t + 0.125, 0.10, pan=0.12)

peak = np.abs(mix).max()
mix *= (10 ** (-3 / 20)) / peak       # peak at -3 dBFS
pcm = np.round(mix * 32767).astype('<i2')
with wave.open(str(out / 'track.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

# ---- beat grid measured from the audio itself ----
mono = np.abs(mix).max(axis=1)
thr = 0.02 * mono.max()
quiet = int(0.06 * SR)
onsets, last = [], -10**9
for i in np.flatnonzero(mono > thr):
    if i - last > quiet:
        onsets.append(i)
    last = i
onsets = np.array(onsets[:BARS_BEATS], dtype=float)
grid = onsets / SR
nominal = np.arange(BARS_BEATS) * BEAT
err_ms = (grid - nominal) * 1000
assert len(grid) == BARS_BEATS, f'expected {BARS_BEATS} onsets, found {len(grid)}'
assert np.abs(err_ms).max() < 1.0, f'onsets drift from the 120 BPM grid by {np.abs(err_ms).max():.2f} ms'
(out / 'beats.js').write_text(
    '// measured from track.wav by tools/audio.py: do not edit\n'
    f'window.BEATS = {json.dumps([round(float(g), 5) for g in grid])};\n'
    f'window.LOOP = {LOOP};\n')
print(f'track.wav  {N} samples  {N / SR:.3f} s  peak -3 dBFS')
print('onsets (s):', np.round(grid, 4).tolist())
print(f'max onset offset from the 120 BPM grid: {np.abs(err_ms).max():.3f} ms')
