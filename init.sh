#!/bin/bash

# ==================================
# Web Test Forge - Initial Setup Script
# ==================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  Web Test Forge NextJS - Initial Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check Node.js
print_info "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js version: $(node -v)"

# Check pnpm installation
print_info "Checking pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found. Installing pnpm..."
    npm install -g pnpm
    print_success "pnpm installed successfully"
else
    print_success "pnpm version: $(pnpm -v)"
fi

# Check if this is a fresh installation or update
if [ -d "node_modules" ]; then
    print_info "Updating dependencies..."
    pnpm install
    print_success "Dependencies updated"
else
    print_info "Installing dependencies (this may take a few minutes)..."
    pnpm install
    print_success "Dependencies installed"
fi

# Setup environment file
print_info "Setting up environment configuration..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
        print_warning "Please update .env with your configuration"
    else
        print_info "Creating .env with default configuration..."
        cat > .env << EOF
# ===================================
# Environment Configuration
# ===================================

# Database
DATABASE_URL="file:./dev.db"

# Authentication (CHANGE THIS IN PRODUCTION!)
AUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Redis (optional - for job queue)
# REDIS_URL="redis://localhost:6379"

# MCP Server
MCP_SERVER_PATH="./mcp-server/dist/index.js"

# Debug
DEBUG=false

# Disable auth alerts until Redis is configured
NEXT_PUBLIC_ENABLE_AUTH_ALERTS=false

# Playwright
PLAYWRIGHT_BROWSERS_PATH=0
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
EOF
        print_success "Created .env with default configuration"
    fi
else
    print_info ".env already exists, skipping..."
fi

# Check Prisma setup
if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Prisma schema not found. Please ensure prisma/schema.prisma exists."
    exit 1
fi

# Generate Prisma client
print_info "Generating Prisma client..."
pnpm prisma generate
print_success "Prisma client generated"

# Run database migrations
print_info "Setting up database..."
if [ -f "dev.db" ] || [ -f "prisma/dev.db" ]; then
    print_info "Existing database found, running migrations..."
    pnpm prisma migrate deploy 2>/dev/null || pnpm prisma migrate dev --name update
else
    print_info "Creating new database..."
    pnpm prisma migrate dev --name init
fi
print_success "Database setup completed"

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p public/screenshots
mkdir -p public/reports
mkdir -p public/captures
mkdir -p data
mkdir -p prisma
mkdir -p mcp-server/dist
print_success "Directories created"

# Check if MCP server needs building
if [ -f "mcp-server/package.json" ]; then
    print_info "Building MCP server..."
    cd mcp-server
    pnpm install
    pnpm build
    cd ..
    print_success "MCP server built"
fi

# Install Playwright browsers and dependencies
print_info "Installing Playwright browsers and system dependencies..."
pnpm exec playwright install --with-deps chromium
print_success "Playwright browsers installed"

# Seed initial data (optional)
if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
    print_info "Seeding database with initial data..."
    pnpm prisma db seed
    print_success "Database seeded"
fi

# Run type checking
print_info "Running type checking..."
pnpm typecheck || print_warning "Type checking found some issues, please review"

# Build the application
print_info "Building the application..."
pnpm build
print_success "Application built successfully"

# Summary
# Verify installation
print_info "Verifying installation..."
ERRORS=0

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    ERRORS=$((ERRORS + 1))
fi

# Check if database exists
if [ ! -f "dev.db" ] && [ ! -f "prisma/dev.db" ]; then
    print_warning "Database file not found"
    ERRORS=$((ERRORS + 1))
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules directory not found"
    ERRORS=$((ERRORS + 1))
fi

# Check if Next.js is properly installed
if [ ! -f "node_modules/next/package.json" ]; then
    print_warning "Next.js not properly installed"
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  Setup completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}\n"
else
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Setup completed with $ERRORS warning(s)${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
fi

print_info "Next steps:"
echo "  1. Review and update .env with your configuration"
echo "  2. Start the development server: ${YELLOW}pnpm dev${NC}"
echo "  3. Open your browser: ${YELLOW}http://localhost:3000${NC}"
echo "  4. Register a new user account at /register"
echo ""
print_info "Available commands:"
echo "  ${YELLOW}pnpm dev${NC}          - Start development server"
echo "  ${YELLOW}pnpm build${NC}        - Build for production"
echo "  ${YELLOW}pnpm start${NC}        - Start production server"
echo "  ${YELLOW}pnpm test${NC}         - Run unit tests"
echo "  ${YELLOW}pnpm test:e2e${NC}     - Run E2E tests"
echo "  ${YELLOW}pnpm lint${NC}         - Run linter"
echo "  ${YELLOW}pnpm format${NC}       - Format code"
echo "  ${YELLOW}pnpm typecheck${NC}    - Check TypeScript types"
echo "  ${YELLOW}pnpm prisma studio${NC} - Open database GUI"
echo ""
print_info "For production deployment:"
echo "  - Update .env with production values"
echo "  - Set NODE_ENV=production"
echo "  - Configure database (PostgreSQL recommended)"
echo "  - Configure Redis for job queue (optional)"
echo "  - Run: ${YELLOW}pnpm build && pnpm start${NC}"
echo ""
print_success "Happy testing with Web Test Forge NextJS!"