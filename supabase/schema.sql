-- Esquema de Supabase para la Asesoría Virtual de El Romeral
-- Pegar y ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- (El acceso de las Vercel Functions es server-side con la SECRET key, que bypassa RLS.)

create table if not exists sessions (
  id          uuid default gen_random_uuid() primary key,
  session_id  text not null,
  created_at  timestamptz default now(),
  user_agent  text,
  referrer    text
);

create table if not exists funnel_events (
  id          uuid default gen_random_uuid() primary key,
  session_id  text not null,
  step        text not null,
  data        jsonb,
  created_at  timestamptz default now()
);

create table if not exists leads (
  id           uuid default gen_random_uuid() primary key,
  session_id   text not null,
  nombre       text,
  whatsapp     text,
  email        text,
  tipo_evento  text,
  fecha_evento text,
  personas     integer,
  total        numeric,
  quiere_cita  boolean default false,
  quiere_email boolean default false,
  created_at   timestamptz default now()
);

-- Índices para consultas de funnel/leads
create index if not exists idx_sessions_session_id   on sessions(session_id);
create index if not exists idx_sessions_created_at   on sessions(created_at desc);
create index if not exists idx_funnel_session_id     on funnel_events(session_id);
create index if not exists idx_funnel_step           on funnel_events(step);
create index if not exists idx_funnel_created_at     on funnel_events(created_at desc);
create index if not exists idx_leads_session_id      on leads(session_id);
create index if not exists idx_leads_created_at      on leads(created_at desc);
