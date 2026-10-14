#!/bin/sh
# usage: tools/mux.sh <frames_dir> [out.mp4]     the prompt's command, plus an explicit AAC encode and faststart
set -e
FR=${1:?frames dir}; OUT=${2:-loop.mp4}
ffmpeg -y -hide_banner -loglevel error -framerate 60 -i "$FR/%05d.png" -i track.wav -shortest \
  -c:v libx264 -crf 14 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT"
