#!/usr/bin/env node

const pool = require('./db');
const bcrypt = require('bcryptjs');

async function createDemoClient() {
  try {
    console.log('🚀 Creating demo client account...\n');

    // Check if demo account already exists
    const existingResult = await pool.query(
      `SELECT * FROM users WHERE email = 'demo@client.com'`
    );

    if (existingResult.rows.length > 0) {
      console.log('ℹ️  Demo client account already exists.');
      console.log('\n📧 Email:    demo@client.com');
      console.log('🔑 Password: Demo123!');
      console.log('🎯 Portal:   http://localhost:3000/client-login.html\n');
      process.exit(0);
    }

    // Hash password
    const password = 'Demo123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create demo client user
    const userResult = await pool.query(
      `INSERT INTO users (
        email, 
        password_hash, 
        full_name, 
        company_name, 
        role, 
        subscription_tier, 
        status, 
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        'demo@client.com',
        hashedPassword,
        'Demo Client',
        'Demo Company Inc.',
        'client',
        'free',
        'active'
      ]
    );

    console.log('✅ Demo client account created successfully!\n');
    console.log('📧 Email:    demo@client.com');
    console.log('🔑 Password: Demo123!');
    console.log('💼 Company:  Demo Company Inc.');
    console.log('📊 Tier:     Free (1,000 requests/day)');
    console.log('✓ Status:    Active (Approved)\n');
    console.log('🎯 Portal:   http://localhost:3000/client-login.html\n');

    // Create an API key for the demo client
    const keyHash = require('crypto').randomBytes(32).toString('hex');
    const keySecretHash = require('crypto').randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO api_keys (
        user_id, 
        key_hash, 
        key_secret_hash, 
        name, 
        is_active, 
        rate_limit, 
        created_at, 
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '365 days')`,
      [userResult.rows[0].id, keyHash, keySecretHash, 'Demo API Key', true, 100]
    );

    console.log('🔐 Demo API Key created and active\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo client:', error.message);
    process.exit(1);
  }
}

createDemoClient();
