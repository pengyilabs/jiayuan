# Despliegue

PropPulse es un sitio estático (Vite) que habla con un proyecto de Supabase. El estático se publica en Vercel, Netlify o Cloudflare Pages (cualquiera vale: no hay servidor propio); el backend es el proyecto de Supabase (Postgres + Auth + Storage + Edge Functions).

## 1. Preparar el proyecto de Supabase

1. Crea el proyecto en [supabase.com](https://supabase.com) (o usa uno existente).
2. Aplica el esquema y el catálogo, en este orden:
   ```bash
   # Con la CLI de Supabase, apuntando al proyecto remoto:
   supabase link --project-ref <tu-project-ref>
   supabase db push                       # aplica supabase/migrations/*.sql
   psql "$DATABASE_URL" -f supabase/seed.sql   # catálogo: plataformas, tipos, templates, template_variants
   ```
   `supabase/seed.demo.sql` es **solo para desarrollo/demo** — no lo apliques en producción (crea usuarios y posts de ejemplo).
3. **Storage**: confirma que existen los buckets `post-media` (privado) y `listing-media` (público) — las migraciones ya los crean, pero verifícalo en el panel de Supabase tras el `db push`.
4. **Auth**:
   - `Site URL` y `Redirect URLs`: la URL pública donde quede publicado el sitio (más `http://localhost:5173` si vas a seguir probando en local contra este proyecto).
   - Confirma que `enable_signup = false` quedó aplicado (no hay registro público; todo el mundo entra por invitación, F2).
   - Activa TOTP en la configuración de MFA del proyecto si aún no está disponible por defecto.
5. **Edge Functions**: despliega las cuatro con la CLI:
   ```bash
   supabase functions deploy sign-in --no-verify-jwt
   supabase functions deploy request-password-reset --no-verify-jwt
   supabase functions deploy invite-user
   supabase functions deploy sync-user-access
   ```
   Configura sus variables de entorno (`supabase secrets set`): `SITE_URL` (la URL pública del sitio) y `ALLOWED_ORIGINS` (la misma URL; varias separadas por comas si hay más de un origen).
6. **Primer administrador**: no hay nadie que lo invite, así que se crea desde tu equipo (nunca desde el navegador):
   ```bash
   SUPABASE_URL=https://<project-ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
   npm run admin:create -- --email ti@tuempresa.com --username tuusuario --name "Tu nombre"
   ```
   Guarda la clave `service_role` fuera del repositorio (gestor de secretos del equipo); no debe llegar nunca al navegador ni a ningún archivo `.env` que se suba a un hosting estático.

## 2. Variables de entorno del sitio estático

En el panel del hosting (Vercel/Netlify/Cloudflare Pages), configura:

| Variable                 | Valor                                                                |
| ------------------------ | -------------------------------------------------------------------- |
| `VITE_DATA_SOURCE`       | `supabase`                                                           |
| `VITE_SUPABASE_URL`      | `https://<project-ref>.supabase.co`                                  |
| `VITE_SUPABASE_ANON_KEY` | la clave `anon` del proyecto (es pública por diseño; la protege RLS) |

Nunca configures `VITE_SUPABASE_SERVICE_ROLE_KEY` ni nada equivalente: `src/config/env.ts` ya rechaza arrancar si detecta una clave de `service_role` en el lado del cliente.

## 3. Publicar el estático

Build: `npm run build` (comando estándar; el hosting lo ejecuta automáticamente en cada despliegue). Carpeta de salida: `dist`.

- **Vercel**: importa el repositorio; framework "Vite" se detecta solo. Build command `npm run build`, output `dist`. Añade las tres variables de entorno de arriba en Project Settings → Environment Variables.
- **Netlify**: `netlify.toml` mínimo:
  ```toml
  [build]
    command = "npm run build"
    publish = "dist"

  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
  (la redirección es necesaria: es una SPA con rutas por `history.pushState`, F0).
- **Cloudflare Pages**: build command `npm run build`, output directory `dist`; en "Environment variables" añade las tres de arriba. Como con Netlify, configura un fallback de SPA a `index.html` (Cloudflare Pages lo hace automáticamente si no hay un archivo que coincida con la ruta).

## 4. CI

`.github/workflows/ci.yml` (F8) corre en cada push/PR: typecheck, lint, formato, catálogo al día, tests unitarios con cobertura, build (job `check`); typecheck de las Edge Functions con Deno (job `functions`); pgTAP + el contrato de repositorios contra Postgres real con la imagen `supabase/postgres` (job `database`); Playwright en los tres tamaños (job `e2e`). Los cuatro corren en paralelo — así un fallo en Playwright (que necesita descargar un navegador) no bloquea la señal rápida del resto.

**No se ha ejecutado nunca en un runner real** (este proyecto se preparó en un entorno sin acceso a GitHub Actions): la configuración sigue las prácticas estándar de cada herramienta, pero la primera vez que corra hay que revisar en particular:

- Si `POSTGRES_USER=meta` en el contenedor `supabase/postgres` concede de verdad privilegios de superusuario (algunas imágenes de Supabase reservan ese rol a `supabase_admin`); si no, ajustar las credenciales del job `database`.
- La etiqueta de la imagen `supabase/postgres:15.1.1.78`: comprobar cuál es la vigente en <https://hub.docker.com/r/supabase/postgres/tags> y actualizarla si hace falta.
- La versión de PostgREST descargada (`v12.2.3`): ajustar si hay una más reciente.

## 5. Copias de seguridad

- **Automáticas**: los proyectos de pago de Supabase incluyen copias diarias gestionadas (Point-in-Time Recovery en los planes que lo ofrecen). Actívalas desde el panel del proyecto → Database → Backups.
- **Manuales** (antes de una migración arriesgada, o en el plan gratuito que no trae backups automáticos):
  ```bash
  pg_dump "$DATABASE_URL" -f backup-$(date +%Y%m%d).sql
  ```
  Guarda el volcado fuera de Supabase (el bucket de otro proveedor, por ejemplo) — un backup en el mismo proyecto no protege contra el borrado accidental del proyecto entero.
- El **Storage** (fotos de listings y de posts) no lo cubre `pg_dump`: se respalda aparte, por ejemplo sincronizando los buckets a otro almacenamiento con `supabase storage` de la CLI o con `rclone`.

## 6. Checklist de release

- [ ] `npm run check` en verde (typecheck + lint + formato + tests unitarios).
- [ ] `npm run db:test` y `npm run db:test:integration` en verde contra una base de datos limpia.
- [ ] `npm run functions:check` en verde.
- [ ] `npm run build` sin avisos de tamaño de bundle nuevos.
- [ ] Migraciones aplicadas al proyecto de Supabase de destino (`supabase db push`) y `supabase/seed.sql` aplicado (sin `seed.demo.sql` en producción).
- [ ] Los cuatro Edge Functions desplegados, con `SITE_URL`/`ALLOWED_ORIGINS` apuntando al dominio real.
- [ ] Primer administrador creado con `npm run admin:create` y con su TOTP configurado en el primer inicio de sesión.
- [ ] Variables de entorno del hosting configuradas (`VITE_DATA_SOURCE=supabase` + URL + clave `anon`).
- [ ] `Site URL`/`Redirect URLs` de Supabase Auth apuntando al dominio real.
- [ ] Backups activados (automáticos si el plan los incluye; si no, un `pg_dump` documentado y calendarizado).
- [ ] E2E (`npm run test:e2e`) corridos al menos una vez contra el entorno de destino, en un equipo con navegador disponible.
