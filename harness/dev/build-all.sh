#!/bin/sh
# Cross-compile a render binary for every shipped platform, named for the machine that runs it.
#
# WHY: bin/ is inside package.json files[], so the npm tarball carries whatever the PUBLISHING
# machine built. Published from an Apple Silicon Mac it shipped a Mach-O arm64 binary to every Intel
# Mac and every Linux box, which is why the engine "did not work on other people's laptops".
# cli/vawe.mjs now looks for vawe-<platform>-<arch> first and reads the magic bytes back before it
# spawns anything, so a wrong build is named rather than handed to the OS loader.
#
# Go cross-compiles with no toolchain per target, so this costs one command and no dependencies.
set -e
for t in darwin-arm64 darwin-amd64 linux-amd64 linux-arm64 windows-amd64; do
  os=${t%%-*}
  arch=${t##*-}
  ext=""
  [ "$os" = "windows" ] && ext=".exe"
  echo "  building bin/vawe-$t$ext"
  GOOS=$os GOARCH=$arch go build -o "bin/vawe-$t$ext" ./cmd/render
done

echo ""
ls -lh bin/vawe-* | awk '{printf "  %-28s %s\n", $9, $5}'
echo "  NOTE: five binaries is ~55MB. scripts/dev/pack-check.mjs caps the tarball at 25MB, so"
echo "  publishing all five needs per-platform optionalDependencies (the esbuild/swc pattern)."
