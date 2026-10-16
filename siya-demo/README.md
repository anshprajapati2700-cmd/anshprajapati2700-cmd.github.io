# Siya, motion designer

A demo for clients: what Siya does, shown by Siya. A 20 s seamless loop (1200 frames, 60 fps, 1440 x 1440) of Siya's own
workflow (send your screens, see the plan first, say go, get a loop), plus a shareable page that plays the same scene live.
Built with the "UI MOTION" method (N01ennn): one continuous morph, a real cursor driving every change, closed-form springs,
every action on a 120 BPM beat. Black, white and one accent (`#D97757`). Last line of copy: **"Send Siya your screens. Get a loop back."**

| file | what it is |
| --- | --- |
| `index.html` | the scene: `window.renderAt(t)` / `window.seek(t)`, every pixel a function of `t`, no CSS transitions, no timers. `?live` plays it in real time |
| `siya-demo.mp4` | the video: H.264 (crf 14, yuv420p) + AAC click track, exactly 20.000 s |
| `track.wav` | the click track, 48 kHz stereo 16-bit, 20.000 s, tails wrapped around the loop point |
| `beats.js` | the beat grid, measured from `track.wav`; `index.html` snaps every action to it |
| `page.html` | the shareable page: the live scene with a timeline that seeks, the four steps, what to send and what you get, a sample loop, a brief to copy |
| `tools/` | numpy click track, Playwright render, averaging, mux, verification, and the page build (`build_page.py`) |

## Beat map (120 BPM, 1 beat = 0.5 s = 30 frames, 40 beats)

| beat | t | action |
| --- | --- | --- |
| 1-2 | 0.0 | hold the hero |
| 3 | 1.0 | cursor goes to the first screen, camera in |
| 4-6 | 1.5 | drag three screens into the drop zone, the counter rolls 1, 2, 3 |
| 7-9 | 3.0 | click Accent, Fonts and Last line: the swatch pops, values roll in, the last line types |
| 10-12 | 4.5 | Send turns solid, click: the pill morphs into a loader, the loader closes into a check |
| 13 | 6.0 | the panels slide to **02 Plan** and the camera follows |
| 14-15 | 6.5 | sixteen beat cells light up in a cascade |
| 16-17 | 7.5 | four stills pop in: opening, two mid states, loop seam |
| 18-19 | 8.5 | a line joins the opening and the seam: last frame = first frame |
| 20-21 | 9.5 | cursor goes to Go, click |
| 22 | 10.5 | the panels slide to **03 Go**, the build counts up, 72 frames fill one per tick |
| 27 | 13.0 | done: the bar turns accent, a check draws |
| 28 | 13.5 | slide to **04 Loop**: three files arrive, a preview loops, three checks draw in |
| 34 | 16.5 | click loop.mp4 |
| 38 | 18.5 | everything slides back into the opening frame, cursor returns to rest |
| 39-40 | 19.0 | settle: the last frame is the first frame |

Cursor moves depart a half beat (or a sixteenth) before the beat they land on. Times are `T(beat, sixteenths)` in `index.html`,
resolved against `beats.js`. The nine press sounds in `track.wav` sit on `4 5 6 7 8 9 11 21 34` (`CLICK_BEATS` in `tools/audio.py`
must match `PRESS` in `index.html`).

## How the rules were met

* **No cuts, no fades.** Panels slide on one strip, the clone of 01 at its end lets the last slide land on the opening frame. Labels
  roll through masks, values roll as strips, tooltips and badges scale in. Nothing changes opacity between states.
* **Springs.** `springStep(zeta, w)` is the closed-form step response; channels sum steps so a target that changes mid-flight keeps its
  momentum. UI: damping 0.75, omega 15.5 (2 % settle in about 0.35 s, 2.8 % overshoot). Cursor: damping 0.8, x and y omegas 17 and 15 so
  diagonals arc. Camera and panels: damping 1.0, omega 12. A dragged screen uses the cursor's own spring, so it stays under it.
* **Camera.** 1.25x on the screens, 1.7x on Send, 1.25x on the plan, 1.2x on the stills, 1.6x on Go, 1.25x on the build, 1.2x on the
  loop, then back to 1x. Every key keeps the tagline out of frame.
* **Closing the loop.** Between 0.6 s and 0.85 s after a step the spring's remainder is eased to zero and the channel returns its target
  bit-for-bit; nothing steps after 18.625 s. Each panel is placed on its own: inside one long translated strip the clone sat at x = 4776,
  and large offsets nudged antialiasing by up to 3 levels. Frame 1199 equals frame 0 pixel for pixel, cursor included.
  `seek(7.25)` twice gives identical pixels.

## Render

Same pipeline as `../ui-motion`, adapted to 40 beats: 4 subframes per frame is the floor, `tools/plan.py` raises fast frames to 8 or 16
from the first pass's frame-to-frame change; averaged in sRGB over a 180 degree shutter. Chrome runs with `--disable-partial-raster`
and a fresh page every 8 shots (otherwise a frame's antialiasing depends on the frames drawn before it).

```sh
python3 tools/audio.py .                                   # track.wav + beats.js
node tools/render.mjs $SP/sub0 none 0 4                    # first pass, 4 subframes (workers 0..3 in parallel)
python3 tools/average.py $SP/sub0 $SP/frames0
python3 tools/plan.py $SP/frames0 $SP/plan.json            # subframes per frame
node tools/render.mjs $SP/sub $SP/plan.json 0 4            # copy the first pass's files for the 4-subframe frames first; workers 0..3
python3 tools/average.py $SP/sub $SP/frames $SP/plan.json
tools/mux.sh $SP/frames siya-demo.mp4                      # needs track.wav in the working directory
python3 tools/verify.py $SP/frames siya-demo.mp4           # seam, dead time, per-beat motion
node tools/stills.mjs $SP/stills                           # one still per beat + seam check
python3 tools/build_page.py page.html --video siya-demo.mp4 --sample ../ui-motion/loop.mp4 --standalone
```

`build_page.py` inlines the scene into the page (its CSS scoped under `#stage`, its script in a function) so the page plays the real
`renderAt(t)`, not a recording. Without `--standalone` it writes a fragment for the Artifact tool, which adds the skeleton itself.
