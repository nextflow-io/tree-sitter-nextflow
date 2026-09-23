#!/usr/bin/env bash
# install-ast-grep.sh - Installation helper for ast-grep Nextflow support
#
# This script sets up ast-grep to work with Nextflow files by:
# 1. Detecting your platform
# 2. Downloading the parser library from the matching GitHub release
#    (or building it locally if no prebuilt library exists)
# 3. Installing sgconfig.yml to your project or global config
#
# Usage:
#   ./scripts/install-ast-grep.sh [OPTIONS]
#
# Options:
#   --global    Install to ~/.config/ast-grep/ for system-wide use
#   --local     Install to current directory (default)
#   --help      Show this help message

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default installation mode
INSTALL_MODE="local"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --global)
            INSTALL_MODE="global"
            shift
            ;;
        --local)
            INSTALL_MODE="local"
            shift
            ;;
        --help|-h)
            sed -n '2,/^$/p' "$0" | sed 's/^# //' | sed 's/^#//'
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Detect platform
detect_platform() {
    local os arch platform_triple

    os="$(uname -s)"
    arch="$(uname -m)"

    case "$os" in
        Darwin)
            case "$arch" in
                arm64|aarch64)
                    platform_triple="aarch64-apple-darwin"
                    ;;
                x86_64)
                    platform_triple="x86_64-apple-darwin"
                    ;;
                *)
                    echo -e "${RED}Error: Unsupported macOS architecture: $arch${NC}"
                    return 1
                    ;;
            esac
            ;;
        Linux)
            case "$arch" in
                x86_64)
                    platform_triple="x86_64-unknown-linux-gnu"
                    ;;
                aarch64|arm64)
                    platform_triple="aarch64-unknown-linux-gnu"
                    ;;
                *)
                    echo -e "${RED}Error: Unsupported Linux architecture: $arch${NC}"
                    return 1
                    ;;
            esac
            ;;
        *)
            echo -e "${RED}Error: Unsupported operating system: $os${NC}"
            return 1
            ;;
    esac

    echo "$platform_triple"
}

# Print the library path for a platform, downloading or building it if missing.
# Progress messages go to stderr so callers can capture the path from stdout.
ensure_library() {
    local platform="$1"
    local dir ext

    case "$platform" in
        aarch64-apple-darwin)      dir="macos-arm64"; ext="dylib" ;;
        x86_64-apple-darwin)       dir="macos-x64";   ext="dylib" ;;
        x86_64-unknown-linux-gnu)  dir="linux-x64";   ext="so" ;;
        aarch64-unknown-linux-gnu) dir="linux-arm64"; ext="so" ;;
        *)
            echo -e "${RED}Error: Unknown platform: $platform${NC}" >&2
            return 1
            ;;
    esac

    local lib_path="$PROJECT_ROOT/lib/$dir/libnextflow.$ext"
    if [[ -f "$lib_path" ]]; then
        echo "$lib_path"
        return 0
    fi

    local version url
    version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$PROJECT_ROOT/tree-sitter.json" | head -1)
    url="https://github.com/nextflow-io/tree-sitter-nextflow/releases/download/v$version/libnextflow-$dir.$ext"
    mkdir -p "$(dirname "$lib_path")"

    echo "   Downloading $url" >&2
    if curl -fsL -o "$lib_path" "$url"; then
        echo "$lib_path"
        return 0
    fi
    rm -f "$lib_path"

    echo -e "   ${YELLOW}No prebuilt library for v$version, building locally${NC}" >&2
    if (cd "$PROJECT_ROOT" && npm ci --silent && npx tree-sitter build --output "$lib_path") >&2; then
        echo "$lib_path"
        return 0
    fi

    echo -e "${RED}Error: Could not download or build the parser library${NC}" >&2
    echo "Building needs Node.js and a C compiler. Report platform issues at:" >&2
    echo "  https://github.com/nextflow-io/tree-sitter-nextflow/issues" >&2
    return 1
}

# Install configuration
install_config() {
    local target_dir target_file

    if [[ "$INSTALL_MODE" == "global" ]]; then
        target_dir="$HOME/.config/ast-grep"
        target_file="$target_dir/sgconfig.yml"

        echo -e "${BLUE}Installing ast-grep config globally...${NC}"

        # Create directory if needed
        mkdir -p "$target_dir"

        # Copy config
        cp "$PROJECT_ROOT/sgconfig.yml" "$target_file"

        echo -e "${GREEN}✓ Installed to: $target_file${NC}"
        echo ""
        echo -e "${YELLOW}Note: Global config requires absolute paths to work from any directory.${NC}"
        echo "You may need to update libraryPath in $target_file with absolute paths."

    else
        target_dir="$(pwd)"
        target_file="$target_dir/sgconfig.yml"

        echo -e "${BLUE}Installing ast-grep config to current directory...${NC}"

        # Check if config already exists
        if [[ -f "$target_file" ]]; then
            echo -e "${YELLOW}Warning: sgconfig.yml already exists${NC}"
            read -p "Overwrite? [y/N] " -n 1 -r < /dev/tty || REPLY="n"
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Installation cancelled"
                return 1
            fi
        fi

        # Copy config
        cp "$PROJECT_ROOT/sgconfig.yml" "$target_file"

        echo -e "${GREEN}✓ Installed to: $target_file${NC}"
    fi
}

# Main installation flow
main() {
    echo -e "${BLUE}=== ast-grep Nextflow Installation ===${NC}"
    echo ""

    # Detect platform
    echo -e "${BLUE}1. Detecting platform...${NC}"
    PLATFORM=$(detect_platform)
    echo -e "   Platform: ${GREEN}$PLATFORM${NC}"
    echo ""

    # Verify library
    echo -e "${BLUE}2. Fetching parser library...${NC}"
    LIB_PATH=$(ensure_library "$PLATFORM")
    echo -e "   Library: ${GREEN}$LIB_PATH${NC}"
    echo -e "   Size: $(du -h "$LIB_PATH" | cut -f1)"
    echo ""

    # Install config
    echo -e "${BLUE}3. Installing configuration...${NC}"
    install_config
    echo ""

    # Success message
    echo -e "${GREEN}=== Installation Complete ===${NC}"
    echo ""
    echo "You can now use ast-grep with Nextflow files:"
    echo ""
    echo -e "  ${BLUE}# Search for process definitions${NC}"
    echo "  ast-grep -l nextflow -p 'process _NAME { ___ }' ."
    echo ""
    echo -e "  ${BLUE}# Run linting rules${NC}"
    echo "  ast-grep scan"
    echo ""
    echo -e "  ${BLUE}# Find deprecated patterns${NC}"
    echo "  ast-grep -l nextflow -p 'Channel.from(\$\$\$)' ."
    echo ""
    echo "For more patterns and examples, see:"
    echo "  $PROJECT_ROOT/docs/ast-grep/patterns.md"
}

# Run main function
main
