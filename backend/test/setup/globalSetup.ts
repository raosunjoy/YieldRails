import { execSync } from 'child_process';
import { Client } from 'pg';
import Redis from 'ioredis';

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');
  
  try {
    // Set up PostgreSQL test databases
    await setupTestDatabases();
    
    // Set up Redis test databases
    await setupRedisTestDatabases();
    
    // Run database migrations for test databases
    await runTestMigrations();
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    throw error;
  }
}

async function setupTestDatabases() {
  const databases = [
    'yieldrails_test',
    'yieldrails_integration_test', 
    'yieldrails_e2e_test'
  ];
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'test',
    password: 'test',
    database: 'postgres'
  });
  
  try {
    await client.connect();
    
    for (const dbName of databases) {
      try {
        await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Created test database: ${dbName}`);
      } catch (error) {
        console.warn(`⚠️ Could not create database ${dbName}:`, error);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not connect to PostgreSQL for setup:', error);
  } finally {
    await client.end();
  }
}

async function setupRedisTestDatabases() {
  try {
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    // Clear test Redis databases
    await redis.select(1); // Unit tests
    await redis.flushdb();
    await redis.select(2); // Integration tests  
    await redis.flushdb();
    await redis.select(3); // E2E tests
    await redis.flushdb();
    
    await redis.quit();
    console.log('✅ Redis test databases cleared');
  } catch (error) {
    console.warn('⚠️ Could not connect to Redis for setup:', error);
  }
}

async function runTestMigrations() {
  const databases = [
    'postgresql://test:test@localhost:5432/yieldrails_test',
    'postgresql://test:test@localhost:5432/yieldrails_integration_test',
    'postgresql://test:test@localhost:5432/yieldrails_e2e_test'
  ];
  
  for (const dbUrl of databases) {
    try {
      execSync(`DATABASE_URL="${dbUrl}" npx prisma migrate deploy`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      console.log(`✅ Migrations applied to: ${dbUrl.split('@')[1]}`);
    } catch (error) {
      console.warn(`⚠️ Could not run migrations for ${dbUrl}:`, error);
    }
  }
}