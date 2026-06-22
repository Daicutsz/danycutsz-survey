-- ============================================================
-- danycutsz Survey System — Supabase Schema
-- Ejecuta este SQL completo en:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Tabla principal de encuestas ─────────────────────────
CREATE TABLE IF NOT EXISTS surveys (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  date            TEXT,
  time            TEXT,
  barber          TEXT NOT NULL,
  satisfaction    SMALLINT NOT NULL CHECK (satisfaction BETWEEN 1 AND 10),
  attention       SMALLINT NOT NULL CHECK (attention    BETWEEN 1 AND 10),
  cleanliness     SMALLINT NOT NULL CHECK (cleanliness  BETWEEN 1 AND 10),
  nps             SMALLINT NOT NULL CHECK (nps          BETWEEN 0 AND 10),
  expectations    TEXT NOT NULL,
  wait_time       TEXT NOT NULL,
  is_new_client   BOOLEAN NOT NULL DEFAULT FALSE,
  liked_most      TEXT,
  improvement     TEXT
);

-- ── 2. Índices para performance del dashboard ───────────────
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_surveys_barber      ON surveys (barber);
CREATE INDEX IF NOT EXISTS idx_surveys_new_client  ON surveys (is_new_client);

-- ── 3. Row Level Security (RLS) ─────────────────────────────
-- Habilitar RLS en la tabla
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Política: cualquiera puede INSERT (encuesta pública)
CREATE POLICY "public_insert" ON surveys
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política: solo usuarios autenticados pueden SELECT (dashboard)
-- OPCIÓN A: Sin autenticación de Supabase (lectura libre por ahora)
-- Útil mientras configuras auth. Cambia a OPCIÓN B cuando estés listo.
CREATE POLICY "public_read" ON surveys
  FOR SELECT
  TO anon
  USING (true);

-- OPCIÓN B (más seguro — descomentar cuando uses Supabase Auth):
-- DROP POLICY IF EXISTS "public_read" ON surveys;
-- CREATE POLICY "authenticated_read" ON surveys
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- ── 4. Vista de estadísticas agregadas ──────────────────────
CREATE OR REPLACE VIEW survey_stats AS
SELECT
  COUNT(*)                                        AS total_surveys,
  ROUND(AVG(satisfaction)::NUMERIC, 2)            AS avg_satisfaction,
  ROUND(AVG(attention)::NUMERIC, 2)               AS avg_attention,
  ROUND(AVG(cleanliness)::NUMERIC, 2)             AS avg_cleanliness,
  ROUND(AVG(nps)::NUMERIC, 2)                     AS avg_nps,
  COUNT(*) FILTER (WHERE is_new_client = TRUE)    AS new_clients,
  COUNT(*) FILTER (WHERE is_new_client = FALSE)   AS returning_clients,
  COUNT(*) FILTER (WHERE nps >= 9)                AS promoters,
  COUNT(*) FILTER (WHERE nps <= 6)                AS detractors,
  COUNT(*) FILTER (WHERE nps BETWEEN 7 AND 8)     AS passives,
  -- NPS real = (promotores - detractores) / total * 100
  ROUND(
    (COUNT(*) FILTER (WHERE nps >= 9)::NUMERIC -
     COUNT(*) FILTER (WHERE nps <= 6)::NUMERIC) /
     NULLIF(COUNT(*), 0) * 100
  , 0)                                            AS nps_score
FROM surveys;

-- ── 5. Vista de estadísticas por barbero ────────────────────
CREATE OR REPLACE VIEW barber_stats AS
SELECT
  barber,
  COUNT(*)                                AS total,
  ROUND(AVG(satisfaction)::NUMERIC, 2)    AS avg_satisfaction,
  ROUND(AVG(attention)::NUMERIC, 2)       AS avg_attention,
  ROUND(AVG(cleanliness)::NUMERIC, 2)     AS avg_cleanliness,
  ROUND(AVG(nps)::NUMERIC, 2)             AS avg_nps,
  COUNT(*) FILTER (WHERE is_new_client)   AS new_clients
FROM surveys
GROUP BY barber
ORDER BY avg_satisfaction DESC;

-- ── 6. Verificar que todo quedó bien ────────────────────────
SELECT 'Schema instalado correctamente ✅' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('surveys');
