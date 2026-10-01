# Plan de proyecto — PropPulse (加园地产团队)

Versión 1.0 · 2026-09-21 · Base analizada: `index.html` (3 473 líneas, 257 KB)

---

## 1. Decisiones cerradas

| Tema                   | Decisión                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Visibilidad            | Empleado: solo sus propios posts. Admin: todos                                                     |
| Idiomas                | zh, en, fr, es                                                                                     |
| Publicación automática | Solo planificada (F9). El esquema queda preparado; todas las plataformas arrancan en modo `manual` |
| Auth                   | Signup público desactivado. Alta por invitación por email. Login con usuario y contraseña          |
| Primer admin           | Script único `scripts/create-admin.ts` (sin contraseñas en el repo)                                |
| Zona horaria           | America/Toronto (configurable). Todo se guarda en UTC                                              |
| Stack                  | Vite + TypeScript + ES modules (sin framework), Supabase (`supabase-js` v2)                        |

---

## 2. Trazabilidad de requisitos → fases

| Requisito                                                                                         | Fase             |
| ------------------------------------------------------------------------------------------------- | ---------------- |
| Responsive: layouts PC, teléfono y tablet                                                         | F7 (base en F0)  |
| Cuentas y roles (Empleado / Administrador)                                                        | F1, F2           |
| Empleado: crear post, solicitar aprobación, ver sus posts (Home y Listings) con fechas a publicar | F4               |
| Admin: ver todos los posts (Home y Listings), aprobar, ver fechas a publicar                      | F4, F6           |
| Múltiples templates adaptados a cada red social y tipo de multimedia                              | F5               |
| Feedback/hover, aprobar, pop-ups de confirmación (aceptar, confirmar, acción permanente)          | F3               |
| Pop-up superior con temporizador o "x" para deshacer acciones permanentes                         | F3               |
| Output funcional de la creación de post                                                           | F4, F5           |
| Calendario extendido con filtro en Home                                                           | F6               |
| Filtro en Home de pendientes / aprobados (solo admin)                                             | F6               |
| Base de datos en Supabase                                                                         | F1               |
| Modularización y buenas prácticas                                                                 | F0 (transversal) |
| Publicación automática (solo planificar)                                                          | F9               |

---

## 3. Diagnóstico del proyecto actual

- **Monolito:** CSS (~765 líneas), HTML (~610) y JS (~2 090) en un solo archivo, con `onclick` inline y variables globales.
- **Datos:** `LISTINGS`, `POSTS`, `TEMPLATES`, `APPROVALS` y `PLATFORMS` son mocks en memoria, sin persistencia.
- **Modelo frágil:** `platform` se guarda como nombre visible ("微信公众号") y no como id. `date` es solo día, sin hora ni zona horaria.
- **Roles:** no existen. El usuario está fijo como admin y la pestaña Team es estática.
- **Creación de post:** el formulario no tiene ids ni lógica. "Guardar borrador" y "Enviar" solo cierran el modal.
- **Aprobación:** `approvePost` hace `splice` en `APPROVALS` sin cambiar `POSTS.status`, sin confirmación y sin guardar el motivo de rechazo.
- **Templates:** 12 templates con 8 layouts (hero, split, gallery, magazine, story, minimal, diagonal, features), solo con previsualización. Sin adaptación por red ni por tipo de media.
- **Home:** rail de fechas, filas por día, vista grid/lista y filtro por plataforma. Sin calendario ni filtro por estado.
- **Responsive:** breakpoints parciales (550/600/768/900), sin layout de tablet, sin drawer móvil y con `100vh` (falla con teclado móvil).
- **Bugs:** `navigateTo('posts')` apunta a una página eliminada; `toISOString()` da fecha UTC como "hoy"; `lang="zh"` fijo; `alert()` en varios flujos; `innerHTML` con datos sin escapar (riesgo XSS).
- **Assets:** no se adjuntó la carpeta `images/` (31 referencias rotas).

---

## 4. Stack y convenciones

