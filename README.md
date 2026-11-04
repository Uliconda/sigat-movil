# SIGAT RN

La aplicación móvil comparte Supabase Auth y la base PostgreSQL con SIGAT Web.
Firebase ya no se usa como base activa en esta app.

## Configuración local

`.env` debe contener la URL del mismo proyecto Supabase y la clave publicable:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

No uses la clave `service_role` o una clave `secret` en la app móvil. Las
variables `EXPO_PUBLIC_*` se incluyen en el cliente y solo deben tener la clave
publishable. `.env` está excluido de Git.

## Preparar el proyecto Supabase

Ejecuta en SQL Editor el contenido completo y actualizado de
[`../sigat-web/supabase/migrations/20261020000000_initial_schema.sql`](../sigat-web/supabase/migrations/20261020000000_initial_schema.sql).
El SQL permite a usuarios autenticados consultar el inventario y registrar
préstamos/devoluciones, mientras limita las operaciones administrativas a los
roles autorizados. La versión actual también incluye funciones para sincronizar
cambios offline con control de conflictos; aplícala antes de usar esta versión
de la app.

## Ejecutar

```bash
npm install
npx expo start -c
```

Inicia sesión con el correo y la contraseña vigentes de Supabase Auth. Si la
cuenta tiene una contraseña temporal, la app pedirá cambiarla antes de cargar
el inventario. El inventario se actualiza al entrar a la pantalla y también
escucha cambios de Supabase Realtime.

## Pruebas

```bash
npm test
```

Las pruebas cubren la cola de cambios sin conexión (altas, préstamos,
sincronización, conflictos y su resolución) contra un Supabase simulado en
memoria (`test/fakeSupabase.js`), además de las reglas de estados, roles y
carpetas.

## Estructura

```
App.js              Arranque: sesión, perfil y navegación
src/
  screens/          Una pantalla por archivo (Inventario, Detalle, Escáner, ...)
  components/       Piezas reutilizables (ProductForm, FormModal, EquipoCard, ...)
  navigation/       Menú lateral y pila de pantallas
  services/         Supabase y modo sin conexión (offlineQueue.js es lógica pura)
  constants/        Estados, condiciones, roles y categorías
  utils/            Conteo y árbol de carpetas, búsqueda
  hooks/            useCategoryTree
  theme/            Colores claro/oscuro, useTheme() y estilos compartidos
  context/          AuthContext (usuario y perfil)
__tests__/          Pruebas con Jest (jest-expo)
```

## Uso sin conexión

Inicia sesión y deja que el inventario cargue al menos una vez mientras hay
conexión. Después, la app conserva el inventario y el perfil de esa cuenta en
el almacenamiento local del teléfono. Préstamos, devoluciones, altas, cambios y
bajas se guardan localmente y se envían en cuanto Supabase vuelve a estar
accesible; no basta con que el teléfono tenga internet si el servidor de base de
datos sigue apagado.

La franja superior indica si hay cambios pendientes o conflictos. Si otro
dispositivo modifica el mismo equipo antes de sincronizar, la app conserva el
cambio local y pide elegir entre aplicar los cambios locales o conservar los de
Supabase. Los datos offline permanecen en el almacenamiento privado de la app;
cerrar sesión no permite iniciar sesión de nuevo sin conexión.
