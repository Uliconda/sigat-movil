# SIGAT Móvil — Documentación de cambios desde la migración a Supabase

Periodo documentado: **3 al 10 de noviembre de 2026** (commits `b3ae817` → `0f9b2a3`,
pull requests #1 a #3). Versión de la app: `2.0.0` (etiqueta `v2.0.0`).

La base de datos, las Edge Functions y las tareas programadas son compartidas
con el panel web y están documentadas en `sigat-web/docs/MIGRACION-SUPABASE.md`.
Aquí se describe lo propio de la app.

## Índice

1. [Resumen](#1-resumen)
2. [Antes y después](#2-antes-y-después)
3. [Línea de tiempo](#3-línea-de-tiempo)
4. [Arquitectura actual](#4-arquitectura-actual)
5. [Modo sin conexión](#5-modo-sin-conexión)
6. [Funciones nuevas y cambios visibles](#6-funciones-nuevas-y-cambios-visibles)
7. [Errores corregidos](#7-errores-corregidos)
8. [Seguridad y permisos](#8-seguridad-y-permisos)
9. [Calidad: pruebas y CI](#9-calidad-pruebas-y-ci)
10. [Configuración y compilación](#10-configuración-y-compilación)
11. [Pendientes y observaciones](#11-pendientes-y-observaciones)

---

## 1. Resumen

La app dejó Firebase y ahora usa **Supabase** (Auth, PostgreSQL y Realtime), la
misma base que SIGAT Web. En el mismo esfuerzo:

- Se agregó un **modo sin conexión** con cola local, sincronización y detección
  de conflictos.
- `App.js` (2,785 líneas) se dividió en pantallas, componentes, servicios y hooks.
- Todo el proyecto pasó a **TypeScript estricto**.
- Se actualizó a **Expo SDK 58** (React Native 0.88, React 19.3).
- Se agregó el módulo de **Personal administrativo**.
- Se dejó lista la configuración para publicar (`mx.cesba.sigat`, perfiles de EAS).
- Hay **86 pruebas automatizadas** y verificación continua en GitHub Actions.

## 2. Antes y después

| Tema | Antes (1.8.0, Firebase) | Ahora (2.0.0, Supabase) |
|---|---|---|
| Backend | Firebase Auth + Firestore | Supabase Auth + PostgreSQL + Realtime |
| Sin conexión | Inventario y escáner fallaban | Caché local y cola de cambios con detección de conflictos |
| Código | `App.js` de 2,785 líneas | `App.tsx` solo maneja sesión y perfil; el resto vive en `src/` |
| Lenguaje | JavaScript | TypeScript con `strict`, `noUnusedLocals` y `noUnusedParameters` |
| Tema | 7 copias del tema claro/oscuro | Un solo `useTheme()` |
| IDs de equipo | Calculados en el teléfono | Reservados por el servidor (`next_equipo_id`) |
| Carpetas vacías | Equipos falsos "Plantilla Sistema" | Tabla `carpetas` y funciones del servidor |
| Escanear un QR | Descargaba todo el inventario | Consulta un solo equipo |
| Tiempo real | Recarga completa | Solo se actualiza el registro que cambió |
| Permisos del teléfono | Cámara, micrófono, almacenamiento, audio en segundo plano | Solo cámara |
| Pruebas | Ninguna | 86 pruebas con Jest + CI |

## 3. Línea de tiempo

### 3 nov — Migración y versión 2.0.0 (directo a `main`)

| Commit | Cambio |
|---|---|
| `b3ae817` | Elimina código de la plantilla de Expo que la app nunca usó. |
| `51eee51` | Variables de entorno de Supabase (`.env` fuera de Git) y perfil `preview` de EAS. |
| `20d95a5` | **Migra a Supabase**, agrega la cola sin conexión, actualiza a Expo SDK 58 y reorganiza la app en módulos. |
| `7d3dda0` | 58 pruebas con Jest: cola sin conexión, integración contra un Supabase simulado y reglas de negocio. |
| `f8ab449` | Configuración para publicar: `mx.cesba.sigat`, solo permiso de cámara, perfil `production`. |
| `0c50575` | Usa la tabla `carpetas` en lugar de equipos plantilla; hook `useInventario`. |
| `3225705` | Migra toda la app a TypeScript estricto; rutas de navegación tipadas. |
| `e9670f7` | `check-env.js` antes de cada compilación de EAS y pantalla "Configuración incompleta". |
| `5e274e5` | Búsqueda mejorada, deslizar para actualizar y estados vacíos. |
| `18d0aa6` | "Acerca de" presenta el sistema en uso con cifras reales del inventario. |
| `d0194cf` | CI con GitHub Actions. |
| `5404093` | **Versión 2.0.0**: `CHANGELOG.md` y `README.md`. |

### 3–6 nov — PR #1 `mejoras-app`

| Commit | Cambio |
|---|---|
| `f75aa2a` | Botón para mostrar u ocultar la contraseña (`PasswordInput`). |
| `baad86a` | El aviso de sincronización pasa a ser una píldora flotante que respeta el área segura. |
| `a4ae246` | Contraseña inicial mínima de 6 caracteres, igual que la web. |

### 6–9 nov — PR #2 y #3 `personal-administrativo`

| Commit | Cambio |
|---|---|
| `8ef206c` | La píldora de sincronización se puede minimizar a la orilla de la pantalla. |
| `4c5f9d1` | Módulo de Personal administrativo. |
| `ea1cf31` | Personal agrupado por departamento, eliminar personal y captura de fechas más fácil. |

### 9–10 nov — rama `personal-administrativo` (sin fusionar)

| Commit | Cambio |
|---|---|
| `8736397` | Elimina `.env.example`. |
| `0f9b2a3` | Lo recupera: el README indica copiarlo para crear `.env`. |

## 4. Arquitectura actual

```
index.ts            Punto de entrada
App.tsx             Sesión, perfil y navegación
src/
  screens/          Login, InitialPassword, Inventory, Detail, AddProduct, EditProduct,
                    Scanner, PersonalList, PersonalDetail, PersonalForm, About, ConfigError
  components/       ProductForm, FormModal, EquipoCard, FolderCard, LevelHeader, EmptyState,
                    OfflineSyncBanner, PasswordInput, PersonalPickerModal, DrawerContent,
                    ThemedInput, ThemedPicker
  navigation/       AppNavigator (menú lateral), MainStack, PersonalStack
  services/         supabaseClient, supabaseConfig, supabaseData, personalData, offlineQueue
  hooks/            useInventario, useCategoryTree, usePersonal
  constants/        estados, roles, categorias
  utils/            carpetas, personal
  theme/            colors, styles, useTheme
  context/          AuthContext
  types.ts          Equipo, Carpeta, Perfil, cola sin conexión, rutas
__tests__/          Pruebas con Jest
test/               fakeSupabase.ts (Supabase simulado en memoria)
scripts/            check-env.js
```

**Navegación.** Menú lateral con *Inicio* (`MainStack`: inventario, detalle,
agregar, editar, escáner), *Personal administrativo* (`PersonalStack`: lista,
ficha, formulario), *Acerca de* y *Cerrar sesión*. Las pantallas usan
`NativeStackScreenProps`, así que navegar con un nombre o parámetros
incorrectos es un error de compilación.

**Datos.** Las pantallas consumen hooks (`useInventario`, `usePersonal`,
`useCategoryTree`), que hablan con `supabaseData.ts` y `personalData.ts`. La
lógica de la cola (`offlineQueue.ts`) y del árbol de carpetas
(`utils/carpetas.ts`) es pura: no depende de React ni de la red.

**Formularios.** Agregar y Editar comparten `ProductForm`; los modales usan
`FormModal`.

## 5. Modo sin conexión

1. Cada cambio (alta, edición, baja, préstamo, devolución) entra primero a una
   **cola local** en AsyncStorage, junto con la versión del equipo sobre la que
   se hizo. La pantalla se actualiza al instante.
2. Al recuperar la conexión, la cola se envía a
   `update_equipo_if_unchanged` / `delete_equipo_if_unchanged`.
3. El servidor compara la versión **dentro de una transacción**:
   - Si nadie más cambió el equipo, aplica el cambio y registra el historial.
   - Si otro dispositivo lo cambió antes, devuelve conflicto y el usuario elige
     entre aplicar sus cambios o conservar los del servidor.

La cola es una unión discriminada con cuatro tipos de operación: `create`,
`update`, `delete` e `history`.

Detalles:

- El inventario debe cargarse al menos una vez con conexión. Después se
  conservan inventario, carpetas y perfil en el almacenamiento privado del teléfono.
- Los IDs creados sin conexión se marcan como **provisionales** hasta que el
  servidor reserva el `EQ-XXX` definitivo.
- Las carpetas se leen de la caché y se combinan con las que usan los equipos
  pendientes de sincronizar.
- **Administrar carpetas requiere conexión**, porque modifica muchos equipos a
  la vez en el servidor.
- Sin red, el inventario y el escáner usan la caché en lugar de fallar
  (`OfflineError`).

**Píldora de sincronización** (`OfflineSyncBanner`): flotante, abajo y centrada
sobre el botón "+", respeta el área segura. Cambia de icono y color según el
estado (sincronizando, sin conexión, detenida, con conflictos). Se puede
minimizar a la orilla de la pantalla y se expande al tocarla o cuando aparece
un conflicto nuevo.

## 6. Funciones nuevas y cambios visibles

**Inventario**

- Búsqueda por nombre, ID, marca, número de serie o persona; ignora acentos y
  acepta varias palabras.
- Deslizar hacia abajo sincroniza los pendientes y vuelve a descargar.
- Indicador de primera carga y mensajes para carpetas vacías o búsquedas sin
  resultados (`EmptyState`).
- Crear, renombrar y eliminar carpetas se hace en el servidor en una sola
  transacción.

**Préstamos y escáner**

- La matrícula acepta letras.
- El sonido del escáner va incluido en la app: funciona sin red y en iOS.
- La pantalla de permiso de cámara respeta el tema.

**Personal administrativo** (nuevo)

- Lista agrupada por departamento (alfabético, "Sin departamento" al final),
  con búsqueda por nombre.
- Alta y edición con departamento (las subcategorías de ADMINISTRATIVOS),
  fechas de ingreso y término, y conducta en el uso del equipo.
- Las fechas se escriben solo con números; las diagonales se agregan solas.
- Ficha con el equipo asignado actualmente y el historial de equipos anteriores.
- En los equipos de ADMINISTRATIVOS, **Asignar** elige a una persona registrada;
  al devolver o dar de baja se limpia `personal_id`.
- Mantener presionada a una persona permite eliminarla junto con su historial;
  no se permite si tiene equipo asignado.

**Sesión**

- Botón de ojo para mostrar u ocultar la contraseña en el inicio de sesión y en
  "Cambia tu contraseña", accesible con lector de pantalla.
- Si la cuenta tiene contraseña temporal, la app pide cambiarla (mínimo 6
  caracteres).

**Acerca de** — describe el sistema en uso y muestra equipos, categorías y
préstamos activos calculados con los datos del teléfono. La versión se lee de
`app.json`.

## 7. Errores corregidos

| Problema | Commit |
|---|---|
| Sin conexión, el inventario y el escáner fallaban | `20d95a5` |
| El superadministrador no podía agregar equipos ni administrar carpetas | `20d95a5` |
| Los estados se guardaban con un formato distinto al de la web | `20d95a5` |
| En Editar no se podía crear categoría y subcategoría nuevas a la vez | `20d95a5` |
| El sonido del escáner no funcionaba en iOS ni sin conexión | `20d95a5` |
| La pantalla de permiso de cámara era ilegible en modo claro | `20d95a5` |
| "Acerca de" mostraba una versión desactualizada | `20d95a5` |
| `StatusBar` usaba `backgroundColor`, que React Native 0.88 ignora | `3225705` |
| La APK de preview se cerraba al abrir (variables de EAS con valores de ejemplo) | `e9670f7` |
| La matrícula del préstamo no aceptaba letras | `5e274e5` |
| El aviso de sincronización quedaba debajo del notch y de la barra de notificaciones | `baad86a` |

## 8. Seguridad y permisos

| Rol | Puede |
|---|---|
| `usuario` | Consultar el inventario, prestar y recibir equipos |
| `admin` | Además: dar de alta, editar, dar de baja, organizar carpetas y administrar personal |
| `superadmin` | Además: eliminar equipos de forma permanente |

- Las reglas se validan en el servidor (RLS y funciones de PostgreSQL); la app
  solo oculta lo que el rol no puede hacer (`constants/roles.ts`).
- El historial registra el autor real de cada movimiento.
- Las claves se configuran por entorno; `.env` no se sube al repositorio y solo
  se usa la clave *publishable*.
- La app solo pide permiso de cámara. Micrófono y almacenamiento están
  bloqueados en `app.json`, y el audio en segundo plano está desactivado.
- iOS declara que no usa cifrado propio (`usesNonExemptEncryption: false`).

## 9. Calidad: pruebas y CI

| Comando | Qué verifica | Resultado al 14 nov 2026 |
|---|---|---|
| `npm test` | 6 suites de Jest | 86 correctas |
| `npm run typecheck` | TypeScript estricto | Sin errores |
| `npm run lint` | ESLint (`eslint-config-expo`) | Sin errores |

Suites: `offlineQueue`, `supabaseData` (integración contra `test/fakeSupabase.ts`:
préstamo sin conexión → sincronización → historial, conflictos y sus dos
resoluciones, altas sin conexión, eventos en tiempo real y reserva de IDs),
`carpetas`, `personal`, `reglasNegocio` y `supabaseConfig`.

GitHub Actions ejecuta tipos, lint y pruebas en cada push a `main` y en cada
pull request.

## 10. Configuración y compilación

`.env` (copiar de `.env.example`):

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Como `.env` no se sube a EAS, las variables se registran en cada entorno:

```bash
eas env:push --environment preview --path .env --force
eas env:push --environment production --path .env --force
```

| Perfil de EAS | Resultado |
|---|---|
| `development` | Cliente de desarrollo, distribución interna |
| `preview` | APK para instalar directo |
| `production` | AAB para Google Play / build para App Store, con número de compilación automático |

Protecciones contra una mala configuración:

- `scripts/check-env.js` corre antes de cada compilación de EAS y la detiene si
  faltan las variables, tienen valores de ejemplo o se usó una clave secreta.
- Si aun así se instala una versión sin configuración, la app muestra
  "Configuración incompleta" en lugar de cerrarse.

Identificador: `mx.cesba.sigat` (Android e iOS). Nombre visible: "SIGAT".

## 11. Pendientes y observaciones

- **`main` va dos commits atrás** de `personal-administrativo` (`8736397` y
  `0f9b2a3`). Como uno borra `.env.example` y el otro lo recupera, el contenido
  es el mismo; solo falta fusionar o cerrar la rama.
- **`CHANGELOG.md` termina en 2.0.0.** Lo hecho después (botón de contraseña,
  píldora de sincronización, mínimo de 6 caracteres, Personal administrativo)
  no tiene entrada ni versión nueva.
- **El `README.md` dice 74 pruebas**; hoy son 86.
- **Capturas de pantalla**: la tabla del README sigue comentada, a la espera de
  imágenes en `docs/capturas/`.
- **Finales de línea**: en la copia local los 67 archivos aparecen como
  modificados porque están en CRLF y el repositorio los guarda en LF; el
  contenido es idéntico.
