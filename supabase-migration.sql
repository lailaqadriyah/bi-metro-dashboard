-- =========================
-- RLS: Public read-only di semua tabel (tanpa auth)
-- Jalankan ini di Supabase SQL Editor
-- =========================
ALTER TABLE dim_city ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_country ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_metro_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_region ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_metro_city ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON dim_city FOR SELECT USING (true);
CREATE POLICY "public_read" ON dim_country FOR SELECT USING (true);
CREATE POLICY "public_read" ON dim_metro_system FOR SELECT USING (true);
CREATE POLICY "public_read" ON dim_region FOR SELECT USING (true);
CREATE POLICY "public_read" ON dim_time FOR SELECT USING (true);
CREATE POLICY "public_read" ON fact_metro_city FOR SELECT USING (true);


-- =========================
-- VIEW 1: Data lengkap (mirip flat CSV)
-- =========================
CREATE OR REPLACE VIEW vw_metro_full AS
SELECT
  dc.city_name AS city,
  dco.country_name AS country,
  dm.metro_name AS name,
  dt.year_established AS year,
  fmc.num_stations AS stations,
  fmc.track_length_km AS length_km,
  fmc.ridership_annual AS annual_ridership_mill,
  dr.region_name AS region,
  fmc.ridership_per_km,
  fmc.ridership_per_station,
  fmc.system_age_years
FROM fact_metro_city fmc
JOIN dim_city dc ON fmc.city_id = dc.city_id
JOIN dim_country dco ON fmc.country_id = dco.country_id
JOIN dim_metro_system dm ON fmc.metro_id = dm.metro_id
JOIN dim_time dt ON fmc.time_id = dt.time_id
JOIN dim_region dr ON fmc.region_id = dr.region_id;

COMMENT ON VIEW vw_metro_full IS 'Data lengkap metro hasil JOIN seluruh dimension, digunakan sebagai sumber utama frontend';


-- =========================
-- VIEW 2: Daftar region untuk dropdown filter
-- =========================
CREATE OR REPLACE VIEW vw_distinct_regions AS
SELECT DISTINCT region_name AS region
FROM dim_region
ORDER BY region_name;


-- =========================
-- VIEW 3: Daftar negara per region untuk dropdown filter
-- =========================
CREATE OR REPLACE VIEW vw_distinct_countries AS
SELECT DISTINCT dco.country_name AS country, dr.region_name AS region
FROM fact_metro_city fmc
JOIN dim_country dco ON fmc.country_id = dco.country_id
JOIN dim_region dr ON fmc.region_id = dr.region_id
ORDER BY dco.country_name;


-- =========================
-- VIEW 4: KPI Cards (total ridership, length, stations, avg age)
-- =========================
CREATE OR REPLACE VIEW vw_metro_stats AS
SELECT
  COALESCE(SUM(fmc.ridership_annual), 0)::DOUBLE PRECISION AS total_ridership,
  COALESCE(SUM(fmc.track_length_km), 0)::DOUBLE PRECISION AS total_length,
  COALESCE(SUM(fmc.num_stations), 0)::BIGINT AS total_stations,
  ROUND(AVG(fmc.system_age_years)::NUMERIC, 1)::DOUBLE PRECISION AS avg_age
FROM fact_metro_city fmc;


-- =========================
-- VIEW 5: Top 10 Ridership (bar chart)
-- =========================
CREATE OR REPLACE VIEW vw_top_ridership AS
SELECT
  dc.city_name AS city,
  dco.country_name AS country,
  dm.metro_name AS name,
  fmc.ridership_annual AS ridership
FROM fact_metro_city fmc
JOIN dim_city dc ON fmc.city_id = dc.city_id
JOIN dim_country dco ON fmc.country_id = dco.country_id
JOIN dim_metro_system dm ON fmc.metro_id = dm.metro_id
ORDER BY fmc.ridership_annual DESC
LIMIT 10;


-- =========================
-- VIEW 6: Top 10 Panjang Jalur (bar chart)
-- =========================
CREATE OR REPLACE VIEW vw_top_length AS
SELECT
  dc.city_name AS city,
  dco.country_name AS country,
  dm.metro_name AS name,
  fmc.track_length_km AS length
