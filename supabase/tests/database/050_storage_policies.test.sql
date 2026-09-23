-- Políticas de Storage: post-media (privado, por carpeta de autor) y listing-media (público).
begin;
select plan(12);

select tests.create_user(tests.uid(1), 'admin1', 'admin');
select tests.create_user(tests.uid(2), 'emp2');
select tests.create_user(tests.uid(3), 'emp3');

select is((select public from storage.buckets where id = 'post-media'), false, 'post-media es privado');
select is((select public from storage.buckets where id = 'listing-media'), true, 'listing-media es público');
select ok((select allowed_mime_types from storage.buckets where id = 'post-media') @> array['image/jpeg'],
  'post-media limita los tipos MIME');

insert into storage.objects (bucket_id, name) values
  ('post-media', tests.uid(3)::text || '/10/otro.jpg'),
  ('listing-media', 'condo/1.jpg');

select tests.login_as(tests.uid(2));
select lives_ok(
  format($$insert into storage.objects (bucket_id, name) values ('post-media', %L)$$, tests.uid(2)::text || '/11/mio.jpg'),
  'el empleado sube a su propia carpeta');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('post-media', %L)$$, tests.uid(3)::text || '/12/x.jpg'),
  '42501', null, 'no puede subir a la carpeta de otro empleado');
select is((select count(*)::int from storage.objects where bucket_id = 'post-media'), 1,
  'solo ve sus propios archivos');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('listing-media', 'condo/2.jpg')$$,
  '42501', null, 'no puede subir a listing-media');

select tests.login_as(tests.uid(1));
select is((select count(*)::int from storage.objects where bucket_id = 'post-media'), 2, 'el administrador ve todos los archivos');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('listing-media', 'condo/3.jpg')$$,
  'el administrador sube a listing-media');

select tests.login_as_anon();
select is((select count(*)::int from storage.objects where bucket_id = 'post-media'), 0, 'anon no ve post-media');
select is((select count(*)::int from storage.objects where bucket_id = 'listing-media'), 2, 'anon sí ve listing-media');

select tests.login_as(tests.uid(2));
select is(
  tests.rows_affected($$delete from storage.objects where bucket_id = 'post-media' and name like tests.uid(3)::text || '/%'$$),
  0, 'no puede borrar archivos ajenos');

select tests.logout();
select * from finish();
rollback;
