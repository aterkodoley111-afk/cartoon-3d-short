#!/bin/bash
# usage: tools/assemble.sh <render dir with chunks/> <mix.wav> <out.mp4>
# concat the rendered chunks, upscale 1080x1920 -> 1440x2560 (lanczos), mux the mix, exact length
set -e
D=$1; MIX=$2; OUTF=$3
cd "$D"
ls chunks/c_*.mp4 | sort | sed "s/^/file '/; s/$/'/" > list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i list.txt -c copy video_1080.mp4
ffmpeg -loglevel error -y -i video_1080.mp4 -i "$MIX" -map 0:v:0 -map 1:a:0 -vf "scale=1440:2560:flags=lanczos" \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUTF"
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames:format=duration -of compact "$OUTF"
