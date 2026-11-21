#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

build_dir=$(mktemp -d .cloudflare-build.XXXXXX)
trap 'rm -rf -- "$build_dir"' EXIT

mkdir -p "$build_dir/assets/home/images" "$build_dir/2027F1"
cp index.html driver.html dashboard.html config.js api.js "$build_dir/"
cp ../2027F1/index.html "$build_dir/2027F1/"
cp ../assets/home/images/656135d2-e164-4ec4-90fa-62178aa5b6aa.jpg \
   ../assets/home/images/a55e0935-8f04-4299-b2cc-d64a1b175dc7.jpg \
   "$build_dir/assets/home/images/"

rm -rf -- dist
mv -- "$build_dir" dist
