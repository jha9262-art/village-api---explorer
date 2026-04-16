const fs = require('fs');
const pool = require('./db');

async function runSchema() {
  try {
    console.log('Dropping existing tables...');

    // Drop tables in reverse dependency order
    await pool.query(`
      DROP TABLE IF EXISTS village CASCADE;
      DROP TABLE IF EXISTS subdistrict CASCADE;
      DROP TABLE IF EXISTS district CASCADE;
      DROP TABLE IF EXISTS state CASCADE;
      DROP TABLE IF EXISTS country CASCADE;
    `);

    console.log('Running geographical schema...');

    const schemaSQL = fs.readFileSync('./database/geographical-schema.sql', 'utf8');

    await pool.query(schemaSQL);

    console.log('✅ Geographical schema created successfully');

    // Also run user schema
    const userSchemaSQL = fs.readFileSync('./database/schema.sql', 'utf8');

    await pool.query(userSchemaSQL);

    console.log('✅ User schema created successfully');

  } catch (error) {
    console.error('❌ Schema creation failed:', error.message);
  } finally {
    await pool.end();
  }
}

runSchema();