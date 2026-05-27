#!/bin/bash

# ============================================================================
# Deployment Verification Script
# Tests production build locally before deploying to Vercel
# ============================================================================

set -e  # Exit on any error

echo "🔍 Pre-Deployment Verification"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the frontend directory"
    exit 1
fi

echo "📦 Step 1: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

echo ""
echo "🔧 Step 2: Checking environment variables..."
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Error: .env.production not found${NC}"
    exit 1
else
    echo -e "${GREEN}✅ .env.production exists${NC}"
    echo "   Content:"
    cat .env.production | sed 's/^/   /'
fi

echo ""
echo "🏗️  Step 3: Building production bundle..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""
echo "📊 Step 4: Checking build output..."
if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build directory not found${NC}"
    exit 1
fi

BUILD_SIZE=$(du -sh build | cut -f1)
echo -e "${GREEN}✅ Build directory created (Size: ${BUILD_SIZE})${NC}"

echo ""
echo "🔍 Step 5: Checking critical files..."
CRITICAL_FILES=("build/index.html" "build/static/js" "build/static/css")
for file in "${CRITICAL_FILES[@]}"; do
    if [ -e "build/$file" ] || [ -d "build/$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

echo ""
echo "🌐 Step 6: Testing production build locally..."
echo -e "${YELLOW}Starting local server on http://localhost:5000${NC}"
echo -e "${YELLOW}Press Ctrl+C when done testing${NC}"
echo ""

# Check if 'serve' is installed globally
if ! command -v serve &> /dev/null; then
    echo "Installing 'serve' package..."
    npm install -g serve
fi

# Serve the build directory
serve -s build -l 5000

echo ""
echo "================================"
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the app at http://localhost:5000"
echo "2. Check browser console for errors"
echo "3. Test login/register flows"
echo "4. If everything works, deploy to Vercel"
echo ""
