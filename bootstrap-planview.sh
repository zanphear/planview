#!/bin/bash
# Planview — Project Bootstrap
# Run this from your WSL home directory before launching Claude Code
# Usage: bash bootstrap-planview.sh

set -e

PROJECT_DIR="$HOME/projects/planview"

echo "=== Planview Project Bootstrap ==="
echo ""

# Create project directory
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  $PROJECT_DIR already exists"
    read -p "Continue and add missing files? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "📁 Creating $PROJECT_DIR"
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Create docs directory and copy design docs
mkdir -p docs

echo "📄 Checking for design documents..."

# Check if design docs exist (user needs to copy these)
if [ ! -f "docs/design-spec.md" ]; then
    echo "⚠️  docs/design-spec.md not found"
    echo "   Copy your design-spec.md to $PROJECT_DIR/docs/design-spec.md"
fi

if [ ! -f "docs/implementation-plan.md" ]; then
    echo "⚠️  docs/implementation-plan.md not found"
    echo "   Copy your implementation-plan.md to $PROJECT_DIR/docs/implementation-plan.md"
fi

# Copy CLAUDE.md if not present
if [ ! -f "CLAUDE.md" ]; then
    echo "📄 CLAUDE.md needs to be placed at $PROJECT_DIR/CLAUDE.md"
fi

# Copy build prompt if not present
if [ ! -f "planview-build-prompt.md" ]; then
    echo "📄 planview-build-prompt.md needs to be placed at $PROJECT_DIR/planview-build-prompt.md"
fi

# Create essential directories
mkdir -p backend frontend nginx scripts dockge

# Initialise git if not already
if [ ! -d ".git" ]; then
    echo "🔧 Initialising git repository"
    git init
    cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*.egg-info/
.eggs/
dist/
build/
*.egg
.venv/
venv/

# Node
node_modules/
frontend/dist/
frontend/.vite/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Docker
postgres_data/

# Uploads
uploads/

# OS
.DS_Store
Thumbs.db

# Build prompt (not needed in repo)
planview-build-prompt.md
EOF
    echo "✅ Git initialised with .gitignore"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy these files into $PROJECT_DIR:"
echo "     - CLAUDE.md → $PROJECT_DIR/CLAUDE.md"
echo "     - planview-build-prompt.md → $PROJECT_DIR/planview-build-prompt.md"
echo "     - design-spec.md → $PROJECT_DIR/docs/design-spec.md"
echo "     - implementation-plan.md → $PROJECT_DIR/docs/implementation-plan.md"
echo ""
echo "  2. Launch Claude Code:"
echo "     cd $PROJECT_DIR"
echo "     claude"
echo ""
echo "  3. First message to Claude Code:"
echo "     Read planview-build-prompt.md and follow it exactly. Start with Phase 1."
echo ""
echo "  4. Go to bed. Check results in the morning."
echo ""
