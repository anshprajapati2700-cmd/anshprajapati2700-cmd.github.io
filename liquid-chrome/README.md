# Liquid Chrome

A 6 s seamless loop (360 frames, 60 fps, 1080 x 1080) of a chrome blob that splits into seven droplets, pours into
**OPUS 5.5**, holds, then melts back into the blob. One HTML file for the picture, one for the score.

| file | what it is |
| --- | --- |
| `index.html` | the piece: three.js 0.160.0 from a jsdelivr importmap, one full-screen raymarch shader, `window.renderAt(t)`, `window.__ready` |
| `sound.html` | the score: everything synthesised with the Web Audio API, rendered offline to a 48 kHz stereo loop |
| `liquid-chrome.mp4` | single-loop article cut: H.264 + AAC, audio edges carry a 2 ms (96 sample) raised-cosine fade |
| `liquid-chrome-loop.wav` | master loop, 48 kHz stereo 24-bit, no fades, for the two-loop post |
| `tools/` | Playwright scripts that rendered and measured all of the above (see below) |

`index.html?t=1.5` renders that one instant and never starts `requestAnimationFrame`; without `?t=` it loops in real time.
`?res=540` is a preview size only, the deliverable is 1080.

## Picture

* **One SDF.** Blob, seven droplets and the letters are one signed distance field. Smooth-min k 0.35 falling to 0.1 as the
  droplets part. Glyph outlines from `helvetiker_bold` (`TextGeometry` size 0.52, height 0.12, bevel 0.03, 10 bevel / 24 curve
  segments) are baked on the GPU into two 2048 x 512 distance textures, one channel per glyph, and extruded as a rounded box
  that matches the mesh. Glyphs are placed by their measured outlines, 0.09 apart and 0.26 for the word space.
* **Pour.** Each droplet reveals its letter inside a sphere growing out of it (smooth max 0.05, ease-out, 0.4 s) while the droplet
  shrinks into it; the puff spring (0.07 to 0.03, damping 0.55, 3 Hz) starts only once the letter is full. The melt runs the same
  path in reverse: drops regrow first (4.88 to 5.1 s, 1.15x), letters retract (5.0 to 5.35 s), drops drain to the centre from
  5.2 s, the central blob regrows from radius -0.4 at 5.15 s and merges at 5.62 s with a 14 %, damping 0.25, 2.4 Hz wobble that
  runs through frame 0.
* **Real mesh.** From 3.3 to 4.7 s the raymarched text cross-fades to the `TextGeometry` mesh (creased normals at 35 degrees, cap
  normals flattened). The mesh runs the same GLSL, takes its normal from the SDF gradient, and traces reflections into the SDF.
* **Chrome and studio.** F0 0.92, Schlick, three traced bounces, environment addressed by azimuth and elevation: 0.1 grey room,
  white cyc (140 degrees, -10 to 40), black camera-side panel 86 x 57 with a 0.5 horizon strip at -6, softboxes overhead (2.4) and
  upper left (3.0), black flags at 75, D97757 rim (165 degrees, 42 up, 70 x 16, 1.4), soft D97757 kicker (azimuth 55 to 125,
  elevation -16 to 10), and a 0.6 degree glint at intensity 3, tilted 40 degrees. White floor at y -0.8 that ends at z 4 (softened
  over 3.6 to 4.0), soft overhead shadow, contact darkening, 6 % reflection.
* **Post.** Bloom (threshold 1.0, strength 0.3), linear to 0.9 then a soft shoulder, vignette 7 %, grain 1.5 % seeded by frame index.
  Quarter-pixel jitter uses four offsets chosen by `frac(frame / 4)`; silhouette pixels take four extra samples.

Notes on interpretation:

* *Glint sweep.* The quoted azimuth sweep (-0.083 to 0.302, quoted where the strip crosses the horizon) is used as given.
  `window.__info().glintSolved` re-derives it from the camera path and the flat cap outlines (-0.0806 to 0.2995), i.e. the strip's
  edge reaches the O 0.3 frame early and leaves the last 5 0.3 frame early.
* *Roughness 0.04* is realised as a narrow feather on every environment edge (widened by the reflection's pixel footprint), not as a lobe blur.
* *Performance.* The shader keeps a single `march` and a single `calcNormal` call site (one chain loop for the primary hit, bounces,
  floor and its mirror). Inlined per call site it was twenty times slower on the software rasteriser used for the frame renders.

## Sound

Bed: 120 BPM in 3/4, bars of 90 frames starting on frames 67, 157, 247, 337 (Bm, G, A, D), kicks on 67, 247, 337, shaker on the
offbeats where no hit plays (172, 232, 262, 352, 22, 52), sub and pad on the chords. Events: squash inhale peaking at 84, stretch
glide 84 to 112, pinch bloops 112, 113, 114, 120, pour bloops rising through D major pentatonic at 136, 138, 141, 145, 147, 150, 153,
metallic ting at 200 (partials 880 to 7861 Hz), shimmer panned left to right until 245, liquid swell from 288 peaking at 303,
drips at 309, merge blups 319, 321, 322, 325, slurp into a gloop at 337 wobbling at 2.4 Hz. Every hit lands one frame after its
visual event.

Measured on the master (`node tools/audio.mjs report`, `node tools/crest.mjs`, and `ffmpeg -af ebur128=peak=true`):

* integrated loudness -14.0 LUFS, true peak -1.3 dBTP (-1.2 dBTP after AAC), 48 kHz stereo;
* every tonal hit is a buffer whose attack ends on a cosine crest, no waveshaper, no filter; rendered alone through the whole
  graph the biggest peak of all 25 tonal hits sits on sample `(F + 1) * 800` exactly (the gloop on 270400);
* every hit, or pair on one frame (kick + gloop), reads 4.0 to 5.0 dB above the bed (K-weighted, first 60 ms from the landing
  sample), 0.11 dB or less lost to the limiter inside each hit window; the limiter takes 0.43 dB off the gloop (2.25 dB at most,
  on the stacked merge blups);
* the mix loses 1.7 dB through a 150 Hz high-pass; kicks sit 1.5 dB down, the kick under the gloop 6.7 dB (4 + 2.7) down, sub 4 dB
  down, pad 1.5 dB up, hit bus 2.5 dB down;
* gloop: fundamental plus 2nd harmonic 0.2 and 3rd 0.08, all in cosine phase, no 4th;
* seam: step between the last and first sample is smaller than the largest step within 200 samples of it; the loop is rendered as
  the middle of three consecutive passes so tails (the D chord, the gloop wobble) wrap exactly.

The follow-up notes quote per-hit trims against an earlier mix that is not in this repository, so the per-hit levels here come
from `calibrate()` in `sound.html`, which sets each group to its target over the bed (baked into `TRIM`).

## Re-rendering

```sh
cd tools && npm i three@0.160.0 playwright      # three is served to the page from node_modules instead of jsdelivr
node render.mjs /tmp/frames                      # 360 PNGs, about 6 s each on SwiftShader
node audio.mjs export /tmp/audio                 # master.wav + article.wav (2 ms edge fades)
./mux.sh /tmp/frames /tmp/audio ..               # liquid-chrome.mp4 + liquid-chrome-loop.wav
```

The article MP4 audio decodes to 6.016 s in ffmpeg (AAC padding past the video); the edit list trims it to 6.000 s in players that
honour it, and the 96-sample fades mean a player that does not still starts and stops on silence.