FROM fact_metro_city fmc
JOIN dim_city dc ON fmc.city_id = dc.city_id
JOIN dim_country dco ON fmc.country_id = dco.country_id
JOIN dim_metro_system dm ON fmc.metro_id = dm.metro_id
ORDER BY fmc.track_length_km DESC
LIMIT 10;


-- =========================
-- VIEW 7: Distribusi Region (pie chart)
-- =========================
CREATE OR REPLACE VIEW vw_region_stats AS
SELECT
  dr.region_name AS region,
  COUNT(*)::INTEGER AS count,
  ROUND(SUM(fmc.ridership_annual)::NUMERIC, 2)::DOUBLE PRECISION AS total_ridership
FROM fact_metro_city fmc
JOIN dim_region dr ON fmc.region_id = dr.region_id
GROUP BY dr.region_name
ORDER BY dr.region_name;


-- =========================
-- VIEW 8: Tren Era Pembangunan (area chart)
-- =========================
CREATE OR REPLACE VIEW vw_era_trend AS
SELECT
  dt.decade,
  COUNT(*)::INTEGER AS systems_opened
FROM fact_metro_city fmc
JOIN dim_time dt ON fmc.time_id = dt.time_id
GROUP BY dt.decade
ORDER BY MIN(dt.year_established);


-- =========================
-- VIEW 9: Efisiensi Tertinggi (insight card)
-- =========================
CREATE OR REPLACE VIEW vw_best_efficiency AS
SELECT
  dc.city_name AS city,
  dco.country_name AS country,
  dm.metro_name AS name,
  fmc.ridership_per_km
FROM fact_metro_city fmc
JOIN dim_city dc ON fmc.city_id = dc.city_id
JOIN dim_country dco ON fmc.country_id = dco.country_id
JOIN dim_metro_system dm ON fmc.metro_id = dm.metro_id
ORDER BY fmc.ridership_per_km DESC
LIMIT 1;





-- =========================
-- VIEW 10: Top 10 Ridership per KM by City
-- =========================
CREATE OR REPLACE VIEW vw_top_efficiency_cities AS
SELECT
  dc.city_name AS city,
  dco.country_name AS country,
  fmc.ridership_per_km AS efficiency
FROM fact_metro_city fmc
JOIN dim_city dc ON fmc.city_id = dc.city_id
JOIN dim_country dco ON fmc.country_id = dco.country_id
WHERE fmc.ridership_per_km IS NOT NULL
ORDER BY fmc.ridership_per_km DESC
LIMIT 10;


-- =========================
-- VIEW 11: Jakarta Highlight in Ridership Ranking
-- Top 10 global + Jakarta bila tidak masuk top 10
-- =========================
CREATE OR REPLACE VIEW vw_jakarta_ridership_comparison AS
WITH ranked_metro AS (
  SELECT
    dc.city_name AS city,
    dco.country_name AS country,
    fmc.ridership_annual AS ridership,
    LOWER(dc.city_name) = 'jakarta' AS is_jakarta,
    ROW_NUMBER() OVER (ORDER BY fmc.ridership_annual DESC) AS rank_no
  FROM fact_metro_city fmc
  JOIN dim_city dc ON fmc.city_id = dc.city_id
  JOIN dim_country dco ON fmc.country_id = dco.country_id
),
selected_rows AS (
  SELECT *
  FROM ranked_metro
  WHERE rank_no <= 10
     OR is_jakarta = true
)
SELECT
  city,
  country,
  ridership,
  is_jakarta,
  rank_no
FROM selected_rows
ORDER BY rank_no;


-- =========================
-- VIEW 12: Count City by Era Category
-- =========================
CREATE OR REPLACE VIEW vw_era_category_counts AS
SELECT
  era,
  COUNT(*)::INTEGER AS total
FROM (
  SELECT
    CASE
      WHEN dt.year_established < 1950 THEN 'Historic'
      WHEN dt.year_established BETWEEN 1950 AND 1999 THEN 'Modern'
      ELSE 'Contemporary'
    END AS era,
    CASE
      WHEN dt.year_established < 1950 THEN 3
      WHEN dt.year_established BETWEEN 1950 AND 1999 THEN 1
      ELSE 2
    END AS sort_order
  FROM fact_metro_city fmc
  JOIN dim_time dt ON fmc.time_id = dt.time_id
) era_source
GROUP BY era, sort_order
ORDER BY sort_order;
