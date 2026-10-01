# Roles, permisos y cuentas demo

PropPulse tiene dos roles. **La interfaz lo hace explícito** (insignia "Sesión iniciada como…" en cada encabezado, etiqueta "Admin" en el menú, y una nota en cada pantalla), pero **la seguridad real la imponen RLS y las RPC** en la base de datos: ocultar un botón nunca es la única barrera.

| Rol (UI)      | Valor en BD | Resumen                                                                                                                                      |
| ------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrador | `admin`     | Ve a todo el equipo, aprueba/rechaza, edita cualquier post y propiedad, gestiona equipo y ajustes. Con MFA (TOTP) obligatorio en producción. |
| Agente        | `employee`  | Crea posts y los envía a aprobación; solo ve los suyos. Solo lectura sobre propiedades y plantillas.                                         |

## Qué puede hacer cada rol, por pantalla

| Pantalla                     | Administrador                                                                                                                     | Agente                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Home** (compartida)        | Ve los posts de todo el equipo, filtra por estado (pendiente/aprobado), edita cualquier post, marca como publicado los aprobados. | Solo ve sus posts. Crea posts, edita sus borradores o rechazados, los envía a aprobación y los retira mientras estén pendientes. |
| **Propiedades** (compartida) | Ve y edita propiedades; crea posts desde ellas.                                                                                   | Solo lectura; crea posts desde ellas.                                                                                            |
| **Plantillas** (compartida)  | Ve y usa plantillas; gestiona el catálogo (subir plantilla).                                                                      | Ve y usa plantillas para sus posts; no modifica el catálogo.                                                                     |
| **Aprobaciones**             | **Solo administradores.** Aprueba o rechaza posts del equipo y deshace la última decisión.                                        | Sin acceso (el router lo bloquea y el menú no lo muestra).                                                                       |
| **Ajustes**                  | **Solo administradores.** Equipo e invitaciones, cuentas de plataformas, tipos de post, notificaciones.                           | Sin acceso.                                                                                                                      |

Dónde está cada regla: `src/features/auth/roles.ts` (páginas), `src/features/posts/post-row.ts` (acciones sobre posts), `supabase/migrations/*_rls.sql` (RLS: `posts_select/insert/update`, políticas de catálogo solo-admin) y `src/features/auth/role-ui.ts` (los textos que se muestran en pantalla; `PAGE_NOTES` es la única tabla a editar si cambia un permiso).

## Cuentas por defecto de los despliegues demo

Solo existen con `VITE_DATA_SOURCE=memory` (el valor por defecto). **No existen en producción**: con `supabase` el login no las muestra y `seed.demo.sql` no se aplica.

| Usuario    | Nombre | Rol           | Contraseña          |
| ---------- | ------ | ------------- | ------------------- |
| `zhuyan`   | 朱晏   | Administrador | `demo-password-123` |
| `liming`   | 李明   | Agente        | `demo-password-123` |
| `wangfang` | 王芳   | Agente        | `demo-password-123` |

El login demo las lista con su rol y las rellena al pulsarlas; **Ajustes** (solo admin) las recuerda en una nota.

## Home móvil de agente

En pantallas <640px, un agente ve una Home distinta a la de tablet/PC (F10): un feed estilo app
(topbar, tarjetas por post, navegación inferior con Feed / Publicar / Propiedades), reproduciendo
el diseño de referencia del equipo en vez del calendario + feed habitual (F6/F7). El admin no se
ve afectado: en móvil sigue viendo el calendario de siempre, a cualquier ancho.

Es una capa visual, no un sistema paralelo: usa el mismo `getState()` (los mismos posts, que RLS
ya limita a los propios del agente), el mismo formulario real de creación de posts (el botón
"Publicar" lo abre tal cual), el mismo widget de notificaciones, el mismo cambio de idioma real,
y — cuando un post tiene plantilla — el mismo renderizador real de F5 (los 8 layouts reales, con
la imagen que subió el agente), no un diseño de ejemplo aparte. "Propiedades" navega a la página
real de Listings, con sus propios permisos de rol ya visibles ahí.

El botón "Publicar" abre una hoja inferior de 3 pasos — propiedad → plataformas → formato y
plantilla → confirmar — reproduciendo paso a paso el diseño de referencia del equipo (no el
formulario de escritorio). Cada paso usa datos reales: las propiedades y sus fotos, las 9
plataformas reales, y las plantillas realmente compatibles con las plataformas y el formato
elegidos (single/carousel/video), con su vista previa real (F5). Al confirmar, crea un post real
por plataforma — con las fotos de la propiedad subidas de verdad a través del mismo repositorio
que usa el formulario de escritorio — y los envía a aprobación. Única diferencia deliberada
frente a la referencia: el formato se elige antes que la plantilla (no después), porque en la
app real una plantilla solo es compatible con una combinación concreta de plataforma+tipo, y el
tipo depende del formato.

Implementación: `src/features/mobile-agent-feed/` (`index.ts`, `mobile-feed-cards.ts`,
`mobile-create-sheet.ts`) y `src/styles/features/mobile-agent-feed.css` (activado por
`body[data-role='employee']` + `@media (max-width:639px)`).

## Sesión persistente

Al iniciar sesión, cerrar la pestaña y volver a abrirla, la cuenta sigue abierta.

- **Modo demo:** `localStorage`, con caducidad a los **7 días** desde el inicio de sesión (`SESSION_TTL_MS` en `memory-auth.ts`). "Cerrar sesión" la borra al instante. Los cambios del directorio demo (invitaciones, contraseñas) también se conservan en el navegador.
- **Backend real:** el cliente de Supabase persiste la sesión (`persistSession: true`) y la renueva con el refresh token.
- **Inactividad:** el temporizador de 30 min sigue cerrando la sesión de una pestaña abierta e inactiva; cerrar la pestaña no la cierra.
- Un administrador con MFA obligatorio tendrá que volver a verificarlo si su sesión pierde el nivel AAL2.