- **Base:** Vite, TypeScript `strict`, ES2022, sin `var`.
- **Backend:** `@supabase/supabase-js` v2 (no `auth-helpers`) y tipos con `supabase gen types`.
- **UI:** `<dialog>`, Popover API, `dvh`, container queries, `Intl.DateTimeFormat`. Sin `alert`/`confirm`, sin moment.js.
- **Calidad:** ESLint (flat config), Prettier, Vitest (unit), Playwright (E2E), axe (a11y), lint-staged.
- **Convenciones:** eventos por delegación (`data-action`), todo HTML dinámico escapado con utilidad central, textos solo desde i18n, sin variables globales, un módulo por responsabilidad.

## 5. Estructura modular

```
src/
  app/        router, store, bootstrap, guards
  config/     env, cliente supabase
  core/       escapeHtml, dates (TZ), events, dom
  i18n/       zh.json en.json fr.json es.json + loader
  data/       repositories: posts, listings, templates, profiles, storage
  features/   auth, home (calendar, filters, feed), listings,
              posts (form, workflow), approvals, templates (renderer, variants),
              settings (team, platforms)
  ui/         dialog, toast, button, sidebar, bottom-nav
  styles/     tokens.css, base.css, layout.css, components/*.css
  types/      database.ts (generado)
supabase/     migrations/, seed.sql, functions/ (invite-user, sign-in, publish-worker)
scripts/      create-admin.ts
tests/        unit/, rls/, e2e/
```

---

## 6. Modelo de datos (Supabase)

| Tabla                                 | Campos clave                                                                                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                            | id → auth.users, username (único), full_name, `role` enum(employee, admin), locale, active                                                                                   |
| `organization_settings`               | timezone, undo_window_seconds                                                                                                                                                |
| `listings`                            | centris_id, title/desc jsonb i18n, price, beds, baths, area, type, status, address                                                                                           |
| `platforms`                           | id text, name, `publish_mode` enum(manual, api), specs jsonb                                                                                                                 |
| `post_types`                          | platform_id, id, aspect_ratios[], max_chars, max_media, group                                                                                                                |
| `templates`                           | name, layout, scene, lang, config jsonb                                                                                                                                      |
| `template_variants`                   | template_id, platform_id, post_type, width, height, slots jsonb                                                                                                              |
| `posts`                               | listing_id?, author_id, platform_id, post_type, template_id, lang, title, body, `status`, `scheduled_at timestamptz`, approved_by, approved_at, rejection_reason, deleted_at |
| `post_media`                          | post_id, storage_path, kind, position                                                                                                                                        |
| `audit_log`                           | post_id, actor_id, action, from_status, to_status, at (base del deshacer)                                                                                                    |
| `notifications`                       | user_id, type, payload, read_at                                                                                                                                              |
| `social_accounts` _(vacía hasta F9)_  | platform_id, external_account_id, status, secret_id (Vault), scopes, expires_at                                                                                              |
| `publish_jobs` _(vacía hasta F9)_     | post_id, platform_id, run_at, status, attempts, next_attempt_at, idempotency_key, external_post_id, external_url, error                                                      |
| `publish_attempts` _(vacía hasta F9)_ | job_id, at, request/response resumido, error                                                                                                                                 |

### Estados del post

```
draft → pending → approved → publishing → published
          │           │            └──→ failed → (reintento) publishing
          └→ rejected → draft
```

Hasta F9, `approved → published` se hace con "Marcar como publicado" (modo manual).

### Permisos

| Acción                                       | Empleado                      | Admin      |
| -------------------------------------------- | ----------------------------- | ---------- |
| Crear post / solicitar aprobación            | ✅                            | ✅         |
| Ver posts (Home/Listings) + fecha a publicar | Solo propios                  | Todos      |
| Editar post                                  | Propios en `draft`/`rejected` | Cualquiera |
| Aprobar / rechazar                           | ❌                            | ✅         |
| Filtro pendientes/aprobados en Home          | ❌                            | ✅         |
| Gestión de usuarios y cuentas sociales       | ❌                            | ✅         |

### RLS y reglas de servidor

- `is_admin()` como `SECURITY DEFINER`. El rol nunca se lee de `user_metadata`.
- `posts`, `post_media`, `audit_log`: `SELECT` con `author_id = auth.uid() OR is_admin()`. Listings visibles para todos.
- Empleado: `INSERT` solo con `author_id = auth.uid()` y estado `draft|pending`. No puede fijar `approved`, `approved_by` ni modificar `profiles.role`.
- Aprobar/rechazar/deshacer solo por RPC (`approve_post`, `reject_post`, `undo_action`) con validación de rol. Un trigger valida las transiciones.
- Soft delete con `deleted_at`; purga con `pg_cron` a los 30 días.
- Storage: bucket `post-media` privado con políticas por autor/admin; `listing-media` de lectura general.

