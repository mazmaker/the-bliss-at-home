#!/bin/bash

# MCP Status Checker Script
# ตรวจสอบสถานะ MCP servers ทั้งหมด

echo "========================================="
echo "🔍 MCP Servers Status Checker"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check .mcp.json exists
echo "📄 Checking .mcp.json..."
if [ -f ".mcp.json" ]; then
    echo -e "${GREEN}✓${NC} .mcp.json found"
else
    echo -e "${RED}✗${NC} .mcp.json NOT found"
    echo "   Please create .mcp.json file"
    exit 1
fi

echo ""

# Check each MCP server configuration
echo "🔧 Checking MCP Server Configurations..."
echo ""

# 1. Supabase
echo "1️⃣  Supabase MCP"
if grep -q '"supabase"' .mcp.json; then
    echo -e "   Config: ${GREEN}✓${NC} Found in .mcp.json"

    # Check npx
    if command -v npx &> /dev/null; then
        echo -e "   npx: ${GREEN}✓${NC} Available ($(npx --version))"
    else
        echo -e "   npx: ${RED}✗${NC} Not found"
    fi
else
    echo -e "   Config: ${RED}✗${NC} NOT found in .mcp.json"
fi

echo ""

# 2. Context7
echo "2️⃣  Context7 MCP"
if grep -q '"context7"' .mcp.json; then
    echo -e "   Config: ${GREEN}✓${NC} Found in .mcp.json"

    # Extract path from .mcp.json
    CONTEXT7_PATH=$(grep -A 5 '"context7"' .mcp.json | grep "context7-mcp" | sed 's/.*"\(.*\)".*/\1/')

    if [ -f "$CONTEXT7_PATH" ]; then
        echo -e "   Package: ${GREEN}✓${NC} Found at path"
    else
        echo -e "   Package: ${RED}✗${NC} NOT found at path"
        echo -e "   ${YELLOW}→${NC} Run: npm install -g @upstash/context7-mcp"
    fi
else
    echo -e "   Config: ${RED}✗${NC} NOT found in .mcp.json"
fi

echo ""

# 3. shadcn-ui
echo "3️⃣  shadcn-ui MCP"
if grep -q '"shadcn-ui"' .mcp.json; then
    echo -e "   Config: ${GREEN}✓${NC} Found in .mcp.json"

    # Extract path from .mcp.json
    SHADCN_PATH=$(grep -A 5 '"shadcn-ui"' .mcp.json | grep "shadcn-ui-mcp-server" | sed 's/.*"\(.*\)".*/\1/')

    if [ -f "$SHADCN_PATH" ]; then
        echo -e "   Package: ${GREEN}✓${NC} Found at path"
    else
        echo -e "   Package: ${RED}✗${NC} NOT found at path"
        echo -e "   ${YELLOW}→${NC} Run: npm install -g @jpisnice/shadcn-ui-mcp-server"
    fi
else
    echo -e "   Config: ${RED}✗${NC} NOT found in .mcp.json"
fi

echo ""

# 4. Playwright
echo "4️⃣  Playwright MCP"
if grep -q '"playwright"' .mcp.json; then
    echo -e "   Config: ${GREEN}✓${NC} Found in .mcp.json"

    # Check data directory
    if [ -d ".playwright-mcp" ]; then
        echo -e "   Data Dir: ${GREEN}✓${NC} .playwright-mcp exists"
    else
        echo -e "   Data Dir: ${YELLOW}⚠${NC}  .playwright-mcp not found (will be created)"
    fi
else
    echo -e "   Config: ${RED}✗${NC} NOT found in .mcp.json"
    echo -e "   ${YELLOW}→${NC} Add playwright config to .mcp.json"
fi

echo ""
echo "========================================="

# Check global settings
echo "⚙️  Checking Global Settings..."
echo ""

SETTINGS_FILE="$HOME/.claude/settings.json"
if [ -f "$SETTINGS_FILE" ]; then
    echo -e "${GREEN}✓${NC} ~/.claude/settings.json found"

    if grep -q '"enableAllProjectMcpServers": true' "$SETTINGS_FILE"; then
        echo -e "${GREEN}✓${NC} enableAllProjectMcpServers is enabled"
    else
        echo -e "${YELLOW}⚠${NC}  enableAllProjectMcpServers not found or disabled"
    fi
else
    echo -e "${RED}✗${NC} ~/.claude/settings.json NOT found"
fi

echo ""
echo "========================================="
echo "📊 Summary"
echo "========================================="

# Count configured servers
CONFIGURED=$(grep -c '"command"' .mcp.json)
echo "Configured MCP Servers: $CONFIGURED/4"

echo ""
echo "💡 Tips:"
echo "   • If any MCP is not working, check docs/MCP_SETUP_GUIDE.md"
echo "   • After fixing, reload Claude Code (Ctrl+Shift+P → Reload Window)"
echo ""
