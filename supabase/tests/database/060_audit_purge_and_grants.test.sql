-- Auditoría de ediciones, purga de posts eliminados y privilegios de ejecución.
begin;
select plan(9);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');

insert into public.posts (id, author_id, platform_id, title, scheduled_at) overriding system value values
  (3001, tests.uid(2), 'facebook', 'Original', now()),
  (3002, tests.uid(2), 'facebook', 'Vieja', now());

select tests.login_as(tests.uid(2));
select is((select count(*)::int from public.audit_log where post_id = 3001 and action = 'created'), 1,
  'la creación de un post queda auditada');
update public.posts set title = 'Editado', body = 'Nuevo cuerpo' where id = 3001;
select is((select detail -> 'before' ->> 'title' from public.audit_log where post_id = 3001 and action = 'edited'),
  'Original', 'la edición registra el valor anterior');
select is((select detail -> 'before' ->> 'hashtags' from public.audit_log where post_id = 3001 and action = 'edited'),
  null, 'y solo los campos que cambiaron');

-- Privilegios de ejecución
select tests.login_as_anon();
select throws_ok($$select public.submit_post(3001)$$, '42501', null, 'anon no puede ejecutar las RPC');
select throws_ok($$select public.is_admin()$$, '42501', null, 'ni las funciones auxiliares');
select tests.login_as(tests.uid(2));
select throws_ok($$select public.purge_deleted_posts()$$, '42501', null, 'la purga solo la ejecuta service_role');
select throws_ok($$select public._notify(tests.uid(2), 'x', '{}')$$, '42501', null,
  'los helpers internos no son invocables desde el cliente');

-- Purga: retención de 30 días
select tests.logout();
update public.posts set deleted_at = now() - interval '31 days' where id = 3002;
update public.posts set deleted_at = now() - interval '5 days'  where id = 3001;
select is(public.purge_deleted_posts(), 1, 'la purga elimina solo los posts fuera de retención');
select is((select count(*)::int from public.posts where id in (3001, 3002)), 1, 'y conserva los recientes');

select * from finish();
rollback;
