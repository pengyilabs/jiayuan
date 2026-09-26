-- Flujo de aprobación, auditoría, borrado lógico y "deshacer".
begin;
select plan(32);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');
select tests.create_user(tests.uid(3), 'emp3');

insert into public.posts (id, author_id, platform_id, title, scheduled_at) overriding system value values
  (1001, tests.uid(2), 'facebook',  'Post A', now()),
  (1002, tests.uid(2), 'instagram', 'Post B', now()),
  (1003, tests.uid(2), 'facebook',  'Post C', now());

-- ── Envío a aprobación ──────────────────────────────────────────────────────
select tests.login_as(tests.uid(3));
select throws_ok($$select public.submit_post(1001)$$, '42501', null,
  'otro empleado no puede enviar a aprobación un post ajeno');

select tests.login_as(tests.uid(2));
select is((select status::text from public.submit_post(1001)), 'pending', 'el autor envía el post a aprobación');
select throws_ok($$select public.submit_post(1001)$$, '23514', null, 'no se puede enviar dos veces');

select tests.logout();
select is((select count(*)::int from public.notifications where user_id = tests.uid(1) and type = 'post_pending'), 1,
  'los administradores reciben una notificación');

-- ── Aprobación / rechazo ────────────────────────────────────────────────────
select tests.login_as(tests.uid(2));
select throws_ok($$select public.approve_post(1001)$$, '42501', null, 'un empleado no puede aprobar (ni su propio post)');
select throws_ok($$select public.reject_post(1001, 'no')$$, '42501', null, 'un empleado no puede rechazar');

select tests.login_as(tests.uid(1));
select is((select status::text from public.approve_post(1001)), 'approved', 'el administrador aprueba');
select is((select approved_by from public.posts where id = 1001), tests.uid(1), 'se registra quién aprobó');
select throws_ok($$select public.approve_post(1001)$$, '23514', null, 'no se puede aprobar un post ya aprobado');
select throws_ok($$select public.reject_post(1001, 'tarde')$$, '23514', null, 'no se puede rechazar un post aprobado');

select tests.logout();
select is((select count(*)::int from public.notifications where user_id = tests.uid(2) and type = 'post_approved'), 1,
  'el autor recibe la notificación de aprobación');

select tests.login_as(tests.uid(2));
select lives_ok($$select public.submit_post(1002)$$, 'el autor envía el post B');
select tests.login_as(tests.uid(1));
select throws_ok($$select public.reject_post(1002, '   ')$$, '22023', null, 'el rechazo exige motivo');
select is((select status::text from public.reject_post(1002, 'Faltan fotos')), 'rejected', 'el administrador rechaza con motivo');

select tests.login_as(tests.uid(2));
select is((select rejection_reason from public.posts where id = 1002), 'Faltan fotos', 'el autor ve el motivo del rechazo');
select is((select status::text from public.reopen_post(1002)), 'draft', 'el autor reabre el post rechazado');
select lives_ok($$update public.posts set title = 'Post B corregido' where id = 1002$$, 'y lo corrige');
select is((select status::text from public.submit_post(1002)), 'pending', 'y lo reenvía');

select tests.logout();
select throws_ok($$update public.posts set status = 'published' where id = 1003$$, '23514', null,
  'el trigger impide saltos de estado incluso con acceso directo (draft → published)');

-- ── Publicación manual ──────────────────────────────────────────────────────
select tests.login_as(tests.uid(1));
select is((select status::text from public.mark_published(1001, 'https://example.test/p/1')), 'published',
  'el administrador marca como publicado');
select is((select external_url from public.posts where id = 1001), 'https://example.test/p/1', 'y guarda la URL');

-- ── Deshacer ────────────────────────────────────────────────────────────────
-- 1001: approved(a1) → published(a2). Solo se puede deshacer la última acción.
select throws_ok(
  $$select public.undo_action((select id from public.audit_log where post_id = 1001 and action = 'approved'))$$,
  '55000', null, 'solo se puede deshacer la última acción del post');
select is(
  (select status::text from public.undo_action((select id from public.audit_log where post_id = 1001 and action = 'published'))),
  'approved', 'deshacer la publicación devuelve el post a aprobado');
select throws_ok(
  $$select public.undo_action((select id from public.audit_log where post_id = 1001 and action = 'published'))$$,
  '23514', null, 'una acción no se puede deshacer dos veces');

-- 1002: pending → el admin aprueba y luego deshace; el empleado no puede deshacer acciones ajenas.
select is((select status::text from public.approve_post(1002)), 'approved', 'aprobación del post B');
select tests.login_as(tests.uid(2));
select throws_ok(
  $$select public.undo_action((select id from public.audit_log where post_id = 1002 and action = 'approved' order by id desc limit 1))$$,
  '42501', null, 'el autor no puede deshacer la aprobación del administrador');
select tests.login_as(tests.uid(1));
select is(
  (select status::text from public.undo_action((select id from public.audit_log where post_id = 1002 and action = 'approved' order by id desc limit 1))),
  'pending', 'el administrador deshace su aprobación');
select is((select approved_by from public.posts where id = 1002), null, 'y se limpia approved_by');

-- Ventana de deshacer agotada
select public.approve_post(1002);
select tests.logout();
update public.audit_log set at = now() - interval '1 hour' where post_id = 1002 and action = 'approved';
select tests.login_as(tests.uid(1));
select throws_ok(
  $$select public.undo_action((select id from public.audit_log where post_id = 1002 and action = 'approved' order by id desc limit 1))$$,
  '55000', null, 'fuera de la ventana ya no se puede deshacer');

-- ── Borrado lógico ──────────────────────────────────────────────────────────
select tests.login_as(tests.uid(2));
select is((select deleted_at is not null from public.soft_delete_post(1003)), true, 'el autor elimina (lógicamente) su borrador');
select is(
  (select deleted_at is null from public.undo_action((select id from public.audit_log where post_id = 1003 and action = 'deleted'))),
  true, 'y puede deshacer el borrado');
select throws_ok($$select public.soft_delete_post(1001)$$, '42501', null,
  'un empleado no puede eliminar un post aprobado');

select tests.logout();
select * from finish();
rollback;
