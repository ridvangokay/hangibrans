-- HangiBranş — Tüm Türkiye Hastane & Hekim Veritabanı Şeması (Supabase / PostgreSQL)
-- Eklenti gerektirmez; Supabase Dashboard > SQL Editor kısmına yapıştırıp "Run" diyerek tek tıkla kurabilirsiniz.

-- 1. Hastaneler Tablosu (81 İl: Devlet | Üniversite [Devlet] | Özel [Özel + Vakıf Üniv.])
create table if not exists public.hospitals (
  id text primary key,
  name text not null,
  institution_type text not null check (institution_type in ('Devlet', 'Üniversite', 'Özel')),
  sub_type_label text not null,
  city text not null,
  district text not null,
  address text default '',
  lat double precision not null,
  lng double precision not null,
  phone text default '',
  phone_display text default '',
  appointment_phone text default '',
  appointment_label text default '',
  mhrs_url text default 'https://www.mhrs.gov.tr/',
  schedule_url text default '',
  schedule_label text default '',
  specialties text[] not null default array[
    'genel-cerrahi','gastroenteroloji','kardiyoloji','kalp-damar','gogus-hastaliklari',
    'ortopedi','beyin-cerrahi','kbb','noroloji','dermatoloji','uroloji','goz',
    'kadin-dogum','dahiliye','cocuk-sagligi','psikiyatri'
  ],
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_hospitals_city_district on public.hospitals (lower(city), lower(district));
create index if not exists idx_hospitals_type on public.hospitals (institution_type);
create index if not exists idx_hospitals_lat_lng on public.hospitals (lat, lng);

-- 2. Doktor Kadroları Tablosu
create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals(id) on delete cascade,
  full_name text not null,
  specialty_id text not null,
  sub_focus text default '',
  schedule_note text default '',
  source_url text default '',
  is_active boolean not null default true,
  last_synced_at timestamptz not null default now(),
  unique (hospital_id, full_name, specialty_id)
);

create index if not exists idx_doctors_hosp_spec on public.doctors (hospital_id, specialty_id);

-- 3. Okuma İzinleri (Güvenlik)
alter table public.hospitals enable row level security;
alter table public.doctors enable row level security;

drop policy if exists "Public read active hospitals" on public.hospitals;
create policy "Public read active hospitals"
  on public.hospitals for select
  using (is_active = true);

drop policy if exists "Public read active doctors" on public.doctors;
create policy "Public read active doctors"
  on public.doctors for select
  using (is_active = true);

-- 4. GPS Koordinatına Göre En Yakın Hastaneler + Doktorlar (Saf SQL Haversine)
create or replace function public.get_nearest_hospitals(
  p_lat double precision,
  p_lng double precision,
  p_specialty_id text default 'genel-cerrahi',
  p_inst_type text default 'Tümü',
  p_max_km double precision default 25,
  p_limit integer default 12
)
returns table (
  id text,
  name text,
  institution_type text,
  sub_type_label text,
  city text,
  district text,
  address text,
  lat double precision,
  lng double precision,
  phone_display text,
  appointment_phone text,
  appointment_label text,
  mhrs_url text,
  schedule_url text,
  schedule_label text,
  distance_km double precision,
  doctors jsonb
)
language sql
stable
as $$
  with calc as (
    select
      h.*,
      (
        6371.0 * acos(
          least(1.0, greatest(-1.0,
            cos(radians(p_lat)) * cos(radians(h.lat)) * cos(radians(h.lng) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(h.lat))
          ))
        )
      ) as dist_km
    from public.hospitals h
    where h.is_active = true
      and (p_specialty_id is null or p_specialty_id = '' or p_specialty_id = any(h.specialties))
      and (p_inst_type is null or p_inst_type = 'Tümü' or h.institution_type = p_inst_type)
  )
  select
    c.id,
    c.name,
    c.institution_type,
    c.sub_type_label,
    c.city,
    c.district,
    c.address,
    c.lat,
    c.lng,
    c.phone_display,
    c.appointment_phone,
    c.appointment_label,
    c.mhrs_url,
    c.schedule_url,
    c.schedule_label,
    round(c.dist_km::numeric, 2)::double precision as distance_km,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('name', d.full_name, 'focus', coalesce(nullif(d.sub_focus, ''), d.specialty_id)) order by d.full_name)
        from public.doctors d
        where d.hospital_id = c.id and d.specialty_id = p_specialty_id and d.is_active = true
      ),
      '[]'::jsonb
    ) as doctors
  from calc c
  where c.dist_km <= p_max_km
  order by c.dist_km asc
  limit p_limit;
$$;

-- 5. İl + İlçe Seçimine Göre Hastaneler + Doktorlar
create or replace function public.get_hospitals_by_district(
  p_city text,
  p_district text,
  p_specialty_id text default 'genel-cerrahi',
  p_inst_type text default 'Tümü',
  p_limit integer default 12
)
returns table (
  id text,
  name text,
  institution_type text,
  sub_type_label text,
  city text,
  district text,
  address text,
  lat double precision,
  lng double precision,
  phone_display text,
  appointment_phone text,
  appointment_label text,
  mhrs_url text,
  schedule_url text,
  schedule_label text,
  same_district boolean,
  doctors jsonb
)
language sql
stable
as $$
  select
    h.id,
    h.name,
    h.institution_type,
    h.sub_type_label,
    h.city,
    h.district,
    h.address,
    h.lat,
    h.lng,
    h.phone_display,
    h.appointment_phone,
    h.appointment_label,
    h.mhrs_url,
    h.schedule_url,
    h.schedule_label,
    (lower(h.district) = lower(p_district)) as same_district,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('name', d.full_name, 'focus', coalesce(nullif(d.sub_focus, ''), d.specialty_id)) order by d.full_name)
        from public.doctors d
        where d.hospital_id = h.id and d.specialty_id = p_specialty_id and d.is_active = true
      ),
      '[]'::jsonb
    ) as doctors
  from public.hospitals h
  where h.is_active = true
    and lower(h.city) = lower(p_city)
    and (p_specialty_id is null or p_specialty_id = '' or p_specialty_id = any(h.specialties))
    and (p_inst_type is null or p_inst_type = 'Tümü' or h.institution_type = p_inst_type)
  order by (lower(h.district) = lower(p_district)) desc, h.institution_type asc, h.name asc
  limit p_limit;
$$;