---

## 7. Autenticación

1. Signup público desactivado.
2. **Primer admin:** `scripts/create-admin.ts` con `service_role` desde variables de entorno locales. Un trigger crea el `profiles` con rol `employee` por defecto y el script lo eleva.
3. **Alta de usuarios (solo admin):** Edge Function `invite-user` → `auth.admin.inviteUserByEmail`. La persona define su contraseña desde el enlace.
4. **Login con usuario y contraseña:** Edge Function `sign-in` resuelve el email en el servidor, ejecuta `signInWithPassword` y devuelve la sesión. Errores genéricos, sin exponer el email, con rate limit.
5. **Gestión:** cambiar rol, desactivar (`profiles.active=false` + ban en Auth), reenviar invitación. No se puede degradar al último admin.
6. **Endurecimiento:** contraseña ≥12 caracteres, protección contra contraseñas filtradas (si el plan lo permite), TOTP obligatorio para admins, reset por email.

---

## 8. Fases

### F0 — Base y modularización (3–4 d)

- [ ] Vite + TypeScript + ESLint + Prettier + Vitest + Playwright + lint-staged
- [ ] Extraer CSS a `tokens`, `base`, `layout` y `components/*`
- [ ] Extraer JS a módulos; datos mock a `seed`; `I18N` a 4 JSON
- [ ] Sustituir `onclick` inline por delegación de eventos
- [ ] Utilidad `escapeHtml` y render seguro
- [ ] Store (pub/sub) y router con History API
- [ ] Corregir bugs del diagnóstico (`navigateTo('posts')`, fecha UTC, `lang`, `100dvh`, `alert`)

**Aceptación:** paridad visual y funcional con `index.html`, sin globales, lint sin errores.

### F1 — Supabase (2–3 d)

- [ ] Migraciones: enums, tablas (incluidas las de F9 vacías), índices, `updated_at`
- [ ] Triggers de `audit_log` y de transiciones; RPC `approve_post`, `reject_post`, `undo_action`
- [ ] RLS completa con `is_admin()`; buckets y políticas de Storage
- [ ] Seed desde los mocks; `supabase gen types`; repositories tipados
- [ ] Entornos dev / staging / prod

**Aceptación:** tests de RLS: un empleado no lee posts ajenos ni puede autoaprobar ni cambiar su rol.

### F2 — Cuentas y roles (3 d) — completado

- [x] Login por usuario, logout, sesión y expiración
- [x] Edge Functions `invite-user` y `sign-in`; script `create-admin`
- [x] Guards en el router; UI condicionada por rol
- [x] Settings → Team dinámico (invitar, rol, desactivar, reenviar)
- [x] TOTP para admins; reset de contraseña; errores en 4 idiomas

**Aceptación:** flujo completo invitar → definir contraseña → login → acceso solo a lo permitido.

### F3 — Feedback, diálogos y deshacer (2 d) — completado

- [x] Estados hover / focus / active / disabled / loading en todos los controles; `prefers-reduced-motion`
- [x] `ui/dialog` con tres niveles: **Aceptar** (informativo), **Confirmar** (reversible), **Acción permanente** (botón rojo + confirmación reforzada)
- [x] `ui/toast` superior: temporizador con barra, pausa al pasar el cursor, "x", botón Deshacer, cola, `aria-live`
- [x] Deshacer: la acción se escribe de inmediato; `audit_log` guarda el estado previo y `undo_action` lo restaura. Los borrados son soft delete (ya en F1)
- [x] Acciones permanentes conectadas: aprobar, rechazar (eliminar y marcar publicado no tienen aún entrada en la interfaz; se conectan en F4/F6, reusando esta misma infraestructura)

**Aceptación:** ninguna acción permanente sin diálogo; el deshacer funciona dentro de la ventana configurada.

### F4 — Flujo de posts (5 d) — completado

