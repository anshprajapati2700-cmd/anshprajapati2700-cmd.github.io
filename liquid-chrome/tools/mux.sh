#!/bin/bash
# usage: mux.sh <frames_dir> <audio_dir> <out_dir>
#   frames_dir/00000.png..00359.png (render.mjs), audio_dir/{master,article}.wav (audio.mjs export)
# Single-loop article MP4: x264 + AAC from the article WAV (96-sample raised-cosine fades on the first and last 96 samples).
# The master WAV is kept untouched for the two-loop post:  ffmpeg -stream_loop 1 -i liquid-chrome.mp4 ... or loop master.wav twice.
set -e
frames=$1; audio=$2; out=$3
mkdir -p "$out"
ffmpeg -hide_banner -loglevel error -y -framerate 60 -i "$frames/%05d.png" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p \
  -vf "scale=out_color_matrix=bt709:out_range=tv" -colorspace bt709 -color_primaries bt709 -color_trc bt709 -r 60 -an "$out/.video.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$out/.video.mp4" -i "$audio/article.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
  -movflags +faststart -metadata title="Liquid Chrome" "$out/liquid-chrome.mp4"
rm -f "$out/.video.mp4"
cp "$audio/master.wav" "$out/liquid-chrome-loop.wav"
ffprobe -v error -show_entries stream=codec_type,duration,nb_frames,width,height -of compact "$out/liquid-chrome.mp4"
