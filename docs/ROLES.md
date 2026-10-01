# Roles, permisos y cuentas demo

PropPulse tiene **tres** roles: Agente, Administrador y Técnico. Los dos primeros son los de
siempre (varias cuentas posibles, se gestionan desde Settings → Team). El Técnico (F11) es
distinto a propósito: una única cuenta, admin-equivalente en todo el sistema, cuya única
pantalla es un panel de operaciones — pensado para administrar la herramienta completa (todas
las cuentas, los ajustes de la organización, y el estado del sistema) sin tocar el código.

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

## Panel de operaciones (técnico)

La única pantalla del técnico (`/ops`, F11): entrar por cualquier otra ruta lo devuelve aquí, y
el sidebar no muestra ningún otro ítem del menú. Tres secciones, todas con datos y escritura
reales — nada de aquí es una maqueta:

- **Cuentas**: todas las cuentas del equipo (agentes, administradores y la propia cuenta
  técnica), en una sola tabla. Cambiar el rol o activar/desactivar reutiliza exactamente los
  mismos métodos del repositorio que ya usaba Settings → Team — no hay una vía paralela. La fila
  del propio técnico no tiene controles: es una cuenta única y no se toca desde aquí.
- **Ajustes de la organización**: zona horaria, ventana de deshacer, días de retención de posts
  eliminados, y si el MFA es obligatorio para los administradores. Antes de F11 no existía
  **ninguna** pantalla para editar esto — solo se podía leer.
- **Sistema**: origen de datos (`memory`/`supabase`), y recuentos reales de cuentas, propiedades,
  posts, plantillas y plataformas.

### Por qué es admin-equivalente, no una jerarquía aparte

`is_admin()` (la función de Postgres de la que dependen todas las políticas RLS, las RPC
protegidas y las Edge Functions) se amplió para devolver verdadero también para `technician`.
Esto se hizo en un único punto, así que se propaga solo a todo lo que ya dependía de esa función
— no hubo que tocar cada política una por una. Lo que sí es exclusivo del técnico:

- El panel de operaciones en sí (ninguna otra pantalla del sitio).
- Editar `organization_settings` (RLS ya lo permitía a cualquier admin-equivalente; simplemente
  no había ninguna pantalla que lo expusiera hasta ahora).

Lo que **nunca** se puede hacer, ni siquiera desde el panel: crear un segundo técnico, o cambiar
el rol de la cuenta técnica existente. Ambas cosas están bloqueadas en la base de datos (un
índice único parcial, y una comprobación explícita dentro de `set_user_role`), no solo ocultas
en la interfaz.

### Cómo se crea (nunca por seed)

La cuenta técnica **no** forma parte de `seed.sql` ni de `seed.demo.sql`: no existe en ningún
despliegue hasta que alguien la crea a propósito.

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run technician:create -- \
  --email tech@tuempresa.com --username root_tech --name "Nombre"
```

La contraseña **siempre** se genera al azar (24 caracteres) y se muestra una sola vez — no hay
forma de elegirla por línea de comandos ni por variable de entorno, a diferencia de
`admin:create`. Si ya existe un técnico, el script se niega (no admite `--force`): hay que
desactivar o borrar la cuenta anterior directamente en la base de datos primero. En el modo demo
(`memory`, este entorno) existe una cuenta de prueba (`root_tech`) sembrada solo en el
directorio en memoria del navegador — su contraseña está en `src/data/seed/users.ts`
(`TECHNICIAN_PASSWORD`), documentada ahí como exclusiva de desarrollo local, y a propósito
**no** aparece en el panel de cuentas demo de la pantalla de login (a diferencia de las cuentas
de agente/administrador, que si se muestran ahí).

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
