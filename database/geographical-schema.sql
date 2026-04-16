-- Geographical Data Schema for Indian Villages API
-- Tables for hierarchical address data: Country -> State -> District -> SubDistrict -> Village

-- Country table (root level)
CREATE TABLE IF NOT EXISTS country (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- State table
CREATE TABLE IF NOT EXISTS state (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(20) UNIQUE NOT NULL,
    state_name VARCHAR(255) NOT NULL,
    country_id INTEGER NOT NULL REFERENCES country(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- District table
CREATE TABLE IF NOT EXISTS district (
    id SERIAL PRIMARY KEY,
    district_code VARCHAR(20) UNIQUE NOT NULL,
    district_name VARCHAR(255) NOT NULL,
    state_id INTEGER NOT NULL REFERENCES state(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SubDistrict table (Block/Taluka level)
CREATE TABLE IF NOT EXISTS subdistrict (
    id SERIAL PRIMARY KEY,
    subdistrict_code VARCHAR(20) UNIQUE NOT NULL,
    subdistrict_name VARCHAR(255) NOT NULL,
    district_id INTEGER NOT NULL REFERENCES district(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Village table (lowest level)
CREATE TABLE IF NOT EXISTS village (
    id SERIAL PRIMARY KEY,
    village_code VARCHAR(20) UNIQUE NOT NULL,
    village_name VARCHAR(255) NOT NULL,
    subdistrict_id INTEGER NOT NULL REFERENCES subdistrict(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_state_country_id ON state(country_id);
CREATE INDEX IF NOT EXISTS idx_district_state_id ON district(state_id);
CREATE INDEX IF NOT EXISTS idx_subdistrict_district_id ON subdistrict(district_id);
CREATE INDEX IF NOT EXISTS idx_village_subdistrict_id ON village(subdistrict_id);

-- Full-text search indexes for village names
CREATE INDEX IF NOT EXISTS idx_village_name_gin ON village USING gin (to_tsvector('english', village_name));
CREATE INDEX IF NOT EXISTS idx_subdistrict_name_gin ON subdistrict USING gin (to_tsvector('english', subdistrict_name));
CREATE INDEX IF NOT EXISTS idx_district_name_gin ON district USING gin (to_tsvector('english', district_name));
CREATE INDEX IF NOT EXISTS idx_state_name_gin ON state USING gin (to_tsvector('english', state_name));

-- Insert India as the default country
INSERT INTO country (name, code) VALUES ('India', 'IN') ON CONFLICT (name) DO NOTHING;