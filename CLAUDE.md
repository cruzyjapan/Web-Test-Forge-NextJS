# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-Test-Forge is a Playwright-based automated testing tool with a web interface built using Next.js 15. It integrates MCP (Model Context Protocol) for enhanced Playwright operations and provides user-friendly test configuration and execution capabilities.

## Tech Stack

- **Frontend**: Next.js 15.4.x (App Router), React 19.x, TypeScript 5.x, Tailwind CSS 4.x, shadcn/ui, Zustand 5.0.x
- **Backend**: Next.js API Routes, Playwright 1.54.x, MCP SDK 1.17.x, Prisma 6.13.x, SQLite (dev)/PostgreSQL (prod), Redis, BullMQ 5.56.x
- **Testing**: Vitest 3.2.x (unit tests), Playwright (E2E tests)
- **Code Quality**: Biome 2.1.x (linter/formatter)

## Essential Commands

```bash
# Development
pnpm dev                    # Start development server (Next.js)
pnpm dev:turbo             # Start with Turbopack for faster HMR
pnpm build                 # Build for production
pnpm start                 # Start production server

# Database
pnpm db:migrate            # Run Prisma migrations
pnpm db:generate           # Generate Prisma client
pnpm db:studio             # Open Prisma Studio for database management
pnpm db:reset              # Reset database

# Testing
pnpm test                  # Run unit tests with Vitest
pnpm test:watch            # Run tests in watch mode
pnpm test:coverage         # Generate coverage report

# Code quality
pnpm lint                  # Run Biome linter
pnpm format                # Format code with Biome

# Docker
docker-compose up          # Start all services
docker-compose down        # Stop all services
```

## Architecture

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages (login, register)
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API Routes
│   └── page.tsx           # Home page
├── components/            
│   ├── ui/               # shadcn/ui components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── lib/                   
│   ├── playwright/       # Playwright utilities
│   ├── mcp/             # MCP integration
│   ├── db/              # Database utilities
│   └── utils/           # General utilities
├── types/                # TypeScript type definitions
mcp-server/               # MCP Server implementation
prisma/                   # Database schema and migrations
```

### Key Design Patterns

1. **API Routes**: All backend logic resides in `src/app/api/` using Next.js App Router conventions
2. **MCP Integration**: Playwright operations are handled through MCP server for better isolation and control
3. **Job Queue**: Redis + BullMQ handle asynchronous test execution
4. **State Management**: Zustand for client-side state
5. **Session Management**: Custom cookie-based authentication in `src/lib/auth/`

## Database Schema

The application uses Prisma with SQLite (development) or PostgreSQL (production). Main entities:
- `User`: Authentication and user management
- `Project`: Test projects with base URLs and auth settings
- `TestSuite`: Groups of related test cases
- `TestCase`: Individual test scenarios with steps (JSON stored as string)
- `TestRun`: Test execution instances with results
- `Screenshot`: Captured screenshots during tests

## MCP Server Integration

The MCP server (`mcp-server/`) provides isolated Playwright operations:
- Handles browser automation commands
- Manages browser contexts and sessions
- Executes test scripts in a controlled environment
- Available tools: `navigateToUrl`, `clickElement`, `fillInput`, `takeScreenshot`, `getText`, `waitForSelector`, `executeScript`

## API Endpoints

Main API routes follow RESTful conventions:
- `/api/auth/*` - Authentication (login, register, logout)
- `/api/projects` - Project CRUD operations
- `/api/projects/[id]/suites` - Test suite management
- `/api/suites/[id]/cases` - Test case management
- `/api/projects/[id]/runs` - Test execution
- `/api/reports/*` - Report generation and export

All API routes use Zod validation and session-based authentication.

## Development Workflow

1. **Feature Development**: Create feature branches, implement in `src/components/features/`
2. **API Development**: Add new routes in `src/app/api/`, update Prisma schema if needed
3. **MCP Tools**: Extend MCP server tools in `mcp-server/src/tools/`
4. **Testing**: Write unit tests alongside components, E2E tests in `tests/`

## Testing Strategy

- **Unit Tests**: Component logic, utilities, and hooks using Vitest
- **Integration Tests**: API routes with test database
- **E2E Tests**: Critical user flows using Playwright
- Coverage reports available via `pnpm test:coverage`

## Environment Variables

Required environment variables (see `.env.example`):
- `DATABASE_URL`: Database connection string (SQLite or PostgreSQL)
- `REDIS_URL`: Redis connection for job queue
- `SESSION_SECRET`: Authentication session secret
- `MCP_SERVER_PATH`: Path to MCP server executable

## Common Tasks

### Adding a New Test Feature
1. Define types in `src/types/`
2. Update Prisma schema if needed
3. Create API route in `src/app/api/`
4. Add MCP tool if needed in `mcp-server/src/tools/`
5. Build UI components in `src/components/features/`
6. Add state management in appropriate Zustand store

### Running a Single Test
```bash
pnpm test -- path/to/test.spec.ts
pnpm test -- --grep "test name"
```

### Database Changes
1. Update schema in `prisma/schema.prisma`
2. Run `pnpm db:migrate` to create migration
3. Run `pnpm db:generate` to update Prisma client
4. Update types and API routes accordingly

## Code Conventions

- Components: PascalCase (`ProjectList.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- API routes: Follow Next.js conventions (`route.ts`)
- Types: PascalCase interfaces (`Project`, `TestCase`)
- Database models: PascalCase in Prisma schema
- Use Biome for consistent formatting (`pnpm format`)

## Key Features

- **Source Code Analysis**: Automatic test case generation from Next.js projects
- **Multi-viewport Testing**: Support for mobile, tablet, and desktop sizes
- **Authentication Support**: Per-project auth credentials for protected sites
- **Visual Reporting**: Screenshots at each test step with HTML reports
- **Export Capabilities**: CSV export for test results
- **Multi-language Support**: English and Japanese UI translations