# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/);
las versiones siguen [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

Requiere aplicar en Supabase las migraciones `20261119000000_edificios.sql` y
`20261119120000_areas.sql` (en `sigat-web`), en ese orden.

### Agregado

- **Pestañas abajo:** Inicio · Edificios · Categorías · Personal. "Acerca de" y
  "Cerrar sesión" quedan en el menú lateral.
- **Inicio:** buscador, botón grande para escanear, "Ver todos los equipos" y
  conteos rápidos calculados en el teléfono (sin generar archivos): equipos por
  estado, préstamos vencidos (+48 h, misma regla que el servidor) y equipos por
  edificio. Cada conteo abre la lista filtrada. Los administradores tienen el
  botón "Ver reportes en SIGAT Web", que abre los PDF en el navegador.
- **Edificios:** cada edificio muestra solo las categorías con equipos ahí, y
  cada categoría abre directamente la lista con chips para subcategoría,
  espacio y estado.
- **Ubicación de cada equipo** (edificio y espacio) en Agregar/Editar, en la
  tarjeta y en el detalle. El edificio se elige del catálogo de SIGAT Web; el
  espacio puede ser uno nuevo (también sin conexión).
- **Categorías:** filtro por edificio sobre las carpetas de siempre.
- **Departamento / área** dentro de cada espacio (Edificio › Espacio › Área).
  Dentro de un edificio se ven sus espacios; cada espacio abre su lista con
  chips de departamento / área, y el botón + agrega el equipo con edificio,
  espacio y área ya definidos. En Agregar/Editar se elige del catálogo o se
  escribe uno nuevo.

### Cambiado

- El inventario se carga una sola vez y se comparte entre pestañas (un solo
  canal en tiempo real).
- Nueva dependencia: `@react-navigation/bottom-tabs`.

## [2.0.0] - 2026-11-03

Versión mayor: nueva plataforma de datos, arquitectura modular y TypeScript.

### Agregado

- **Modo sin conexión.** Préstamos, devoluciones, altas, ediciones y bajas se
  guardan en el teléfono y se sincronizan al recuperar la conexión, con
  detección de conflictos si otro dispositivo cambió el mismo equipo y dos
  formas de resolverlos.
- **Tiempo real.** Los cambios hechos en SIGAT Web u otros teléfonos aparecen
  sin recargar; solo se actualiza el equipo que cambió.
- **Carpetas en el servidor** (tabla `carpetas`): crear, renombrar y eliminar
  carpetas actualiza todos sus equipos en una sola transacción.
- **IDs sin duplicados:** el siguiente `EQ-XXX` lo reserva el servidor. Sin
  conexión se marca como provisional.
- **Búsqueda** por nombre, ID, marca, número de serie o persona, sin distinguir
  acentos y con varias palabras.
- **Deslizar para actualizar**, indicador de carga y mensajes para carpetas
  vacías o búsquedas sin resultados.
- Pantalla "Configuración incompleta" en lugar de cerrarse si la compilación no
  trae los datos de Supabase, y verificación previa en cada compilación de EAS.
- "Acerca de" muestra cifras reales del inventario.
- 74 pruebas automatizadas (Jest) y verificación continua en GitHub Actions.

### Cambiado

- **Firebase → Supabase** (Auth, PostgreSQL y Realtime), compartido con SIGAT Web.
- **Expo SDK 58** (React Native 0.88, React 19.3).
- **TypeScript en modo estricto** en todo el proyecto.
- `App.js` de 2,785 líneas dividido en pantallas, componentes, servicios y hooks.
- Un solo tema claro/oscuro en lugar de siete copias distintas.
- Los estados se guardan con el mismo formato que SIGAT Web.
- Escanear consulta un solo equipo en lugar de descargar todo el inventario.
- Identificador de la app `mx.cesba.sigat`; nombre visible "SIGAT".
- Solo se pide permiso de cámara (se quitaron micrófono, almacenamiento y audio
  en segundo plano).

### Corregido

- Sin conexión, el inventario y el escáner fallaban en lugar de usar los datos
  guardados.
- El superadministrador no podía agregar equipos ni administrar carpetas.
- En Editar no se podía crear una categoría y una subcategoría nuevas a la vez.
- El sonido del escáner no funcionaba en iOS ni sin conexión.
- La pantalla de permiso de cámara era ilegible en modo claro.
- "Acerca de" mostraba una versión desactualizada.
- La matrícula del préstamo no aceptaba letras.

### Seguridad

- Las reglas de permisos se validan en el servidor (RLS y funciones de
  PostgreSQL), no solo ocultando botones.
- Eliminar equipos queda solo para el superadministrador.
- El historial registra el autor real de cada movimiento; no se puede
  registrar a nombre de otra persona.
- Las claves se configuran por entorno; `.env` no se sube al repositorio.

## [1.8.0] y anteriores

Versiones con Firebase: inventario por categorías, préstamos y devoluciones con
código QR, estado físico al devolver y subcategorías de tres niveles.

[2.0.0]: https://github.com/Uliconda/sigat-movil/compare/6903322...v2.0.0
