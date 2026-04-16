const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initializeDatabase() {
  try {
    console.log('🔄 Reading schema file...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('🔄 Executing schema...');
    await pool.query(schema);
    
    console.log('✅ Database schema initialized successfully!');
    console.log('✅ Tables created:');
    console.log('   - users');
    console.log('   - api_keys');
    console.log('   - api_usage_logs');
    console.log('   - subscription_plans');
    console.log('   - billing');
    console.log('   - audit_log');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
