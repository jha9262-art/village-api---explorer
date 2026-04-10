-- =========================
-- 1. COUNTS CHECK
-- =========================
SELECT COUNT(*) FROM country;
SELECT COUNT(*) FROM state;
SELECT COUNT(*) FROM district;
SELECT COUNT(*) FROM subdistrict;
SELECT COUNT(*) FROM village;

-- =========================
-- 2. STATE LIST
-- =========================
SELECT state_name
FROM state
ORDER BY state_name;

-- =========================
-- 3. BIHAR DATA CHECK
-- =========================
SELECT 
    v.village_name,
    sd.subdistrict_name,
    d.district_name,
    s.state_name
FROM village v
JOIN subdistrict sd ON v.subdistrict_id = sd.id
JOIN district d ON sd.district_id = d.id
JOIN state s ON d.state_id = s.id
WHERE s.state_name = 'Bihar'
LIMIT 20;

-- =========================
-- 4. STATE-WISE SUMMARY
-- =========================
SELECT s.state_name,
       COUNT(DISTINCT d.id) AS district_count,
       COUNT(DISTINCT sd.id) AS subdistrict_count,
       COUNT(DISTINCT v.id) AS village_count
FROM state s
LEFT JOIN district d ON d.state_id = s.id
LEFT JOIN subdistrict sd ON sd.district_id = d.id
LEFT JOIN village v ON v.subdistrict_id = sd.id
GROUP BY s.state_name
ORDER BY s.state_name;

-- =========================
-- 5. SEARCH QUERY
-- =========================
SELECT v.village_name, d.district_name
FROM village v
JOIN subdistrict sd ON v.subdistrict_id = sd.id
JOIN district d ON sd.district_id = d.id
WHERE v.village_name ILIKE '%man%';