import { Client } from 'pg';
import Redis from 'ioredis';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up Redis test databases
    await cleanupRedisTestDatabases();
    
    // Clean up PostgreSQL test databases
    await cleanupTestDatabases();
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to clean up test environment:', error);
    // Don't throw here to avoid masking test failures
  }
}

async function cleanupTestDatabases() {
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
        // Terminate active connections to the database
        await client.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = '${dbName}' AND pid <> pg_backend_pid()
        `);
        
        await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
        console.log(`✅ Cleaned up test database: ${dbName}`);
      } catch (error) {
        console.warn(`⚠️ Could not clean up database ${dbName}:`, error);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not connect to PostgreSQL for cleanup:', error);
  } finally {
    await client.end();
  }
}

async function cleanupRedisTestDatabases() {
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
    console.log('✅ Redis test databases cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not connect to Redis for cleanup:', error);
  }
}