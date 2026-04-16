-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'client', -- 'admin', 'client'
  subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'premium', 'pro', 'unlimited'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'suspended'
  company_name VARCHAR(255),
  phone VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_secret_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 1000, -- requests per day
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  expires_at TIMESTAMP
);

-- API Usage Logs Table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time_ms INTEGER,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE, -- 'free', 'premium', 'pro', 'unlimited'
  price_per_month DECIMAL(10, 2),
  requests_per_day INTEGER,
  max_api_keys INTEGER,
  features TEXT[], -- array of feature flags
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Plans
INSERT INTO subscription_plans (name, price_per_month, requests_per_day, max_api_keys, features) VALUES
('free', 0, 1000, 1, ARRAY['basic_search', 'browse']),
('premium', 29.99, 50000, 5, ARRAY['basic_search', 'browse', 'advanced_search', 'webhook']),
('pro', 99.99, 500000, 25, ARRAY['basic_search', 'browse', 'advanced_search', 'webhook', 'custom_fields', 'sso']),
('unlimited', 299.99, 5000000, 100, ARRAY['all'])
ON CONFLICT DO NOTHING;

-- Billing Table
CREATE TABLE IF NOT EXISTS billing (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  api_calls_used INTEGER DEFAULT 0,
  amount_due DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  invoice_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id),
  action VARCHAR(255),
  entity_type VARCHAR(100),
  entity_id INTEGER,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON billing(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id);
