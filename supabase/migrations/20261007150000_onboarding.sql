-- =====================================================================
-- PAUSE · Migration 002 · Onboarding
-- 1. Davranışın genellikle hangi gün diliminde olduğu (onboarding 3. ekran)
-- 2. Aynı şablon davranış bir kullanıcıda iki kez aktif olamaz
-- =====================================================================

alter table public.behaviors
  add column usual_times text[] not null default '{}'
  constraint behaviors_usual_times_valid
    check (usual_times <@ array['morning', 'afternoon', 'evening', 'night', 'varies']::text[]);

create unique index behaviors_user_template_active_uq
  on public.behaviors (user_id, template_key)
  where template_key is not null and archived_at is null;
