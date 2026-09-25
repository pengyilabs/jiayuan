-- F8: batería de RLS por rol para las tablas de catálogo que comparten la misma política
-- genérica (F1) pero que las pruebas anteriores no habían ejercitado una a una: post_types,
-- post_type_groups, post_type_group_platforms, listing_media y template_variants (nueva en F5).
-- listings y platforms (la misma política) ya se comprueban en 040_catalog_and_private_tables.
--
-- Nota sobre UPDATE/DELETE: la política de estas tablas es `using (is_admin())`. Cuando quien
-- llama no es admin, Postgres no encuentra ninguna fila visible para actualizar o borrar y
-- simplemente no afecta ninguna (no lanza una excepción) — a diferencia de INSERT, que sí falla
-- con 42501 porque el `with check` rechaza la fila nueva. Por eso aquí se comprueba "0 filas
-- afectadas" para UPDATE/DELETE, y `throws_ok` solo para INSERT.
begin;
select plan(20);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');
insert into public.listings (id, title, address, price, property_type) overriding system value
  values (950, '{"en":"x"}', 'z', 1, 'apartment');

select tests.login_as(tests.uid(2));

-- ── Lectura: cualquier miembro ve el catálogo completo ──────────────────────
select ok((select count(*) from public.post_types) > 0, 'el empleado lee post_types');
select ok((select count(*) from public.post_type_groups) > 0, 'el empleado lee post_type_groups');
select ok((select count(*) from public.post_type_group_platforms) > 0,
  'el empleado lee post_type_group_platforms');
select ok((select count(*) from public.template_variants) > 0, 'el empleado lee template_variants');

-- ── Escritura: el empleado no puede tocar ninguna de las cinco ──────────────
select throws_ok(
  $$insert into public.post_types (platform_id, id, name, format_group) values ('facebook', 'zzz', '{"en":"x"}', 'text')$$,
  '42501', null, 'el empleado no puede crear un tipo de post');
update public.post_types set max_chars = 1 where platform_id = 'facebook' and id = 'single';
select isnt(
  (select max_chars from public.post_types where platform_id = 'facebook' and id = 'single'),
  1, 'ni modificar uno existente (RLS no le deja ver la fila para actualizarla)');

select throws_ok(
  $$insert into public.post_type_group_platforms (group_id, platform_id) values ('text', 'douyin')$$,
  '42501', null, 'el empleado no puede vincular un grupo a una plataforma');

select throws_ok(
  $$insert into public.listing_media (listing_id, path) values (950, 'a.jpg')$$,
  '42501', null, 'el empleado no puede añadir media de listing');

select throws_ok(
  $$insert into public.template_variants (template_id, platform_id, post_type_id, width, height)
    values (1, 'facebook', 'single', 100, 100)$$,
  '42501', null, 'el empleado no puede crear una variante de template');
update public.template_variants set width = 1 where template_id = 1;
select isnt(
  (select width from public.template_variants where template_id = 1 limit 1),
  1, 'ni modificar una existente');

delete from public.template_variants where template_id = 1;
select ok(
  (select count(*) from public.template_variants where template_id = 1) > 0,
  'ni borrarla (sigue existiendo)');

-- ── El administrador sí puede, en las cinco ──────────────────────────────────
select tests.login_as(tests.uid(1));

select lives_ok(
  $$insert into public.post_types (platform_id, id, name, format_group) values ('facebook', 'zzz', '{"en":"x"}', 'text')$$,
  'el administrador crea un tipo de post');
select lives_ok(
  $$update public.post_types set max_chars = 100 where platform_id = 'facebook' and id = 'zzz'$$,
  'y lo modifica');
select lives_ok(
  $$delete from public.post_types where platform_id = 'facebook' and id = 'zzz'$$,
  'y lo borra');

-- Los identificadores de post_type_groups están cerrados por un check constraint (son los 8
-- grupos fijos del dominio `PostTypeGroup`, no un catálogo abierto): se prueba con uno real.
select lives_ok(
  $$update public.post_type_groups set name = 'Text (updated)' where id = 'text'$$,
  'el administrador renombra un grupo de tipos existente');
select lives_ok(
  $$insert into public.post_type_group_platforms (group_id, platform_id) values ('text', 'douyin')$$,
  'y lo vincula a una plataforma nueva');
select lives_ok(
  $$delete from public.post_type_group_platforms where group_id = 'text' and platform_id = 'douyin'$$,
  'y deshace el vínculo');

select lives_ok(
  $$insert into public.listing_media (listing_id, path) values (950, 'a.jpg')$$,
  'el administrador añade media de listing');

select lives_ok(
  $$insert into public.template_variants (template_id, platform_id, post_type_id, width, height)
    values (1, 'twitter', 'single', 100, 100)$$,
  'el administrador crea una variante de template');
select lives_ok(
  $$delete from public.template_variants where template_id = 1 and platform_id = 'twitter'$$,
  'y la borra');

select * from finish();
rollback;
