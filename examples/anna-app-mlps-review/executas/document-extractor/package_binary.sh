#!/usr/bin/env bash
set -euo pipefail

TOOL_ID="${TOOL_ID:-tool-intern2-document-extractor-u2n2j8x5}"
PLATFORM="${PLATFORM:-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)}"
case "$PLATFORM" in
  darwin-arm64|darwin-x86_64|linux-x86_64) ;;
  darwin-aarch64) PLATFORM="darwin-arm64" ;;
  darwin-x86_64) PLATFORM="darwin-x86_64" ;;
  linux-amd64) PLATFORM="linux-x86_64" ;;
  *)
    echo "Unsupported or non-normalized platform: $PLATFORM" >&2
    exit 1
    ;;
esac

BINARY="dist/${TOOL_ID}"
if [[ ! -x "$BINARY" ]]; then
  echo "Missing executable: ${BINARY}" >&2
  echo "Build it first, for example:" >&2
  echo "  pyinstaller --onefile --clean --noupx --name \"${TOOL_ID}\" document_extractor_plugin.py" >&2
  exit 1
fi

STAGE_DIR="dist-anna/${TOOL_ID}-${PLATFORM}"
ASSET="${TOOL_ID}-${PLATFORM}.tar.gz"

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/bin"
cp "$BINARY" "$STAGE_DIR/bin/${TOOL_ID}"

cat > "$STAGE_DIR/manifest.json" <<JSON
{
  "entrypoint": "bin/${TOOL_ID}",
  "supports_protocol": true
}
JSON

(
  cd "$STAGE_DIR"
  tar czf "../../dist/${ASSET}" .
)

shasum -a 256 "dist/${ASSET}" > "dist/${ASSET}.sha256"
echo "dist/${ASSET}"
cat "dist/${ASSET}.sha256"
