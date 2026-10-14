-- PAUSE · Migration 013 testi: yönetim paneli yetkileri
-- Supabase SQL Editor'da çalıştırılabilir; her şey ROLLBACK ile geri alınır.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-1313-0000-0000-000000000001', 'admin13@test.local'),
  ('bbbbbbbb-1313-0000-0000-000000000002', 'user13@test.local');
insert into public.admins (user_id) values ('aaaaaaaa-1313-0000-0000-000000000001');

set local role authenticated;

-- Kullanıcı B bir kayıt ve geri bildirim bırakır
select set_config('request.jwt.claim.sub', 'bbbbbbbb-1313-0000-0000-000000000002', true);
insert into public.behaviors (id, template_key, name) values ('b1313000-0000-0000-0000-0000000000b1', 'smoking', 'Sigara');
insert into public.urge_events (behavior_id, local_date, local_hour, local_weekday, source, notes)
values ('b1313000-0000-0000-0000-0000000000b1', current_date, 10, 1, 'live', 'çok özel bir not');
insert into public.feedback (answers, would_reuse) values ('{"hard":"zor"}', 8);
insert into public.app_events (session_id, name, props) values (gen_random_uuid(), 'urge_step', '{"step":"intensity","mode":"live"}');

do $$ begin
  assert not public.is_admin(), 'B yönetici değil';
  begin
    perform public.admin_overview();
    raise exception 'TEST FAILED: yönetici olmayan genel bakışı gördü';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_feedback();
    raise exception 'TEST FAILED: yönetici olmayan geri bildirimleri gördü';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_feedback_status((select id from public.feedback limit 1), 'done');
    raise exception 'TEST FAILED: yönetici olmayan durum değiştirdi';
  exception when insufficient_privilege then null;
  end;
  -- Kendini yönetici yapamaz
  begin
    insert into public.admins (user_id) values ('bbbbbbbb-1313-0000-0000-000000000002');
    raise exception 'TEST FAILED: kullanıcı kendini yönetici yaptı';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Yönetici A
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1313-0000-0000-000000000001', true);
do $$
declare o jsonb; f jsonb; m jsonb;
begin
  assert public.is_admin(), 'A yönetici';
  o := public.admin_overview();
  assert (o->>'users')::int >= 2 and (o->>'events')::int >= 1 and (o->>'feedback')::int >= 1, 'genel bakış sayıları: ' || o::text;
  assert o::text not like '%çok özel bir not%', 'genel bakış kişisel not içermemeli';

  f := public.admin_feedback();
  assert f->0->'answers'->>'hard' = 'zor' and (f->0->>'would_reuse')::int = 8, 'geri bildirim görünür';
  assert f->0 ? 'user_id' = false, 'geri bildirimde kullanıcı kimliği olmamalı';

  perform public.admin_set_feedback_status((f->0->>'id')::uuid, 'done');
  assert jsonb_array_length(public.admin_feedback('new')) = 0 or
         not exists (select 1 from jsonb_array_elements(public.admin_feedback('new')) x where x->>'id' = f->0->>'id'),
         'durum güncellenmeli';

  m := public.admin_product_metrics(7);
  assert (m->>'days')::int = 7 and jsonb_typeof(m->'drop_off') = 'array', 'ürün ölçümü';

  -- Yönetici bile kişisel kayıtları doğrudan okuyamaz (RLS)
  assert (select count(*) from public.urge_events) = 0, 'yönetici başkasının kaydını görmemeli';
  assert (select count(*) from public.feedback) = 0, 'yönetici tabloyu doğrudan okuyamaz; yalnızca fonksiyon';
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform public.admin_overview();
    raise exception 'TEST FAILED: anon çağırdı';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'YÖNETİM PANELİ TESTLERİ GEÇTİ' as sonuc;
rollback;
