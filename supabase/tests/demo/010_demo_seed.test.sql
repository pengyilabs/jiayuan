-- La semilla de demostración carga y respeta la visibilidad por rol.
begin;
select plan(14);

select is((select count(*)::int from public.platforms), 9, 'catálogo: 9 plataformas');
select is((select count(*)::int from public.post_types), 34, 'catálogo: 34 formatos');
select is((select count(*)::int from public.templates), 12, 'catálogo: 12 templates');
select is((select count(*)::int from public.listings), 6, 'demo: 6 propiedades');
select is((select count(*)::int from public.posts), 17, 'demo: 17 posts');
select is((select count(*)::int from public.profiles where role = 'admin'), 1, 'demo: un administrador');
select is((select count(*)::int from public.posts where status = 'pending'), 5, 'demo: 5 posts pendientes');

select tests.login_as('00000000-0000-4000-8000-0000000000a1');
select is((select count(*)::int from public.posts), 17, 'el administrador demo ve los 17 posts');
select is((select count(*)::int from public.profiles), 3, 'y los 3 perfiles');

select tests.login_as('00000000-0000-4000-8000-0000000000a2');
select is((select count(*)::int from public.posts), 9, '李明 ve solo sus 9 posts');
select is((select count(*)::int from public.posts where author_id <> '00000000-0000-4000-8000-0000000000a2'), 0,
  'y ninguno de otro autor');

select tests.login_as('00000000-0000-4000-8000-0000000000a3');
select is((select count(*)::int from public.posts), 8, '王芳 ve solo sus 8 posts');
select is((select count(*)::int from public.listings), 6, 'todos ven las propiedades');

select tests.logout();
select is((select (encrypted_password = extensions.crypt('demo-password-123', encrypted_password)) from auth.users where email = 'liming@homedirect.ca'),
  true, 'los usuarios demo tienen contraseña válida');
select * from finish();
rollback;
