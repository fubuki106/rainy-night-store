#!/bin/bash
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/.." && pwd)
output="${1:-$(dirname "$repo")}"
mkdir -p "$output"
output=$(cd "$output" && pwd)
title='雨夜便利店·末班底片.app'
work=$(mktemp -d "${TMPDIR:-/tmp}/rainy-night-build.XXXXXX")
publish=$(mktemp -d "$output/.雨夜打包.XXXXXX")
target="$output/$title"
cleanup() {
    if [[ -d "$publish/previous" && ! -e "$target" ]]; then mv "$publish/previous" "$target"; fi
    rm -rf "$work" "$publish"
}
trap cleanup EXIT
app="$work/$title"
res="$app/Contents/Resources"
/bin/mkdir -p "$app/Contents/MacOS" "$res/Game"
/bin/cp -X "$here/Info.plist" "$app/Contents/Info.plist"
/usr/bin/plutil -lint "$app/Contents/Info.plist" >/dev/null
# Carry every runtime folder, including newer chapters and their byte-identical
# art. Build files, git internals and local regression outputs stay out of the app.
/usr/bin/rsync -a --exclude='.*' --exclude='/macOS/' --exclude='/node_modules/' --exclude='/tests/' --exclude='/verification/' --exclude='*.app/' --include='CREDITS.md' --exclude='*.md' "$repo/" "$res/Game/"
/bin/cp -X "$repo/CREDITS.md" "$res/Game/CREDITS.md"
/usr/bin/xcrun swift "$here/icon.swift" "$work/RainyNight.iconset"
/usr/bin/iconutil --convert icns -o "$res/RainyNight.icns" "$work/RainyNight.iconset"
for arch in arm64 x86_64; do
    /usr/bin/xcrun swiftc -swift-version 5 -O -whole-module-optimization -target "$arch-apple-macosx13.0"         "$here/main.swift" "$here/Proof.swift" "$here/BundleSite.swift" -o "$work/RainyNight-$arch"
done
/usr/bin/xcrun lipo -create "$work/RainyNight-arm64" "$work/RainyNight-x86_64" -output "$app/Contents/MacOS/RainyNight"
/usr/bin/xattr -cr "$app"
/usr/bin/codesign --force --sign - --timestamp=none "$app" >/dev/null
/usr/bin/codesign --verify --strict --all-architectures "$app"
# Sign off the synced Desktop, where Finder may attach metadata during signing.
# Stage the signed bytes on the delivery volume before replacing the prior copy.
/usr/bin/ditto --norsrc --noextattr "$app" "$publish/$title"
/usr/bin/xattr -cr "$publish/$title"
/usr/bin/xattr -d com.apple.FinderInfo "$publish/$title" 2>/dev/null || true
/usr/bin/codesign --verify --all-architectures "$publish/$title"
if [[ -e "$target" ]]; then mv "$target" "$publish/previous"; fi
mv "$publish/$title" "$target"
/usr/bin/xattr -d com.apple.FinderInfo "$target" 2>/dev/null || true
if ! check=$(/usr/bin/codesign --verify --strict --all-architectures --verbose=4 "$target" 2>&1); then
    # A synced Desktop can put FinderInfo back on the outer bundle as soon
    # as it is renamed. Verify the actual published contents as they travel
    # in the metadata-free ZIP. Any other signing failure remains fatal.
    if [[ "$check" != *"Disallowed xattr com.apple.FinderInfo found on "* ]] ||
       ! /usr/bin/xattr -p com.apple.FinderInfo "$target" >/dev/null 2>&1; then
        printf '%s\n' "$check" >&2; exit 1
    fi
    /usr/bin/codesign --verify --all-architectures "$target"
    /usr/bin/ditto --norsrc --noextattr "$target" "$work/check.app"
    /usr/bin/codesign --verify --strict --all-architectures "$work/check.app"
fi
printf '%s\n' "$target"
