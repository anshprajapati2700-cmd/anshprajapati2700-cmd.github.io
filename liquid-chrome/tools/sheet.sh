#!/bin/bash
# usage: sheet.sh outname res cols t1 t2 ...   (renders frames and tiles them into one labelled contact sheet)
SP=${SHEET_DIR:-/tmp/lc-sheets}
name=$1; res=$2; cols=$3; shift 3
d=$SP/$name; rm -rf $d; mkdir -p $d
node "$(dirname "$0")/shot.mjs" $d $res "$@" 2>&1 | grep -E "error|ready" | head -3
args=()
for t in "$@"; do f=$(printf "%s/t_%.3f.png" $d $t); args+=(-label "$t" "$f"); done
montage "${args[@]}" -tile ${cols}x -geometry +2+2 -pointsize 14 $SP/$name.png
echo $SP/$name.png
