// Tipos del dominio SIGAT, compartidos por toda la app.
import type { NavigatorScreenParams } from "@react-navigation/native";

export type Rol = "usuario" | "admin" | "superadmin";

/** Perfil SIGAT de una cuenta (tabla profiles). */
export interface Perfil {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  must_change_password: boolean;
}

/** Campos de un equipo; se guardan en la columna jsonb `data` de la tabla equipos. */
export interface EquipoData {
  nombre?: string;
  marca?: string;
  no_serie?: string;
  descripcion?: string;
  categoria?: string;
  subcategoria?: string;
  subSubcategoria?: string;
  estado?: string;
  condicion_fisica?: string;
  usuarioActual?: string;
  alumno_nombre?: string;
  alumno_matricula?: string;
  poseedor_actual?: string;
  /** Persona de Personal administrativo que tiene el equipo (null = nadie). */
  personal_id?: string | null;
  fecha_prestamo?: string;
  fecha_registro?: string;
  personal_registro?: string;
  id_qr?: string;
  /** Equipos "Plantilla Sistema" de versiones anteriores; ya no se crean. */
  isTemplate?: boolean;
  [campo: string]: unknown;
}

export interface Equipo extends EquipoData {
  id: string;
}

/** Fila de la tabla equipos tal como llega de Supabase. */
export interface EquipoRow {
  id: string;
  data: EquipoData;
}

/** Carpeta del inventario: 1 = categoría, 2 = subcategoría, 3 = sección. */
export interface Carpeta {
  id: string;
  parent_id: string | null;
  nombre: string;
  nivel: 1 | 2 | 3;
}

/** Árbol de carpetas: Categoría > Subcategoría > [Secciones]. */
export type CategoryTree = Record<string, Record<string, string[]>>;

/** Movimiento del historial (préstamo, devolución, baja, ...). */
export interface HistorialEntry {
  id?: string;
  idEquipo?: string;
  nombreEquipo?: string;
  accion: string;
  fecha?: Date | string | null;
  admin?: string;
  observaciones?: string;
  [campo: string]: unknown;
}

// --- Personal administrativo ---

export type Conducta = "Excelente" | "Buena" | "Regular" | "Mala";

/** Persona a la que se le asigna equipo (tabla personal_administrativo). */
export interface Personal {
  id: string;
  nombre: string;
  departamento: string | null;
  /** Fechas en formato AAAA-MM-DD. */
  fecha_ingreso: string | null;
  fecha_termino: string | null;
  /** Conducta respecto al uso del equipo. */
  conducta: Conducta | null;
  conducta_notas: string | null;
}

export type PersonalInput = Omit<Personal, "id">;

/** Periodo en que una persona tuvo un equipo (tabla asignaciones_equipo). */
export interface Asignacion {
  id: string;
  personal_id: string;
  equipo_id: string;
  equipo_nombre: string | null;
  fecha_inicio: string;
  /** null = la persona aún tiene el equipo. */
  fecha_fin: string | null;
  asignado_por: string | null;
  recibido_por: string | null;
  condicion_devolucion: string | null;
  observaciones: string | null;
  origen: string;
}

// --- Cola de cambios sin conexión ---

interface QueueBase {
  id: string;
  createdAt: string;
  status: "pending" | "conflict";
  error?: string;
  serverData?: Equipo | null;
}

export interface CreateOperation extends QueueBase {
  type: "create";
  equipoId: string;
  data: EquipoData;
}

export interface UpdateOperation extends QueueBase {
  type: "update";
  equipoId: string;
  expectedData: Equipo;
  changes: Partial<EquipoData>;
  history: HistorialEntry | null;
}

export interface DeleteOperation extends QueueBase {
  type: "delete";
  equipoId: string;
  expectedData: Equipo;
}

export interface HistoryOperation extends QueueBase {
  type: "history";
  equipoId?: undefined;
  entry: HistorialEntry;
}

export type QueueOperation = CreateOperation | UpdateOperation | DeleteOperation | HistoryOperation;

/** Operación antes de entrar a la cola (sin id, fecha ni estado). */
export type NewQueueOperation =
  | Omit<CreateOperation, keyof QueueBase>
  | Omit<UpdateOperation, keyof QueueBase>
  | Omit<DeleteOperation, keyof QueueBase>
  | Omit<HistoryOperation, keyof QueueBase>;

/** Equipo/operación aplicable por applyQueue (también acepta operaciones sin metadatos). */
export type QueueLike =
  | Pick<CreateOperation, "type" | "equipoId" | "data">
  | Pick<UpdateOperation, "type" | "equipoId" | "changes">
  | Pick<DeleteOperation, "type" | "equipoId">
  | Pick<HistoryOperation, "type">;

export interface ConflictItem {
  id: string;
  equipoId?: string;
  type: QueueOperation["type"];
  error?: string;
}

export interface SyncStatus {
  online: boolean;
  pending: number;
  conflicts: number;
  conflictItems: ConflictItem[];
  error: string | null;
}

export type ConflictResolution = "keep-local" | "keep-server";

// --- Navegación ---

export type MainStackParamList = {
  InventoryList: undefined;
  Detalles: { item: Equipo };
  AddProduct: { scannedId?: string } | undefined;
  EditProduct: { item: Equipo };
  Scanner: { returnMode?: boolean; expectedId?: string; mode?: "add" } | undefined;
};

export type PersonalStackParamList = {
  PersonalList: undefined;
  PersonalDetalle: { personalId: string };
  PersonalForm: { personalId?: string } | undefined;
};

export type DrawerParamList = {
  Main: NavigatorScreenParams<MainStackParamList> | undefined;
  Personal: undefined;
  About: undefined;
};
