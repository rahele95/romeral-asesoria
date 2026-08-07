-- Migración: columnas de atribución de campañas (Meta Ads / UTMs) en public.leads
-- Aplicar en el SQL Editor de Supabase ANTES de deployar la rama meta-pixel
-- (api/leads.js empieza a mandar estas columnas; sin ellas el insert falla con 400).

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_content  text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_term     text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS fbclid       text;
