-- MFA de administradores, sincronización de perfiles con Auth y limitación de intentos.
begin;
select plan(22);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');
insert into public.posts (id, author_id, platform_id, title, scheduled_at) overriding system value values
  (4001, tests.uid(2), 'facebook', 'Pendiente', now());
update public.posts set status = 'pending' where id = 4001;

-- ── MFA obligatorio (valor por defecto) ─────────────────────────────────────
select is((select require_admin_mfa from public.organization_settings), true, 'la MFA de administradores es obligatoria por defecto');

select tests.login_as(tests.uid(1), 'aal1');
select is(public.is_admin(), false, 'un administrador con sesión AAL1 no actúa como administrador');
select is((select count(*)::int from public.posts), 0, 'y solo ve sus propios posts (ninguno)');
select throws_ok($$select public.approve_post(4001)$$, '42501', null, 'no puede aprobar sin haber verificado el TOTP');
select throws_ok($$select public.set_user_role(tests.uid(2), 'admin')$$, '42501', null, 'ni cambiar roles');

select tests.login_as(tests.uid(1), 'aal2');
select is(public.is_admin(), true, 'con AAL2 sí es administrador');
select is((select status::text from public.approve_post(4001)), 'approved', 'y puede aprobar');

select tests.login_as(tests.uid(2), 'aal2');
select is(public.is_admin(), false, 'un empleado nunca es administrador, ni con AAL2');

select tests.logout();
update public.organization_settings set require_admin_mfa = false;
select tests.login_as(tests.uid(1), 'aal1');
select is(public.is_admin(), true, 'con la exigencia desactivada (solo desarrollo), AAL1 basta');

select tests.login_as(tests.uid(2));
select throws_ok($$update public.organization_settings set require_admin_mfa = false$$, '42501', null,
  'el ajuste de MFA no es editable desde el cliente');

-- ── Sincronización auth.users → profiles ────────────────────────────────────
select tests.logout();
insert into auth.users (id, email, invited_at, raw_user_meta_data)
values (tests.uid(20), 'nuevo@example.test', now(), '{"username":"nuevo","full_name":"Nuevo"}');

select is((select email::text from public.profiles where id = tests.uid(20)), 'nuevo@example.test', 'el perfil copia el correo');
select isnt((select invited_at from public.profiles where id = tests.uid(20)), null, 'y la fecha de invitación');
select is((select confirmed_at from public.profiles where id = tests.uid(20)), null, 'una invitación pendiente no está confirmada');

update auth.users set email_confirmed_at = now() where id = tests.uid(20);
select isnt((select confirmed_at from public.profiles where id = tests.uid(20)), null, 'al aceptar la invitación se sincroniza confirmed_at');

update auth.users set last_sign_in_at = now(), email = 'otro@example.test' where id = tests.uid(20);
select is((select email::text from public.profiles where id = tests.uid(20)), 'otro@example.test', 'los cambios de correo se sincronizan');
select isnt((select last_sign_in_at from public.profiles where id = tests.uid(20)), null, 'y el último acceso');

-- ── Intentos de inicio de sesión ────────────────────────────────────────────
select is(public.sign_in_allowed('Ana', '1.1.1.1'), true, 'sin fallos previos se permite iniciar sesión');
select public.record_sign_in_attempt('Ana', '1.1.1.1', false)
  from generate_series(1, 5);
select is(public.sign_in_allowed('ana', '2.2.2.2'), false, '5 fallos bloquean al usuario (sin distinguir mayúsculas) desde cualquier IP');
select is(public.sign_in_allowed('otro', '2.2.2.2'), true, 'pero no a otros usuarios');
select public.record_sign_in_attempt('ana', '1.1.1.1', true);
select is(public.sign_in_allowed('ana', '1.1.1.1'), true, 'un acceso correcto limpia los fallos');

select public.record_sign_in_attempt('user' || g, '9.9.9.9', false) from generate_series(1, 20) g;
select is(public.sign_in_allowed('nuevo2', '9.9.9.9'), false, '20 fallos desde una IP bloquean esa IP');

select tests.login_as(tests.uid(2));
select throws_ok($$select public.sign_in_allowed('x')$$, '42501', null, 'los controles de intentos no son invocables por usuarios');

select * from finish();
rollback;
