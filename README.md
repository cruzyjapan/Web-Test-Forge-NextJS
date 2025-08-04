# Web Test Forge

Web Test Forge is a Playwright-based automated testing tool that provides a user-friendly web interface for creating, managing, and executing tests for web applications.

## Features

- 🚀 **Intuitive Web Interface**: Create and manage test cases without writing code
- 🔍 **Source Code Analysis**: Automatically generate test cases by analyzing website HTML structure
- 📸 **Screenshot Capture**: Automatically capture screenshots at each test step
- 🔐 **Authentication Support**: Test sites that require login authentication
- 📊 **Detailed Reports**: Visual test result confirmation with CSV export functionality
- 🎯 **Test Suite Management**: Group and manage related test cases
- ⚡ **Real-time Execution**: Launch browsers and execute tests in real-time
- 🌐 **Multi-language Support**: English and Japanese interface
- ✅ **Selective Test Generation**: Choose which types of tests to generate (Pages, Forms, Navigation)

## Screenshots

### Dashboard
![Dashboard](public/captures/dashboard.png)

### Project Structure Overview
![Project Structure](public/captures/project-structure.png)

### Source Code Analysis
![Source Code Analysis](public/captures/source-code-analysis.png)

### Source Code Analysis Flow
![Source Analysis Flow](public/captures/source-analysis-flow.png)

### Test Case Management
![Test Case](public/captures/testcase.png)

### Test Execution Flow
![Test Execution Flow](public/captures/test-execution-flow.png)

## Tech Stack

- **Frontend**: Next.js 15.1.x, React 19.x, TypeScript 5.7.x
- **UI**: Tailwind CSS, shadcn/ui, Zustand for state management
- **Backend**: Next.js API Routes, Prisma ORM, Redis + BullMQ for job queues
- **Testing**: Playwright 1.49.x with MCP (Model Context Protocol) integration
- **Database**: PostgreSQL 16.x (production) / SQLite (development)
- **Code Quality**: Biome for linting and formatting

## Setup

### Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm
- PostgreSQL 16.x (for production)
- Redis 7.x (for job queues)

### Installation

#### Quick Setup (Recommended)

Use the automated setup script for a complete installation:

1. Clone the repository

```bash
git clone https://github.com/cruzyjapan/Web-Test-Forge-NextJS.git
cd Web-Test-Forge-NextJS
```

2. Make the setup script executable and run it

```bash
# Add execute permission to the setup script
chmod +x init.sh

# Run the automated setup
./init.sh
```

The `init.sh` script will automatically:
- ✅ Install all dependencies with pnpm
- ✅ Create and configure the `.env.local` file
- ✅ Set up the database with Prisma
- ✅ Build the MCP server
- ✅ Install Playwright browsers
- ✅ Build the application for production

#### Manual Installation

If you prefer to set up manually or if the automated script fails:

1. Clone the repository

```bash
git clone https://github.com/cruzyjapan/Web-Test-Forge-NextJS.git
cd Web-Test-Forge-NextJS
```

2. Install dependencies

```bash
pnpm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the required environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/webtestforge"

# Redis (for job queue)
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here-min-32-chars-long"

# MCP Server
MCP_SERVER_PATH="./mcp-server/dist/index.js"
```

4. Set up the database

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

5. Install Playwright browsers

```bash
npx playwright install chromium firefox webkit
```

6. Build MCP server

```bash
cd mcp-server
pnpm install
pnpm build
cd ..
```

7. Start the development server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

## Usage

### 1. User Registration

Register for a new account on your first visit.

### 2. Create a Project

Create a project for each website you want to test:
- Project name
- Base URL (target website URL)
- Authentication credentials (if login is required)

### 3. Create Test Suites

Create test suites within projects to group related test cases.

### 4. Create Test Cases

You can create test cases in the following ways:

#### Manual Creation
1. Enter test case name and description
2. Add test steps (click, input, verification, etc.)
3. Configure selectors and expected values for each step

#### Automatic Generation via Source Code Analysis
1. Select "Source Code Analysis" from the project page
2. Choose test types to generate:
   - ✅ **Pages**: Page display tests
   - ✅ **Forms**: Form input and validation tests  
   - ✅ **Navigation**: Link navigation tests
   - ❌ **API**: Currently disabled (no snapshot support)