- [x] Formulario funcional: listing, varias plataformas (una fila por plataforma), tipo por plataforma, template, idioma, texto con contador de límite, media a Storage (formato y ratio validados), `scheduled_at` con zona horaria
- [x] Guardar borrador y **Solicitar aprobación**
- [x] Editar y reenviar posts rechazados
- [x] Vistas Home y Listings por rol (Listings muestra los posts asociados a cada propiedad), siempre con fecha a publicar
- [x] Cola de aprobación del admin con motivo de rechazo y notificación al autor
- [x] Modo manual asistido: paquete de descarga (texto + checklist + enlaces a los archivos) y "Marcar como publicado" con URL

**Aceptación:** el empleado crea y solicita; el admin aprueba o rechaza; el estado y la fecha se reflejan en Home y Listings según el rol.

### F5 — Templates por red social y tipo de multimedia (5 d) — completado

- [x] Estructurar `PLATFORMS.postTypes[].ratio` (hoy texto libre) en `aspect_ratios`, `max_chars`, `max_media` (y `max_duration_seconds`, columna que ya existía en F1)
- [x] Modelo `template × plataforma × tipo` (`template_variants`) con `slots` (título, precio, imagen, logo)
- [x] Renderer único que reutiliza los 8 layouts con `aspect-ratio` y container queries. Ratios: 1:1, 4:5, 16:9, 9:16, 3:4, 2.35:1
- [x] Validaciones por plataforma (p. ej. X: 280 caracteres, máx. de imágenes, duración de video)
- [x] Vista previa en vivo en el formulario; selector de template filtrado por plataforma y tipo
- [x] Export a PNG (`html-to-image`) como output del post

**Aceptación:** cada combinación plataforma/tipo ofrece solo templates compatibles y genera una salida con las dimensiones correctas.

### F6 — Home: calendario y filtros (4 d) — completado

- [x] Calendario extendido (mes, semana, agenda) por `scheduled_at`; clic en un día filtra el feed
- [x] Filtros combinables: plataforma, rango de fechas y estado
- [x] Filtro pendientes / aprobados **solo para admin**, reforzado por RLS
- [x] Estado de filtros en la URL; estadísticas reales en lugar de las simuladas

**Aceptación:** admin filtra por estado; el empleado no ve el control ni datos ajenos.

### F7 — Responsive (3 d) — completado

- [x] **Móvil (<640 px):** navegación inferior o drawer, feed en una columna, calendario en agenda, formularios y modales a pantalla completa
- [x] **Tablet (640–1023 px):** sidebar en rail de 60 px, grid de 2 columnas, calendario semanal
- [x] **PC (≥1024 px):** sidebar expandible, grid de 3–4 columnas, calendario mensual junto al rail
- [x] `100dvh`, tablas convertidas en tarjetas en móvil, áreas táctiles ≥44 px

**Aceptación:** los tres layouts verificados en Playwright y sin desbordes horizontales.

### F8 — QA y despliegue (2 d) — completado

- [x] Unit: transiciones de estado, permisos, fechas y zona horaria
- [x] RLS: batería de pruebas por rol
- [x] E2E por rol: empleado crea y solicita; admin aprueba, deshace y filtra
- [x] Accesibilidad (axe) y rendimiento
- [x] CI, despliegue del estático (Vercel/Netlify/Cloudflare Pages) + Supabase, backups y README

**Aceptación:** CI verde y checklist de release completado.

### Cronograma

Dependencias: F0 → F1 → F2 → F4 → F6. F3 en paralelo tras F0. F5 tras F1. F7 transversal.

Total del alcance actual: **29–33 días** (un desarrollador, incluye colchón). F9 se cuenta aparte.

---

## 9. F9 — Publicación automática (planificada, no implementada)

### Preparación ya incluida (F1)

Enum `posts.status` ampliado (`publishing`, `failed`), tablas `social_accounts`, `publish_jobs` y `publish_attempts` vacías, `platforms.publish_mode` (`manual|api`) y `organization_settings.timezone`.

### Arquitectura objetivo

