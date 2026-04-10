const pool = require('./db');
const auth = require('./auth');

async function createAdminAccount() {
  try {
    console.log('🔧 Creating first admin account...');
    
    const adminEmail = 'admin@example.com';
    const adminPassword = 'AdminPass123!';
    const adminName = 'System Admin';
    
    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (existing.rows.length > 0) {
      console.log('✅ Admin account already exists');
      process.exit(0);
    }
    
    // Create admin account
    const passwordHash = await auth.hashPassword(adminPassword);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, status, subscription_tier)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role`,
      [adminEmail, passwordHash, adminName, 'admin', 'active', 'unlimited']
    );
    
    console.log('✅ Admin account created successfully!');
    console.log('\n🔐 Admin Login Credentials:');
    console.log('───────────────────────────');
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('───────────────────────────\n');
    console.log('📍 Admin Panel URL: http://localhost:3000/admin-login.html\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  }
}

createAdminAccount();
