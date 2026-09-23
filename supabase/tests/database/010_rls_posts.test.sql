-- RLS de posts: el empleado solo ve y edita lo suyo; el estado solo cambia por RPC.
begin;
select plan(18);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');
select tests.create_user(tests.uid(3), 'emp3');

insert into public.posts (author_id, platform_id, title, scheduled_at) values
  (tests.uid(2), 'facebook', 'E2 draft', now()),
  (tests.uid(3), 'facebook', 'E3 draft', now());

-- ── Empleado 2 ──────────────────────────────────────────────────────────────
select tests.login_as(tests.uid(2));

select is((select count(*)::int from public.posts), 1, 'el empleado solo ve sus propios posts');
select is((select count(*)::int from public.posts where title = 'E3 draft'), 0, 'no ve los posts de otro empleado');

select throws_ok(
  $$insert into public.posts (author_id, platform_id, title, scheduled_at)
    values (tests.uid(3), 'facebook', 'suplantado', now())$$,
  '42501', null, 'no puede crear posts a nombre de otro usuario');

select throws_ok(
  $$insert into public.posts (author_id, platform_id, title, scheduled_at, status, approved_by, approved_at)
    values (tests.uid(2), 'facebook', 'auto-aprobado', now(), 'approved', tests.uid(2), now())$$,
  '42501', null, 'no puede insertar un post con estado distinto de borrador');

select throws_ok(
  $$update public.posts set status = 'approved' where title = 'E2 draft'$$,
  '42501', null, 'no puede cambiar el estado directamente (se autoaprobaría)');

select throws_ok(
  $$update public.posts set approved_by = tests.uid(2) where title = 'E2 draft'$$,
  '42501', null, 'no puede escribir approved_by');

select lives_ok(
  $$insert into public.posts (author_id, platform_id, title, scheduled_at)
    values (tests.uid(2), 'instagram', 'E2 segundo', now())$$,
  'puede crear un borrador propio');

select is(
  (select status::text from public.posts where title = 'E2 segundo'), 'draft',
  'los posts nuevos nacen como borrador');

select lives_ok(
  $$update public.posts set title = 'E2 editado' where title = 'E2 draft'$$,
  'puede editar su borrador');

select is(
  tests.rows_affected($$update public.posts set title = 'hack' where title = 'E3 draft'$$),
  0, 'no puede editar posts ajenos');

select throws_ok($$delete from public.posts$$, '42501', null, 'no puede borrar posts (solo borrado lógico vía RPC)');

select lives_ok($$select public.submit_post((select id from public.posts where title = 'E2 editado'))$$,
  'puede solicitar aprobación de su borrador');

select is(
  tests.rows_affected($$update public.posts set title = 'tras enviar' where title = 'E2 editado'$$),
  0, 'un post pendiente ya no es editable por su autor');

-- ── Administrador ───────────────────────────────────────────────────────────
select tests.login_as(tests.uid(1));

select is((select count(*)::int from public.posts), 3, 'el administrador ve todos los posts');
select lives_ok(
  $$update public.posts set title = 'editado por admin' where title = 'E3 draft'$$,
  'el administrador puede editar el contenido de cualquier post');

-- ── Anónimo ─────────────────────────────────────────────────────────────────
select tests.login_as_anon();
select throws_ok($$select * from public.posts$$, '42501', null, 'anon no tiene acceso a posts');

-- ── Usuario desactivado ─────────────────────────────────────────────────────
select tests.logout();
update public.profiles set active = false where id = tests.uid(3);
select tests.login_as(tests.uid(3));
select is((select count(*)::int from public.posts), 0, 'un usuario desactivado no ve ningún post');
select throws_ok(
  $$insert into public.posts (author_id, platform_id, title, scheduled_at)
    values (tests.uid(3), 'facebook', 'x', now())$$,
  '42501', null, 'un usuario desactivado no puede crear posts');

select tests.logout();
select * from finish();
rollback;
