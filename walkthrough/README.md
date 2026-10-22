# Siya product walkthrough

A 16 s seamless loop (960 frames, 60 fps, 1920 x 1080, 120 BPM click track) that walks through a real product, built from the product's
own screens. The first product is the Agent Workshop, the dashboard for the agents in this account. Siya's work is the camera, the
cursor, the highlight, the captions and the end card; nothing on the product's side is redrawn.

| file | what it is |
| --- | --- |
| `index.html` | the scene: `window.renderAt(t)` / `window.seek(t)`, every pixel a function of `t`. `?live` plays it in real time |
| `assets/` | the product, captured at 3x by `tools/capture.mjs`: two full-page states, three sheet states, `layout.json` with the boxes of everything the walkthrough points at |
| `walkthrough.mp4` | the video: H.264 (crf 14, yuv420p) + AAC click track |
| `track.wav`, `beats.js` | the 120 BPM click track and the beat grid measured from it; every action snaps to it |
| `tools/` | capture, click track, render, averaging, mux, verification |

## Story (32 beats, 0.5 s each)

| beat | t | action |
| --- | --- | --- |
| 1-2 | 0.0 | hold the overview |
| 3-4 | 1.0 | camera to the status chips, cursor on "Needs you", the highlight lands, caption 1 |
| 6 | 2.5 | camera to the agents, the highlight travels to the one that needs you, caption 2 |
| 8 | 3.5 | click: its sheet slides up over a dimmed page |
| 10 | 4.5 | highlight on what it is waiting for, caption 3 |
| 12-13 | 5.5 | Back, the sheet slides away |
| 13-14 | 6.0 | camera to the field agents, highlight on the silent Outreach agent, caption 4 |
| 16 | 7.5 | click: its sheet slides up |
| 17-19 | 8.0 | cursor to "Needs me", highlighted, caption 5; click at 9.0: the sheet and the overview update the way the product does |
| 21-22 | 10.0 | Back, the sheet slides away |
| 22-23 | 10.5 | camera back to the chips, now "2 Needs you", caption 6 |
| 25 | 12.0 | pull back to the whole page |
| 27-30 | 13.0 | the end card rises, resets the product behind it, rolls in "Made by Siya from the product's own screens." and "Send Siya your screens. Get a loop back." |
| 31 | 15.0 | the end card leaves through the top onto the opening frame |
| 32 | 15.5 | settle: the last frame is the first frame |

## Method

* **Real screens.** `tools/capture.mjs` runs the product, settles it, and captures the full page before and after the change, each
  sheet, and the CSS boxes of the chips, cards and sheet controls. The scene is laid out in the product's own CSS pixels, so a
  box in `layout.json` is also a coordinate in the scene.
* **Continuous.** No cuts and no fades between states. Sheets slide up from below the view; one highlight ring morphs between the
  things being pointed at and collapses onto the cursor between them; captions roll up through a mask; the end card moves up through
  the frame and off the top. The only crossfade-free swaps (the sheet after "Needs me", the card and the chips) happen under the
  dimmed veil, as they do in the product.
* **Springs.** Closed-form, summed when a target changes mid-flight (UI damping 0.75, cursor 0.8, camera 1.0). The cursor leads the
  camera, so every long move stays inside the frame. A spring never quite arrives: 0.6 to 0.85 s after a step the remainder is eased
  out and the channel returns its target bit-for-bit.
* **Loop.** Frame 959 equals frame 0 pixel for pixel. The end card sits offscreen below at the start and offscreen above at the end.

## Another product

The scene reads three things: the page states (`base0.png`, `base1.png`), the sheets (`sheet_*.png`) and the boxes in `layout.json`.
For a client product, capture its screens the same way (or export them from Figma at 3x), name the boxes the walkthrough points at,
and change the targets in `CAMKEYS`, `CURPATH`, `RING` and the captions in `index.html`.

## Rebuild

Needs Playwright (imported through `../../liquid-chrome/tools/lib.mjs`), numpy, Pillow and ffmpeg.

```sh
node tools/capture.mjs                                     # assets/ from tools/workshop-product.html
python3 tools/audio.py . 32 8,13,16,19,22                  # track.wav + beats.js
node tools/render.mjs $SP/sub0 none 0 4                    # first pass, 4 subframes (workers 0..3)
python3 tools/average.py $SP/sub0 $SP/f0 && python3 tools/plan.py $SP/f0 $SP/plan.json
node tools/render.mjs $SP/sub $SP/plan.json 0 4            # adaptive: 4, 8 or 16 subframes per frame (reuse the first pass for the 4s)
python3 tools/average.py $SP/sub $SP/frames $SP/plan.json
tools/mux.sh $SP/frames walkthrough.mp4                    # needs track.wav in the working directory
python3 tools/verify.py $SP/frames walkthrough.mp4         # seam, dead time, per-beat motion
node tools/stills.mjs $SP/stills                           # one still per beat + seam check
```
