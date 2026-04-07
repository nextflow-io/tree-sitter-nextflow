#!/usr/bin/env bash
# install-ast-grep.sh - Installation helper for ast-grep Nextflow support
#
# This script sets up ast-grep to work with Nextflow files by:
# 1. Detecting your platform
# 2. Verifying the appropriate parser library exists
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
        MINGW*|MSYS*|CYGWIN*)
            platform_triple="x86_64-pc-windows-msvc"
            ;;
        *)
            echo -e "${RED}Error: Unsupported operating system: $os${NC}"
            return 1
            ;;
    esac

    echo "$platform_triple"
}

# Verify library exists for platform
verify_library() {
    local platform="$1"
    local lib_path=""

    case "$platform" in
        aarch64-apple-darwin)
            lib_path="$PROJECT_ROOT/lib/macos-arm64/libnextflow.dylib"
            ;;
        x86_64-apple-darwin)
            lib_path="$PROJECT_ROOT/lib/macos-x64/libnextflow.dylib"
            ;;
        x86_64-unknown-linux-gnu)
            lib_path="$PROJECT_ROOT/lib/linux-x64/libnextflow.so"
            ;;
        aarch64-unknown-linux-gnu)
            lib_path="$PROJECT_ROOT/lib/linux-arm64/libnextflow.so"
            ;;
        x86_64-pc-windows-msvc)
            lib_path="$PROJECT_ROOT/lib/windows-x64/nextflow.dll"
            ;;
        *)
            echo -e "${RED}Error: Unknown platform: $platform${NC}"
            return 1
            ;;
    esac

    if [[ ! -f "$lib_path" ]]; then
        echo -e "${RED}Error: Parser library not found for platform $platform${NC}"
        echo -e "${YELLOW}Expected: $lib_path${NC}"
        echo ""
        echo "You may need to build it manually:"
        echo "  tree-sitter build --output libnextflow.so"
        echo ""
        echo "Or request support for your platform at:"
        echo "  https://github.com/nextflow-io/tree-sitter-nextflow/issues"
        return 1
    fi

    echo "$lib_path"
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
    echo -e "${BLUE}2. Verifying parser library...${NC}"
    LIB_PATH=$(verify_library "$PLATFORM")
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
    echo "  $PROJECT_ROOT/docs/ast-grep-patterns.md"
}

# Run main function
main
