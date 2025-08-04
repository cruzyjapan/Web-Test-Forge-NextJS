#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const environment = process.argv[2] || 'development'

console.log(`Setting up database for ${environment} environment...`)

// Load environment variables
const envFile = `.env.${environment}`
if (!fs.existsSync(envFile)) {
  console.error(`Environment file ${envFile} not found`)
  process.exit(1)
}

// Set NODE_ENV
process.env.NODE_ENV = environment

// Get database path from environment
const dbPath = environment === 'production' 
  ? './prisma/prod.db'
  : environment === 'test'
  ? './prisma/test.db'
  : './prisma/dev.db'

const dbDir = path.dirname(dbPath)
const dbFile = path.basename(dbPath)

// Create prisma directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log(`Created directory: ${dbDir}`)
}

// Backup existing database if it exists
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(dbDir, `${dbFile}.backup.${timestamp}`)
  fs.copyFileSync(dbPath, backupPath)
  console.log(`Backed up existing database to: ${backupPath}`)
}

try {
  // Generate Prisma client
  console.log('Generating Prisma client...')
  execSync('npx prisma generate', { stdio: 'inherit' })

  // Run migrations
  console.log(`Running migrations for ${environment}...`)
  if (environment === 'production') {
    // In production, only deploy migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
    })
  } else {
    // In development/test, allow creating new migrations
    execSync('npx prisma migrate dev', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
    })
  }

  console.log(`✅ Database setup completed for ${environment}`)
  console.log(`   Database location: ${dbPath}`)
  
} catch (error) {
  console.error('❌ Database setup failed:', error)
  process.exit(1)
}