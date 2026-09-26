# PropPulse — 加园地产团队

Gestión de contenido para redes sociales (Facebook, Instagram, WeChat, Xiaohongshu, Douyin…) de una agencia inmobiliaria.
Este repositorio contiene las **Fases 0 a 4** del [plan del proyecto](docs/PLAN.md): modularización del prototipo original, backend Supabase (esquema, RLS, RPC, tests), autenticación/roles/MFA, diálogos/avisos/deshacer, y el flujo completo de posts (crear, aprobar, publicar).

## Requisitos

- Node.js ≥ 22.12 (`.nvmrc`)

## Scripts

| Comando                       | Descripción                                                       |
| ----------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                 | Servidor de desarrollo (Vite)                                     |
| `npm run build`               | Typecheck + build de producción en `dist/`                        |
| `npm run preview`             | Sirve el build                                                    |
| `npm run typecheck`           | `tsc --noEmit` (modo `strict`)                                    |
| `npm run lint`                | ESLint (typescript-eslint con reglas de tipos)                    |
| `npm run format`              | Prettier                                                          |
| `npm test`                    | Vitest (unitarios + integración en jsdom)                         |
| `npm run test:e2e`            | Playwright (usa `PW_CHROMIUM_PATH` para un Chromium propio)       |
| `npm run check`               | typecheck + lint + format:check + tests                           |
| `npm run db:test`             | Migraciones + tests pgTAP (PostgreSQL local, ver docs/F1.md)      |
| `npm run db:test:integration` | Contrato de repositorios contra Postgres+RLS+PostgREST            |
| `npm run db:seed:generate`    | Regenera `supabase/seed*.sql` desde `src/data/seed`               |
| `npm run db:types`            | Regenera `src/types/database.ts` (Supabase CLI)                   |
| `npm run functions:check`     | Typecheck de las Edge Functions con Deno                          |
| `npm run admin:create`        | Crea el primer administrador o restablece su MFA (ver docs/F2.md) |

Hooks de git (`simple-git-hooks` + `lint-staged`): ESLint y Prettier sobre los archivos en _staging_.

## Despliegue

La app usa **History API** (`/`, `/listings`, `/templates`, `/approvals`, `/settings`). El hosting debe devolver `index.html` para rutas desconocidas:

- Netlify: `/* /index.html 200` en `public/_redirects`
- Vercel: `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`
- Cloudflare Pages: comportamiento SPA por defecto

## Arquitectura

```
src/
  app/        bootstrap, shell (ensamblado del HTML), store, state, router, navigation, actions, services
  core/       html (plantillas seguras), dom, dates
  config/     env (VITE_*) y cliente de Supabase
  data/       repositories/ (memory · supabase), mappers, snapshot, seed/, memory-directory, functions
  i18n/       locales/{zh,en,fr,es}.json, calendar, t()/dict()/localize()
  types/      models.ts (dominio) · database.ts (generado) · db.ts
  ui/         modal, dialog, toast, loading, sidebar, lang-switch, filters, image-fallback, errors, icons/
  features/   home · listings · templates · approvals · settings · platforms · posts · notifications · auth · team
  styles/     tokens, base, layout, components/*, features/*, responsive
supabase/     migrations/ · seed*.sql (generados) · tests/ (pgTAP) · functions/ (Edge Functions) · config.toml
tests/        unit/ · contract/ (memoria, Supabase y adaptadores de funciones) · functions/ (dobles) · e2e/ (Playwright)
```

### Autenticación y roles (F2)

- **Login por usuario** (no correo): la Edge Function `sign-in` resuelve el usuario, aplica el límite de intentos y devuelve la sesión de Supabase Auth.
- **Invitaciones**: Settings → Team (solo admin) invita, cambia roles, desactiva y reenvía; usa la Edge Function `invite-user`.
- **MFA**: los administradores necesitan TOTP verificado (AAL2) si `organization_settings.require_admin_mfa` está activo (por defecto, sí; el modo demo lo desactiva).
- **Primer administrador**: no hay nadie que lo invite, así que se crea con `npm run admin:create` (requiere `SUPABASE_SERVICE_ROLE_KEY`).
- Detalle completo, decisiones y limitaciones: [docs/F2.md](docs/F2.md).

### Convenciones

- **HTML seguro**: todo HTML dinámico se construye con la etiqueta `html\`…\``(escapa por defecto). Solo`raw()`marca contenido de confianza (p. ej. SVG estático). Nunca concatenar datos en`innerHTML`.
- **Sin handlers inline**: el HTML declara `data-action="feature:accion"` (click) o `data-change="…"` y cada módulo los registra con `registerActions()`. Se resuelve con `closest()`: el elemento más interno gana.
- **Estado único**: `store` (`getState`, `setState`, `watch(selector, cb)`). Los features se suscriben a lo que renderizan; no hay variables globales.
- **Textos**: solo desde `i18n/locales/*.json` (los 4 idiomas deben tener las mismas claves; hay un test que lo verifica, incluidas las claves `data-i18n` de los fragmentos HTML).
- **Rutas**: `router.ts` (`navigate`, `addRouteGuard`; F2 usa este último para bloquear páginas según el rol).
- **Origen de datos**: interfaces en `data/repositories/types.ts`; `VITE_DATA_SOURCE` elige memoria (por defecto) o Supabase (ver `.env.example`). Los features usan `app/services.ts` y nunca importan semillas ni Supabase.
- **Estados de un post**: solo cambian con las operaciones del repositorio (RPC en la BD); ver docs/F1.md.

## Estado

- Fase 0: [docs/F0.md](docs/F0.md) (paridad con el prototipo, bugs corregidos).
- Fase 1: [docs/F1.md](docs/F1.md) (modelo de datos, permisos, cómo probar, limitaciones).
- Fase 2: [docs/F2.md](docs/F2.md) (autenticación, invitaciones, roles, MFA, cómo probar, limitaciones).
- Fase 3: [docs/F3.md](docs/F3.md) (diálogos de 3 niveles, avisos con deshacer, estados de controles, cómo probar, limitaciones).
- Fase 4: [docs/F4.md](docs/F4.md) (formulario de posts, media a Storage, notificaciones, publicación manual, cómo probar, limitaciones).
