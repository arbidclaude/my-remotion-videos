#!/usr/bin/env bash
# Mixkit licences allow use in videos but not redistribution of the files themselves,
# so the music and Mixkit SFX are downloaded here at build time and git-ignored.
set -euo pipefail
cd "$(dirname "$0")/../.."
get() { [ -s "$2" ] || { echo "fetch $2"; curl -sSfL -o "$2" "$1"; }; }
mkdir -p public/audio public/sfx
get https://assets.mixkit.co/music/168/168.mp3 public/audio/night-sky.mp3
get https://assets.mixkit.co/music/993/993.mp3 public/audio/finding-myself.mp3
grep -o '| `[a-z0-9-]*\.mp3` | [^|]* | https://[^ |]*' public/sfx/ATTRIBUTION.md | while IFS='|' read -r _ f _ url; do
  f=$(echo "$f" | tr -d ' `'); url=$(echo "$url" | tr -d ' ')
  get "$url" "public/sfx/$f"
done
echo "assets ready; now run: python3 -I scripts/audio/mix.py src/v1/timeline.json public/audio/mix-v1.wav (and v2)"
