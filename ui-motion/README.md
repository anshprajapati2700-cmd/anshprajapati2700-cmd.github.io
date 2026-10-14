# Workshop UI motion

An 8 s seamless loop (480 frames, 60 fps, 1440 x 1440) of the Agent Workshop UI, built with the "UI MOTION" prompt: one continuous
morph, a real cursor that drives every change, closed-form springs, every action on a 120 BPM beat. Black, white and one accent
(`#D97757`). Last line of copy: **"Your agents. Working, or not."**

| file | what it is |
| --- | --- |
| `index.html` | the whole piece: `window.renderAt(t)` / `window.seek(t)`, every pixel a function of `t`, no CSS transitions, no timers |
| `loop.mp4` | the video: H.264 (crf 14, yuv420p) + AAC click track, exactly 8.000 s |
| `beat-sheet.png` | one frame per beat, taken from the MP4, for a quick read of the story |
| `track.wav` | the click track, 48 kHz stereo 16-bit, 8.000 s, tails wrapped around the loop point |
| `beats.js` | the beat grid, measured from `track.wav`, which `index.html` snaps every action to |
| `tools/` | everything that made the above (see "Rebuild") |

`index.html` opened in a browser sits on frame 0; call `renderAt(t)` in the console to scrub (`t` wraps at 8 s).

## Beat map (120 BPM, 1 beat = 0.5 s = 30 frames)

| beat | t | action |
| --- | --- | --- |
| 1-2 | 0.0 | hold the hero |
| 3 | 1.0 | cursor goes to **Connect agent**, camera zooms in, button lifts |
| 4 | 1.5 | click: the pill morphs into a loader ring (label slides out, ring slides in) |
| 5 | 2.0 | the ring closes and a check draws; button turns accent |
| 6 | 2.5 | **Outreach agent** row rises into the list, camera moves to the list, button returns |
| 7 | 3.0 | click the row: the panel slides in, camera moves to it |
| 8 | 3.5 | "Approve batch" types out (40 cps) |
| 9 | 4.0 | click **Needs me**: row and chip turn accent, status line rolls, `!` badge pops, footer count rolls |
| 10 | 4.5 | click close: panel leaves, the needs-you row jumps to the top, the others shift down |
| 11 | 5.0 | click the row: it grows into a detail card, the bars spring up one after another |
| 12 | 5.5 | cursor sweeps the bars, a tooltip pops and hops from Wed to Fri |
| 13 | 6.0 | grab the **Report every** slider and drag 7 h down to 2 h |
| 14 | 6.5 | click the **Notify me** toggle |
| 15 | 7.0 | click **Done**: card collapses, row leaves right, camera pulls back, cursor returns to rest |
| 16 | 7.5 | settle: the last frame is the first frame |

Cursor moves depart a half beat (or a sixteenth) before the beat they land on; times are `T(beat, sixteenths)` in `index.html`,
resolved against `beats.js`. The eight click sounds in `track.wav` sit on the click beats `4 7 9 10 11 13 14 15`
(`CLICK_BEATS` in `tools/audio.py` must match `clickAt` in `index.html`).

## What the prompt's rules became

* **No cuts, no fades.** Nothing changes opacity between states. The label slides out as the ring slides in; the row slides in from
  below the window clip and leaves right; the status line and footer are rolling strips; the detail card is the row itself growing
  (everything inside is laid out at final size and revealed by the clip); the tooltip scales in. Colours between ink, white and the
  accent are springs, not switches.
* **Springs.** `springStep(zeta, w)` is the closed-form unit step response. A channel is a sum of steps, so a target that changes
  mid-flight keeps its momentum. UI: damping 0.75, omega 15.5 (2 % settle in about 0.35 s, 2.8 % overshoot). Cursor: damping 0.8,
  x and y omegas 17 and 15 so diagonals arc a little. Camera: damping 1.0, omega 12, no overshoot.
* **Camera.** Every key fills the frame (1.7x on the button, 1.25x list, 1.45x panel, 1.15x re-order, 1.25x card) and pulls back to 1x
  at the end. All keys keep the tagline out of frame. Text is checked at 1x after each zoom: no `will-change`, no scaled raster.
* **Dead time.** The longest stretch with no visible motion is 1.2 s (2.4 beats), straddling the loop point; the hero holds for 2 beats.
* **Closing the loop.** A spring never quite arrives, so between 0.6 s and 0.85 s after a step the remainder is eased to exactly zero
  and the channel returns its target bit-for-bit; nothing steps after 7.125 s. Frame 479 equals frame 0 pixel for pixel, cursor
  included (checked on the PNG frames; the H.264 decode differs by encoder residual only). `seek(7.25)` twice gives identical pixels.

## Render

* **Motion blur.** The prompt says 4 subframes per frame. Four samples across a frame leave four separate ghost copies when something
  moves more than ~25 px per frame (the panel slide and camera moves do), so 4 is the floor and fast frames get more: `tools/plan.py`
  picks 4, 8 or 16 subframes per frame from the first pass's frame-to-frame change (187 / 66 / 227 frames, 4908 shots in all).
  Subframes are averaged in sRGB over a 180 degree shutter centred on the frame.
* **Chrome determinism.** Two things made a frame depend on which frames had been drawn before it: Chrome re-rasters only invalidated
  rectangles (fixed with `--disable-partial-raster`), and after about 30 screenshots in one page a few antialiased corner pixels
  drift (fixed by opening a fresh page every 8 shots). Both were found because frame 479 differed from frame 0 by 409 pixels.
* **Audio.** `tools/audio.py` (numpy only): wood-block ticks on every beat, accented on the bar line, plus a mouse-down thump and
  release tick on each click, peak -3 dBFS. The grid in `beats.js` is measured from the audio, not copied from the BPM; the onsets
  fall within 0.1 ms of the 120 BPM grid.
* **Mux.** The prompt's command, with an explicit AAC encode: `ffmpeg -framerate 60 -i frames/%05d.png -i track.wav -shortest
  -c:v libx264 -crf 14 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart loop.mp4`.

## Rebuild

Needs Playwright (the scripts import it through `../../liquid-chrome/tools/lib.mjs`), numpy, Pillow and ffmpeg. `SP` is any scratch directory.

```sh
python3 tools/audio.py .                                   # track.wav + beats.js
node tools/render.mjs $SP/sub0 none 0 1                    # first pass, 4 subframes (or run 4 workers: ... 0 4, 1 4, 2 4, 3 4)
python3 tools/average.py $SP/sub0 $SP/frames0              # first-pass frames
python3 tools/plan.py $SP/frames0 $SP/plan.json            # subframes per frame
node tools/render.mjs $SP/sub $SP/plan.json 0 4            # ...and workers 1, 2, 3 in parallel (about 3 min on 4 cores)
python3 tools/average.py $SP/sub $SP/frames $SP/plan.json
tools/mux.sh $SP/frames loop.mp4
python3 tools/verify.py $SP/frames loop.mp4                # seam, dead time, per-beat motion
node tools/stills.mjs $SP/stills                           # named stills for each beat + seek determinism
```
