-- F11: el técnico es admin-equivalente en todo el sistema (vía is_admin() ampliada) y además
-- tiene sus propias restricciones: cuenta única, y su rol no se toca con set_user_role.
begin;
select plan(11);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');
select tests.create_user(tests.uid(9), 'tech9', 'technician');

-- ── El técnico es admin-equivalente (is_admin(), con MFA/AAL2 como un admin) ─────────────────
select tests.login_as(tests.uid(9), 'aal2');
select ok((select public.is_admin()), 'is_admin() es verdadero para el técnico (AAL2)');

select tests.login_as(tests.uid(9), 'aal1');
select ok(not (select public.is_admin()), 'sin AAL2, el técnico tampoco actúa como admin (misma regla que un admin)');
select tests.login_as(tests.uid(9), 'aal2');

-- Ve todos los perfiles (profiles_select usa is_admin()).
select is((select count(*)::int from public.profiles), 3, 'el técnico ve todos los perfiles, como un admin');

-- Puede editar organization_settings: capacidad nueva de F11, antes sin ninguna pantalla.
select lives_ok(
  $$update public.organization_settings set undo_window_seconds = 15$$,
  'el técnico edita organization_settings (org_settings_update usa is_admin())');

-- ── Cuenta única de técnico ──────────────────────────────────────────────────────────────────
select tests.login_as(tests.uid(1), 'aal2');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data)
    values ('00000000-0000-4000-8000-00000000aa01', 'tech2@example.test', '{"username":"tech2"}')$$
  || $$; update public.profiles set role = 'technician' where username = 'tech2'$$,
  null, null, 'no se puede crear un segundo técnico (índice único parcial)');

-- ── set_user_role no toca el rol de técnico ──────────────────────────────────────────────────
select throws_ok(
  $$select public.set_user_role(tests.uid(2), 'technician')$$,
  '42501', 'El rol de técnico no se asigna por aquí',
  'set_user_role rechaza asignar "technician"');

select throws_ok(
  $$select public.set_user_role(tests.uid(9), 'admin')$$,
  '42501', 'La cuenta de técnico no se puede modificar',
  'set_user_role rechaza modificar al técnico, incluso a "admin"');

-- Un admin normal SÍ puede seguir asignando roles entre empleados/administradores (sin cambios).
select lives_ok(
  $$select public.set_user_role(tests.uid(2), 'admin')$$,
  'un admin sigue pudiendo ascender a un empleado a admin');
select lives_ok(
  $$select public.set_user_role(tests.uid(2), 'employee')$$,
  'y devolverlo a empleado');

-- ── Un empleado normal no es admin-equivalente (no se amplió de más) ─────────────────────────
select tests.login_as(tests.uid(2), 'aal2');
select ok(not (select public.is_admin()), 'un empleado normal sigue sin ser admin-equivalente');
-- Con `using (is_admin())`, un UPDATE de quien no es admin no lanza excepción: Postgres no
-- encuentra ninguna fila visible y simplemente no afecta ninguna (mismo patrón que F8).
update public.organization_settings set undo_window_seconds = 99;
select isnt(
  (select undo_window_seconds from public.organization_settings),
  99, 'y no puede editar organization_settings (RLS no le deja ver la fila para actualizarla)');

select * from finish();
rollback;