3. System automatically analyzes pages and generates test cases
4. Review and edit generated test cases

### 5. Execute Tests

- Run individual test cases
- Review execution results and screenshots

### 6. View Reports

- Check test execution history
- View detailed results for each step
- Display screenshots
- Export to CSV

## Key Commands

```bash
# Development
pnpm dev                     # Start development server
pnpm mcp:dev                # Start MCP server in development mode
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm prisma migrate dev     # Run database migrations
pnpm prisma studio         # Open Prisma Studio
pnpm prisma generate       # Generate Prisma client

# Testing
pnpm test                   # Run unit tests with Vitest
pnpm test:e2e              # Run E2E tests with Playwright
pnpm test:watch            # Run tests in watch mode

# Code Quality
pnpm lint                   # Run Biome linter
pnpm format                # Format code with Biome
pnpm typecheck             # Run TypeScript type checking
```

## Project Structure

```
web-test-forge/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── features/         # Feature-specific components
│   │   └── layouts/          # Layout components
│   ├── lib/                   # Utility functions
│   │   ├── playwright/       # Playwright test runner
│   │   ├── mcp/             # MCP integration
│   │   └── db/              # Database utilities
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand state stores
│   ├── contexts/             # React contexts (language, etc.)
│   ├── locales/              # Internationalization files
│   └── types/                # TypeScript type definitions
├── mcp-server/               # MCP Server implementation
├── prisma/                   # Prisma schema and migrations
├── public/                   # Static files
│   ├── reports/             # Generated test reports
│   └── screenshots/         # Test screenshots
├── scripts/                  # Utility scripts
└── templates/               # Test case templates
```

## Key Features

### Source Code Analysis
- Supports Next.js (App Router) projects
- Analyzes `src/app/`, `app/`, `src/components/`, `components/` directories
- Detects pages, forms, navigation links, and API endpoints
- Generates comprehensive test cases automatically

### Test Case Types
- **Page Tests**: Verify page display and basic functionality
- **Form Tests**: Test form input, validation, and submission
- **Navigation Tests**: Verify link functionality and page transitions
- **Responsive Tests**: Test across Mobile, Tablet, and Desktop viewports
- **API Tests**: Currently disabled due to screenshot limitations

### Selective Test Generation
- Choose which test types to generate using checkboxes
- Prevents API test selection with clear messaging
- Numbered test case ordering: Pages (priority), Forms, Navigation

## Development Workflow

1. **Feature Development**: Create feature branches, implement in `src/components/features/`
2. **API Development**: Add new routes in `src/app/api/`, update Prisma schema if needed
3. **MCP Tools**: Extend MCP server tools in `mcp-server/src/tools/`
4. **Testing**: Write unit tests alongside components, E2E tests in `tests/`

## Troubleshooting

### Character Encoding Issues on Windows 11 with WSL2

If you encounter character encoding issues (garbled text) when running Playwright tests on Windows 11 with WSL2, follow these steps:

1. **Install Japanese fonts in WSL2:**
```bash
sudo apt update
sudo apt install fonts-noto-cjk fonts-noto-cjk-extra
```

2. **Set locale environment variables:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8
export LC_CTYPE=ja_JP.UTF-8
```

3. **Generate Japanese locale:**
```bash
sudo locale-gen ja_JP.UTF-8
sudo update-locale LANG=ja_JP.UTF-8
```

4. **Install Playwright with dependencies:**
```bash
npx playwright install --with-deps chromium
```

5. **Restart WSL2:**
```bash
wsl --shutdown
# Then reopen your WSL2 terminal
```

This should resolve character encoding issues when capturing screenshots or rendering Japanese text in Playwright tests.

## License

MIT License

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

If you encounter any issues, please report them in [Issues](https://github.com/cruzyjapan/Web-Test-Forge-NextJS/issues).

## Changelog

### Latest Updates
- ✅ Added selective test case generation with checkboxes
- ✅ Implemented multi-language support (English/Japanese)
- ✅ Enhanced test result detail pages with internationalization
- ✅ Disabled API tests with clear messaging about snapshot limitations
- ✅ Added test case numbering and custom ordering system