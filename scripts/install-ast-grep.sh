#!/usr/bin/env bash
# install-ast-grep.sh - Installation helper for ast-grep Nextflow support
#
# Installs sgconfig.yml, the bundled rules and outline rules, and the parser
# library for your platform into the current directory (or ~/.config/ast-grep
# with --global). ast-grep resolves the paths in sgconfig.yml relative to the
# file, so everything is installed side by side.
#
# Run it from a clone, or pipe it to bash to install from the latest release:
#   curl -fsSL https://raw.githubusercontent.com/nextflow-io/tree-sitter-nextflow/main/scripts/install-ast-grep.sh | bash

set -euo pipefail

REPO="nextflow-io/tree-sitter-nextflow"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    cat <<'EOF'
Usage: install-ast-grep.sh [--local | --global]

  --local     Install into the current directory (default)
  --global    Install into ~/.config/ast-grep/ (use with ast-grep -c)
  --help      Show this help message
EOF
}

INSTALL_MODE="local"
while [[ $# -gt 0 ]]; do
    case $1 in
        --global) INSTALL_MODE="global"; shift ;;
        --local)  INSTALL_MODE="local"; shift ;;
        --help|-h) usage; exit 0 ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}" >&2
            usage >&2
            exit 1
            ;;
    esac
done

if [[ "$INSTALL_MODE" == "global" ]]; then
    TARGET="$HOME/.config/ast-grep"
else
    TARGET="$(pwd)"
fi

# BASH_SOURCE is unset when the script is piped to bash.
SCRIPT_PATH="${BASH_SOURCE[0]:-}"
CLONE_ROOT=""
if [[ -n "$SCRIPT_PATH" && -f "$(dirname "$SCRIPT_PATH")/../sgconfig.yml" ]]; then
    CLONE_ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
fi

detect_platform() {
    case "$(uname -s)/$(uname -m)" in
        Darwin/arm64|Darwin/aarch64) echo "macos-arm64 dylib" ;;
        Darwin/x86_64)               echo "macos-x64 dylib" ;;
        Linux/x86_64)                echo "linux-x64 so" ;;
        Linux/aarch64|Linux/arm64)   echo "linux-arm64 so" ;;
        *)
            echo -e "${RED}Error: Unsupported platform: $(uname -s) $(uname -m)${NC}" >&2
            return 1
            ;;
    esac
}

# Sets SRC to a source tree and VERSION to its release version: the clone
# this script lives in, or the latest release's source archive.
resolve_source() {
    if [[ -n "$CLONE_ROOT" ]]; then
        SRC="$CLONE_ROOT"
        VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SRC/tree-sitter.json" | head -1)
        return 0
    fi

    # /releases/latest redirects to /releases/tag/v<version>.
    VERSION=$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" \
        | sed -n 's|.*/tag/v||p')
    if [[ -z "$VERSION" ]]; then
        echo -e "${RED}Error: Could not find the latest release of $REPO${NC}" >&2
        return 1
    fi

    SRC=$(mktemp -d)
    trap 'rm -rf "$SRC"' EXIT
    curl -fsSL "https://github.com/$REPO/archive/refs/tags/v$VERSION.tar.gz" \
        | tar -xz -C "$SRC" --strip-components=1
}

# Installs the parser library for this platform at $TARGET/lib/<dir>/, from the
# source tree, the GitHub release, or a local build, in that order.
install_library() {
    local dir="$1" ext="$2"
    local rel="lib/$dir/libnextflow.$ext"
    local dest="$TARGET/$rel"

    mkdir -p "$(dirname "$dest")"
    if [[ -f "$dest" ]]; then
        echo "   Using existing $dest"
        return 0
    fi
    if [[ -f "$SRC/$rel" ]]; then
        cp "$SRC/$rel" "$dest"
        return 0
    fi

    local url="https://github.com/$REPO/releases/download/v$VERSION/libnextflow-$dir.$ext"
    echo "   Downloading $url"
    if curl -fsL -o "$dest" "$url"; then
        return 0
    fi
    rm -f "$dest"

    echo -e "   ${YELLOW}No prebuilt library for v$VERSION, building locally${NC}"
    if (cd "$SRC" && npm ci --silent && npx tree-sitter build --output "$dest"); then
        return 0
    fi

    echo -e "${RED}Error: Could not download or build the parser library${NC}" >&2
    echo "Building needs Node.js and a C compiler. Report platform issues at:" >&2
    echo "  https://github.com/$REPO/issues" >&2
    return 1
}

install_config() {
    if [[ "$SRC" -ef "$TARGET" ]]; then
        echo "   Installing into the clone itself; config and rules already in place"
        return 0
    fi

    if [[ -f "$TARGET/sgconfig.yml" ]]; then
        echo -e "${YELLOW}Warning: $TARGET/sgconfig.yml already exists${NC}"
        read -p "Overwrite? [y/N] " -n 1 -r < /dev/tty || REPLY="n"
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Installation cancelled"
            return 1
        fi
    fi

    mkdir -p "$TARGET/rules" "$TARGET/outline"
    cp "$SRC/sgconfig.yml" "$TARGET/"
    cp "$SRC"/rules/*.yml "$TARGET/rules/"
    cp "$SRC"/outline/*.yml "$TARGET/outline/"
    echo -e "   ${GREEN}✓ Installed sgconfig.yml, rules/, and outline/ to $TARGET${NC}"
}

main() {
    echo -e "${BLUE}=== ast-grep Nextflow Installation ===${NC}"
    echo ""

    echo -e "${BLUE}1. Detecting platform...${NC}"
    local platform dir ext
    platform=$(detect_platform)
    read -r dir ext <<< "$platform"
    echo -e "   Platform: ${GREEN}$dir${NC}"
    echo ""

    echo -e "${BLUE}2. Fetching sources...${NC}"
    resolve_source
    echo -e "   Version: ${GREEN}$VERSION${NC}"
    echo ""

    echo -e "${BLUE}3. Installing configuration...${NC}"
    install_config
    echo ""

    echo -e "${BLUE}4. Installing parser library...${NC}"
    install_library "$dir" "$ext"
    echo ""

    local config_flag=""
    if [[ "$INSTALL_MODE" == "global" ]]; then
        config_flag=" -c $TARGET/sgconfig.yml"
    fi

    echo -e "${GREEN}=== Installation Complete ===${NC}"
    echo ""
    echo "You can now use ast-grep with Nextflow files:"
    echo ""
    echo "  ast-grep run$config_flag -l nextflow -p 'process \$NAME { \$\$\$ }' ."
    echo "  ast-grep scan$config_flag"
    echo ""
    if [[ "$INSTALL_MODE" == "global" ]]; then
        echo "ast-grep only reads sgconfig.yml from the project directory or its parents,"
        echo "so pass -c to use the global install."
        echo ""
    fi
    echo "Docs: https://github.com/$REPO/tree/main/docs/ast-grep"
}

main
