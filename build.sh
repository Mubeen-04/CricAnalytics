#!/bin/bash
# Build script for monolithic deployment
# Run this from the project root to build and prepare for deployment

set -e

echo "======================================"
echo "CricAnalytics Production Build"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build Frontend
echo -e "\n${BLUE}[1/3] Building Frontend...${NC}"
cd frontend
npm install
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 2: Verify backend static structure
echo -e "\n${BLUE}[2/3] Preparing Backend...${NC}"
cd ../backend
mkdir -p static
echo -e "${GREEN}✓ Backend static directory ready${NC}"

# Step 3: Collect static files
echo -e "\n${BLUE}[3/3] Collecting Django Static Files...${NC}"
python manage.py collectstatic --noinput
echo -e "${GREEN}✓ Static files collected${NC}"

echo -e "\n${GREEN}======================================"
echo "Build Complete!"
echo "======================================"
echo "Frontend build output: backend/static/dist/"
echo "Static files output: backend/staticfiles/"
echo ""
echo "To deploy:"
echo "  1. cd backend"
echo "  2. python manage.py migrate"
echo "  3. gunicorn CricAnalytics.wsgi:application"
echo "======================================${NC}"
