-- Perfiles, roles, último administrador y configuración de la organización.
begin;
select plan(17);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');

-- ── Alta de usuarios ────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  (tests.uid(10), 'a@example.test', '{"username":"dupuser","role":"admin"}'),
  (tests.uid(11), 'b@example.test', '{"username":"dupuser"}');

select is((select role::text from public.profiles where id = tests.uid(10)), 'employee',
  'el rol de user_metadata se ignora: siempre nace como empleado');
select is((select username::text from public.profiles where id = tests.uid(11)), 'dupuser1',
  'los nombres de usuario duplicados reciben sufijo');
select is((select count(*)::int from public.profiles where username = 'DUPUSER'), 1,
  'el nombre de usuario no distingue mayúsculas');

-- ── Empleado ────────────────────────────────────────────────────────────────
select tests.login_as(tests.uid(2));

select is((select count(*)::int from public.profiles), 1, 'el empleado solo ve su propio perfil');
select throws_ok($$update public.profiles set role = 'admin' where id = tests.uid(2)$$,
  '42501', null, 'no puede cambiar su propio rol');
select throws_ok($$update public.profiles set active = false where id = tests.uid(2)$$,
  '42501', null, 'no puede cambiar su estado activo');
select throws_ok($$update public.profiles set username = 'otro' where id = tests.uid(2)$$,
  '42501', null, 'no puede cambiar su nombre de usuario');
select lives_ok($$update public.profiles set full_name = 'Nuevo Nombre', locale = 'fr' where id = tests.uid(2)$$,
  'sí puede cambiar su nombre y su idioma');
select throws_ok($$select public.set_user_role(tests.uid(2), 'admin')$$,
  '42501', null, 'set_user_role está reservado al administrador');
select throws_ok($$select public.set_user_active(tests.uid(1), false)$$,
  '42501', null, 'set_user_active está reservado al administrador');
select is((select count(*)::int from public.organization_settings), 1, 'el empleado lee la configuración');
select is(
  tests.rows_affected($$update public.organization_settings set undo_window_seconds = 100$$),
  0, 'el empleado no puede modificar la configuración');

-- ── Administrador ───────────────────────────────────────────────────────────
select tests.login_as(tests.uid(1));

select throws_ok($$select public.set_user_role(tests.uid(1), 'employee')$$,
  '23514', null, 'no se puede degradar al último administrador');
select throws_ok($$select public.set_user_active(tests.uid(1), false)$$,
  '23514', null, 'no se puede desactivar al último administrador');
select is((select role::text from public.set_user_role(tests.uid(2), 'admin')), 'admin',
  'el administrador puede promover a un empleado');
select lives_ok($$select public.set_user_role(tests.uid(1), 'employee')$$,
  'con otro administrador activo sí se puede degradar');
select tests.login_as(tests.uid(2));
select throws_ok($$update public.organization_settings set timezone = 'Mars/Olympus'$$,
  '22023', null, 'se rechaza una zona horaria inexistente');

select tests.logout();
select * from finish();
rollback;
