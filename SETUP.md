# Web Test Forge - Setup Guide

## Prerequisites

- Node.js 18.x or higher
- pnpm 8.x or higher
- Redis server (for test control)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/cruzyjapan/Web-Test-Forge-NextJS.git
cd Web-Test-Forge-NextJS
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:
- `DATABASE_URL` - SQLite database path (default: `file:./prisma/dev.db`)
- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)
- `AUTH_SECRET` - Authentication secret (minimum 32 characters)

4. Initialize the database:
```bash
pnpm prisma generate
pnpm prisma migrate dev
```

5. Install Playwright browsers:
```bash
npx playwright install chromium
```

## Running the Application

### Development Mode
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### Production Mode
```bash
pnpm build
pnpm start
```

## Docker Setup (Optional)

1. Build the Docker image:
```bash
docker-compose build
```

2. Start the services:
```bash
docker-compose up
```

## Initial Configuration

1. Access the application at `http://localhost:3000`
2. Create your first project
3. Configure test suites and test cases
4. Run automated tests

## Troubleshooting

### Redis Connection Error
Ensure Redis is running:
```bash
# Ubuntu/Debian
sudo service redis-server start

# macOS with Homebrew
brew services start redis

# Docker
docker run -d -p 6379:6379 redis
```

### Database Issues
Reset the database:
```bash
pnpm prisma migrate reset
pnpm prisma migrate dev
```

### Port Already in Use
Change the port in package.json or use:
```bash
PORT=3001 pnpm dev
```