- **Disparo:** al aprobar se crea el job. `pg_cron` (cada minuto) → `pg_net` → Edge Function `publish-worker`, que toma lotes con `FOR UPDATE SKIP LOCKED`.
- **Ventana de deshacer:** el worker ignora jobs cuyo `approved_at` sea más reciente que la ventana de deshacer. Así deshacer una aprobación cancela el job sin carreras.
- **Adapters:** `PublisherAdapter { validate, publish, checkStatus, refreshToken }` con registro por plataforma.
- **Fiabilidad:** reintentos con backoff exponencial (máx. 5), errores reintentables vs. fatales, clave de idempotencia, respeto de cupos por plataforma.
- **Fallos:** el post pasa a `failed`, se notifica al autor y al admin en su idioma y se registra en `audit_log`.
- **Fallback manual asistido:** vía para plataformas sin API oficial.
- **Seguridad:** tokens solo en Supabase Vault y accesibles solo desde Edge Functions; callbacks OAuth por Edge Function; `social_accounts` solo admin.
- **Media:** URLs firmadas de Storage con TTL corto (Meta descarga desde URL pública).

### Viabilidad por plataforma (verificada en septiembre 2026; revalidar antes de implementar)

| Plataforma                | Vía                                       | Condiciones relevantes                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Facebook / Instagram      | Graph API oficial                         | Instagram solo con cuentas profesionales. Publicación en varios pasos (contenedor → publicar). Instagram no programa de forma nativa (scheduler propio); las Páginas de Facebook sí. Límite de 50 publicaciones por API en 24 h. App Review solo si los usuarios no tienen rol en la app. |
| TikTok                    | Content Posting API oficial               | Sin auditoría, todo se publica en modo privado; la auditoría puede tardar semanas. Los tokens caducan cada 24 h. Soporta video y fotos.                                                                                                                                                   |
| X                         | API oficial de pago por uso               | Aprox. 0,015 US$ por post y 0,20 US$ si incluye enlace. Requiere cuenta de desarrollador y créditos.                                                                                                                                                                                      |
| 小红书                    | Sin API oficial de publicación encontrada | Solo herramientas no oficiales (cookies/navegador), con riesgo de restricción de cuenta. Modo manual asistido.                                                                                                                                                                            |
| 微信视频号                | Sin API oficial de publicación encontrada | Solo automatización de navegador. Modo manual asistido.                                                                                                                                                                                                                                   |
| 微信公众号, 抖音, YouTube | No verificado                             | Se valida en F9a.                                                                                                                                                                                                                                                                         |

### Subfases

| Subfase                        | Contenido                                                                                                     | Est.         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------ |
| 9a Descubrimiento              | Validar plataformas pendientes; crear cuentas de desarrollador; iniciar App Review / auditoría (ruta crítica) | 2 d          |
| 9b Infraestructura             | Worker, cron, Vault, esqueleto OAuth, notificaciones                                                          | 4–5 d        |
| 9c Meta (Facebook + Instagram) | Adapters, scheduler propio para Instagram                                                                     | 4 d          |
| 9d X                           | Adapter, control de costos por enlace                                                                         | 2 d          |
| 9e TikTok                      | Adapter, refresco de tokens, auditoría                                                                        | 4 d + espera |
| 9f Resto                       | Según el descubrimiento                                                                                       | por definir  |

Total F9: **15–20 días + esperas externas** (aprobaciones y auditorías).

**Límite técnico:** los videos grandes pueden exceder los límites de tiempo y memoria de las Edge Functions. Si ocurre, la subida pasa a un servicio externo.

---

## 10. Riesgos

| Riesgo                                              | Mitigación                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Errores de RLS exponen posts ajenos                 | Batería de tests de RLS obligatoria en F1 y CI                   |
| App Review / auditoría de plataformas tarda semanas | Iniciar en 9a, antes de escribir adapters                        |
| Plataformas sin API oficial                         | Modo manual asistido desde F4                                    |
| Costo de QA en 4 idiomas                            | i18n en JSON, pruebas de longitud de texto y revisión por idioma |
| Templates: exceso de variantes                      | Un renderer único y variantes definidas por datos                |
| Imágenes faltantes (`images/`)                      | Solicitar los assets o usar placeholders en el seed              |
| Límites de Edge Functions con video                 | Servicio externo de subida si se supera el límite                |

## 11. Fuera de alcance (por ahora)

- Publicación automática real en las redes (solo planificada en F9).
- Métricas reales de alcance y engagement.
- SSO corporativo.
