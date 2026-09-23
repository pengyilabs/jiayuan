-- Catálogo (lectura miembros / escritura admin), media de posts, notificaciones y tablas de F9.
begin;
select plan(19);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');
select tests.create_user(tests.uid(3), 'emp3');

insert into public.listings (id, title, address, price, property_type) overriding system value values
  (900, '{"en":"Visible"}', 'x', 100, 'apartment'),
  (901, '{"en":"Oculto"}',  'y', 100, 'apartment');
update public.listings set deleted_at = now() where id = 901;

insert into public.posts (id, author_id, platform_id, title, scheduled_at) overriding system value values
  (2001, tests.uid(2), 'facebook', 'Borrador E2', now()),
  (2002, tests.uid(3), 'facebook', 'Borrador E3', now());

insert into public.notifications (user_id, type) values (tests.uid(2), 'demo'), (tests.uid(3), 'demo');
insert into public.social_accounts (platform_id, external_account_id) values ('facebook', 'page-1');

select tests.login_as(tests.uid(2));

select is((select count(*)::int from public.listings where id in (900, 901)), 1,
  'el empleado lee listings pero no los eliminados');
select ok((select count(*) from public.platforms) > 0, 'el empleado lee el catálogo de plataformas');
select throws_ok($$insert into public.listings (title, address, price, property_type) values ('{"en":"x"}', 'z', 1, 'villa')$$,
  '42501', null, 'el empleado no puede crear listings');
select is(
  tests.rows_affected($$update public.listings set price = 1 where id = 900$$),
  0, 'el empleado no puede editar listings');
select is(
  tests.rows_affected($$update public.platforms set connected = true where id = 'facebook'$$),
  0, 'el empleado no puede editar plataformas');

-- Media de posts
select lives_ok($$insert into public.post_media (post_id, path) values (2001, 'a/b.jpg')$$,
  'el empleado adjunta media a su borrador');
select throws_ok($$insert into public.post_media (post_id, path) values (2002, 'a/b.jpg')$$,
  '42501', null, 'pero no al borrador de otro empleado');
select is((select count(*)::int from public.post_media), 1, 'y solo ve la media de sus posts');

-- Notificaciones
select is((select count(*)::int from public.notifications), 1, 'cada usuario ve solo sus notificaciones');
select throws_ok($$insert into public.notifications (user_id, type) values (tests.uid(2), 'falsa')$$,
  '42501', null, 'las notificaciones no se pueden crear desde el cliente');
select lives_ok($$update public.notifications set read_at = now()$$, 'puede marcar sus notificaciones como leídas');
select throws_ok($$update public.notifications set type = 'otro'$$, '42501', null, 'pero no editar su contenido');

-- Tablas de publicación (F9)
select is((select count(*)::int from public.social_accounts), 0, 'el empleado no ve las cuentas sociales');
select throws_ok($$insert into public.social_accounts (platform_id, external_account_id) values ('facebook', 'x')$$,
  '42501', null, 'y no puede crearlas');

-- Auditoría
select ok((select count(*) from public.audit_log where post_id = 2001) > 0, 've la auditoría de sus posts');
select is((select count(*)::int from public.audit_log where post_id = 2002), 0, 'no ve la de posts ajenos');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'y no puede alterarla');

select tests.login_as(tests.uid(1));
select is((select count(*)::int from public.listings where id in (900, 901)), 2, 'el administrador ve también los listings eliminados');
select is((select count(*)::int from public.social_accounts), 1, 'el administrador ve las cuentas sociales');

select tests.logout();
select * from finish();
rollback;
