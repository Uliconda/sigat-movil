import { Ionicons } from "@expo/vector-icons";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer, useNavigation, useIsFocused } from "@react-navigation/native"; // <--- ✅ AQUÍ ES SU LUGAR CORRECTO
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import DropDownPicker from 'react-native-dropdown-picker';
import { useAudioPlayer } from 'expo-audio';
import { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Vibration,
  Image,
} from "react-native";
import "react-native-gesture-handler";

// --- IMPORTANTE: Tu configuración de Firebase ---
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

// --- COLORES DEL TEMA (SIGAT) ---
const PRIMARY_COLOR = "#FF6F00";
const BACKGROUND_COLOR = "#121212";
const CARD_COLOR = "#1E1E1E";
const TEXT_COLOR = "#E0E0E0";
const SUCCESS_COLOR = "#4CAF50";
const DANGER_COLOR = "#F44336";
const DISABLED_COLOR = "#555555";

// ==========================================
// CONTEXTO GLOBAL DE USUARIO
// ==========================================
const AuthContext = createContext({ user: null, userData: null });

// ==========================================
// 0. PANTALLA DE LOGIN
// ==========================================
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (email === "" || password === "") {
      Alert.alert("Error", "Por favor ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      Alert.alert("Error de acceso", "Correo o contraseña incorrectos.");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.loginContainer}>
          <StatusBar barStyle="light-content" backgroundColor={BACKGROUND_COLOR} />
          
          {/* ========================================== */}
          {/* AQUÍ ESTÁ TU NUEVO LOGO DEL BÚHO */}
          {/* ========================================== */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Image 
              source={require('./assets/assets_buho.png')} 
              style={{ width: 140, height: 140, resizeMode: 'contain' }} 
            />
          </View>
          
          <Text style={styles.loginTitle}>SIGAT</Text>
          <Text style={styles.loginSubtitle}>Sistema de Inventario</Text>

          <View style={styles.loginCard}>
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@ejemplo.com"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="********"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.bigOrangeButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.bigButtonText}>INICIAR SESIÓN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// 1. MENÚ LATERAL (DRAWER)
// ==========================================
function CustomDrawerContent(props) {
  const { userData } = useContext(AuthContext); // Extraemos datos del contexto

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", onPress: () => signOut(auth) },
    ]);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0 }}
      style={{ backgroundColor: BACKGROUND_COLOR }} // <-- AGREGAMOS ESTO
    >
      <View
        style={[
          styles.drawerHeader,
          {
            backgroundColor: CARD_COLOR,
            padding: 20,
            paddingTop: 40, // Agregamos un poco de espacio arriba
            paddingBottom: 30,
            borderBottomWidth: 1,
            borderBottomColor: "#333",
            alignItems: "center", // Centramos todo el contenido
          },
        ]}
      >
        {/* ========================================== */}
        {/* AQUÍ ESTÁ TU LOGO DEL BÚHO EN EL MENÚ */}
        {/* ========================================== */}
        <Image 
          source={require('./assets/assets_buho.png')} 
          style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: 15 }} 
        />

        <Text
          style={[
            styles.drawerName,
            { color: "white", fontSize: 18, fontWeight: "bold", textAlign: "center" },
          ]}
        >
          {userData?.nombre || "Cargando Usuario..."}
        </Text>
        <Text style={[styles.drawerEmail, { color: "#AAA", fontSize: 14, textAlign: "center", marginTop: 2 }]}>
          {userData?.email || ""}
        </Text>
        
        {/* Etiqueta de Admin visual */}
        {userData?.rol === "admin" && (
          <Text
            style={{
              color: "#FFD700",
              fontSize: 12,
              fontWeight: "bold",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            ⭐ ADMINISTRADOR
          </Text>
        )}
      </View>

      <View style={{ paddingTop: 10 }}>
        {/* Botón de Inicio */}
        <DrawerItem
          label="Inicio"
          labelStyle={{ color: TEXT_COLOR, fontSize: 16 }}
          icon={() => <Ionicons name="home" size={22} color={PRIMARY_COLOR} />}
          onPress={() =>
            props.navigation.navigate("Main", { screen: "InventoryList" })
          }
        />
        
        {/* NUEVO BOTÓN: ACERCA DE */}
        <DrawerItem
          label="Acerca de"
          labelStyle={{ color: TEXT_COLOR, fontSize: 16 }}
          icon={() => <Ionicons name="information-circle" size={22} color={PRIMARY_COLOR} />}
          onPress={() =>
            props.navigation.navigate("About") // Redirige a la pantalla About
          }
        />

        {/* Botón de Cerrar Sesión */}
        <DrawerItem
          label="Cerrar Sesión"
          labelStyle={{ color: DANGER_COLOR, fontSize: 16, fontWeight: "bold" }}
          icon={() => <Ionicons name="power" size={22} color={DANGER_COLOR} />}
          onPress={handleLogout}
        />
      </View>
    </DrawerContentScrollView>
  );
}

// ==========================================
// PANTALLA: ACERCA DEL DESARROLLADOR
// ==========================================
function AboutScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND_COLOR, padding: 20, justifyContent: 'center' }}>
      <View style={{ 
        backgroundColor: CARD_COLOR, 
        padding: 30, 
        borderRadius: 15, 
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8
      }}>
        {/* Logo de tu escuela */}
        <Image 
          source={require('./assets/assets_buho.png')} 
          style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 }} 
        />
        
        <Text style={{ color: PRIMARY_COLOR, fontSize: 26, fontWeight: 'bold', marginBottom: 5 }}>
          SIGAT Móvil
        </Text>
        <Text style={{ color: "#AAA", fontSize: 16, marginBottom: 25 }}>
          Sistema de Inventario
        </Text>

        {/* Datos del desarrollador */}
        <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 20 }}>
          <Text style={{ color: TEXT_COLOR, fontSize: 18, marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', color: PRIMARY_COLOR }}>Desarrollador: </Text> 
            Ulises González Hernández
          </Text>
          <Text style={{ color: TEXT_COLOR, fontSize: 18, marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', color: PRIMARY_COLOR }}>Grado: </Text> 
            8 Semestre de Ingeniería en Software
          </Text>
          <Text style={{ color: TEXT_COLOR, fontSize: 18, marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', color: PRIMARY_COLOR }}>Institución: </Text> 
            Centro de Estudios Superiores del Bajio.
          </Text>
        </View>

        <Text style={{ color: "#666", fontSize: 14, marginTop: 30 }}>
          Versión 1.0.0 © 2026
        </Text>
      </View>
    </View>
  );
}

// ==========================================
// 2. PANTALLA DE DETALLES (Actualizada con Marca y No. Serie)
// ==========================================
function DetailScreen({ route, navigation }) {
  const { userData } = useContext(AuthContext); 
  const { item: initialItem } = route.params;
  const [item, setItem] = useState(initialItem);
  
  // Estados para el Modal de Préstamo
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [matriculaAlumno, setMatriculaAlumno] = useState("");
  
  // Estados para el Modal de Motivos (Baja/Reactivar)
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [reasonActionType, setReasonActionType] = useState(""); // "BAJA" o "REACTIVAR"
  const [reasonText, setReasonText] = useState("");
  
  const [loading, setLoading] = useState(false);

  // Normalización de estados
  const estadoNormalizado = item.estado ? item.estado.toUpperCase() : "DESCONOCIDO";
  const isPrestado = estadoNormalizado === "PRESTADO";
  const isFueraDeServicio = estadoNormalizado === "FUERA DE SERVICIO"; 

  // Determinar color del estado
  let statusColor = SUCCESS_COLOR;
  if (isPrestado) statusColor = DANGER_COLOR;
  if (isFueraDeServicio) statusColor = "#616161"; // Gris para fuera de servicio

  const refrescarDatos = async () => {
    try {
      const docSnap = await getDoc(doc(db, "Equipos", item.id));
      if (docSnap.exists()) setItem({ id: docSnap.id, ...docSnap.data() });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", refrescarDatos);
    return unsubscribe;
  }, [navigation]);

  const handleConfirmarPrestamo = async () => {
    if (nombreAlumno.trim() === "" || matriculaAlumno.trim() === "")
      return Alert.alert("Campos vacíos", "Por favor ingresa nombre y matrícula.");
    setLoading(true);
    try {
      await updateDoc(doc(db, "Equipos", item.id), {
        estado: "PRESTADO",
        usuarioActual: userData?.nombre || "Usuario Móvil",
        alumno_nombre: nombreAlumno,
        alumno_matricula: matriculaAlumno,
        poseedor_actual: `${nombreAlumno} (${matriculaAlumno})`,
        fecha_prestamo: new Date().toISOString(),
      });

      await addDoc(collection(db, "Historial"), {
        idEquipo: item.id,
        nombreEquipo: item.nombre,
        accion: "PRÉSTAMO",
        fecha: new Date(),
        admin: userData?.nombre || "Usuario Desconocido", 
        observaciones: `Prestado a: ${nombreAlumno} (${matriculaAlumno}) - Vía App Móvil 📱`
      });

      setItem({
        ...item,
        estado: "PRESTADO",
        alumno_nombre: nombreAlumno,
        alumno_matricula: matriculaAlumno,
      });
      setModalVisible(false);
      setNombreAlumno("");
      setMatriculaAlumno("");
      Alert.alert("¡Éxito!", "El equipo ha sido prestado y registrado en el Historial.");
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  };

  // --- PROCESAR BAJA O REACTIVACIÓN ---
  const handleConfirmReasonAction = async () => {
    if (reasonText.trim() === "") {
      return Alert.alert("Campo vacío", "Por favor ingresa un motivo para el historial.");
    }
    setLoading(true);

    try {
      const nuevoEstado = reasonActionType === "BAJA" ? "Fuera de Servicio" : "Disponible";
      const accionHistorial = reasonActionType === "BAJA" ? "BAJA" : "REACTIVACIÓN";
      const prefijoObs = reasonActionType === "BAJA" ? "Baja del sistema" : "Equipo reactivado tras reparación";

      // 1. Actualizamos el documento
      await updateDoc(doc(db, "Equipos", item.id), {
        estado: nuevoEstado,
        usuarioActual: userData?.nombre || "Usuario Móvil",
        alumno_nombre: "",
        alumno_matricula: "",
        poseedor_actual: "",
      });

      // 2. Guardamos en el historial
      await addDoc(collection(db, "Historial"), {
        idEquipo: item.id,
        nombreEquipo: item.nombre,
        accion: accionHistorial,
        fecha: new Date(),
        admin: userData?.nombre || "Usuario Móvil",
        observaciones: `${prefijoObs}. Motivo: ${reasonText} - Vía App Móvil 📱`,
      });

      // 3. Actualizamos la pantalla
      setItem({
        ...item,
        estado: nuevoEstado,
        usuarioActual: userData?.nombre || "Usuario Móvil",
        alumno_nombre: "",
        alumno_matricula: "",
      });

      setReasonModalVisible(false);
      setReasonText("");
      Alert.alert("¡Éxito!", `El equipo ha sido ${reasonActionType === "BAJA" ? "dado de baja" : "reactivado"}.`);
    } catch (error) {
      Alert.alert("Error", "Hubo un problema al actualizar el estado.");
    } finally {
      setLoading(false);
    }
  };

  const openReasonModal = (type) => {
    setReasonActionType(type);
    setReasonText("");
    setReasonModalVisible(true);
  };

  // --- ELIMINAR PRODUCTO ---
  const handleDelete = () => {
    Alert.alert(
      "Eliminar Equipo",
      `¿Estás seguro de que deseas eliminar permanentemente "${item.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "Equipos", item.id));
              Alert.alert("Eliminado", "El equipo ha sido borrado del inventario.");
              navigation.navigate("InventoryList");
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el equipo.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.headerTitle}>Detalles del Equipo</Text>
        <View style={styles.detailCard}>
          <Text style={styles.label}>Nombre del Equipo</Text>
          <Text style={styles.valueLarge}>{item.nombre}</Text>
          <Text style={styles.label}>ID / Código</Text>
          <Text style={styles.value}>{item.id}</Text>
          <Text style={styles.label}>Categoría</Text>
          <Text style={styles.value}>{item.categoria || "General"}</Text>

          {/* --- NUEVO: MARCA Y NÚMERO DE SERIE --- */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.label, { marginTop: 0 }]}>Marca</Text>
              <Text style={styles.value}>{item.marca || "No registrada"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginTop: 0 }]}>No. de Serie</Text>
              <Text style={styles.value}>{item.no_serie || "No registrado"}</Text>
            </View>
          </View>
          {/* ---------------------------------------- */}

          <Text style={styles.label}>Estado Actual</Text>
          <Text
            style={[
              styles.value,
              {
                color: statusColor,
                fontWeight: "bold",
                textTransform: "uppercase",
              },
            ]}
          >
            {item.estado || "DISPONIBLE"}
          </Text>
          <Text style={styles.label}>Descripción</Text>
          <Text style={styles.value}>
            {item.descripcion || "Sin descripción"}
          </Text>
          {isPrestado && (
            <>
              <Text style={styles.label}>Prestado a:</Text>
              <Text style={styles.valueHighlight}>
                {item.alumno_nombre || item.poseedor_actual || "Sin datos"}
              </Text>
              <Text style={styles.label}>Matrícula:</Text>
              <Text style={styles.value}>{item.alumno_matricula || "-"}</Text>
            </>
          )}

          
          {/* Mostramos el panel de acciones si es admin O superadmin */}
          {(userData?.rol === "admin" || userData?.rol === "superadmin") && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                marginTop: 20,
                borderTopWidth: 1,
                borderTopColor: "#ddd",
                paddingTop: 15,
                gap: 15
              }}
            >
              {/* BOTÓN EDITAR */}
              <TouchableOpacity
                onPress={() => navigation.navigate("EditProduct", { item })}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="pencil" size={20} color={PRIMARY_COLOR} />
                <Text style={{ color: PRIMARY_COLOR, marginLeft: 5, fontWeight: "bold" }}>EDITAR</Text>
              </TouchableOpacity>

              {/* BOTÓN BAJA/REACTIVAR */}
              {!isFueraDeServicio ? (
                <TouchableOpacity
                  onPress={() => openReasonModal("BAJA")}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Ionicons name="close-circle" size={20} color="#ff9800" />
                  <Text style={{ color: "#ff9800", marginLeft: 5, fontWeight: "bold" }}>BAJA</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => openReasonModal("REACTIVAR")}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Ionicons name="checkmark-circle" size={20} color={SUCCESS_COLOR} />
                  <Text style={{ color: SUCCESS_COLOR, marginLeft: 5, fontWeight: "bold" }}>REACTIVAR</Text>
                </TouchableOpacity>
              )}

              {/* BOTÓN ELIMINAR: 🔥 Visible SOLO para Superadmin 🔥 */}
              {userData?.rol === "superadmin" && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Ionicons name="trash" size={20} color={DANGER_COLOR} />
                  <Text style={{ color: DANGER_COLOR, marginLeft: 5, fontWeight: "bold" }}>ELIMINAR</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          {/* BOTÓN PRESTAR */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: (isPrestado || isFueraDeServicio) ? DISABLED_COLOR : SUCCESS_COLOR },
            ]}
            disabled={isPrestado || isFueraDeServicio}
            onPress={() => setModalVisible(true)}
          >
            <Text
              style={[
                styles.buttonText,
                { color: (isPrestado || isFueraDeServicio) ? "#AAA" : "white" },
              ]}
            >
              {isFueraDeServicio ? "NO DISPONIBLE" : isPrestado ? "OCUPADO" : "PRESTAR"}
            </Text>
          </TouchableOpacity>

          {/* BOTÓN DEVOLVER */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: (!isPrestado || isFueraDeServicio) ? DISABLED_COLOR : DANGER_COLOR },
            ]}
            disabled={!isPrestado || isFueraDeServicio}
            onPress={() => {
              Alert.alert(
                "Confirmación",
                "Para devolver, escanea el QR nuevamente.",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Escanear QR",
                    onPress: () =>
                      navigation.navigate("Scanner", {
                        returnMode: true,
                        expectedId: item.id,
                      }),
                  },
                ],
              );
            }}
          >
            <Text
              style={[
                styles.buttonText,
                { color: (!isPrestado || isFueraDeServicio) ? "#AAA" : "white" },
              ]}
            >
              DEVOLVER
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("InventoryList")}
          style={{ alignSelf: "center", marginTop: 20 }}
        >
          <Text style={{ color: PRIMARY_COLOR, fontSize: 16, fontWeight: "bold" }}>
            VOLVER AL INICIO
          </Text>
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* --- MODALES --- */}
      {/* MODAL DE PRÉSTAMO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Datos del Alumno</Text>
              <Text style={styles.modalSubtitle}>Ingresa quién recibe el equipo</Text>
              <Text style={styles.inputLabel}>Nombre Completo:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Juan Pérez"
                placeholderTextColor="#888"
                value={nombreAlumno}
                onChangeText={setNombreAlumno}
              />
              <Text style={styles.inputLabel}>Matrícula:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 2314209"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={matriculaAlumno}
                onChangeText={setMatriculaAlumno}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#555" }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.textStyle}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: PRIMARY_COLOR }]}
                  onPress={handleConfirmarPrestamo}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.textStyle}>Confirmar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL PARA BAJA / REACTIVACIÓN */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reasonModalVisible}
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>
                {reasonActionType === "BAJA" ? "Dar de Baja Equipo" : "Reactivar Equipo"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {reasonActionType === "BAJA" 
                  ? "¿Por qué vas a dar de baja este equipo?" 
                  : "¿Por qué se vuelve a activar este equipo?"}
              </Text>
              <Text style={styles.inputLabel}>Motivo u Observaciones:</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder={reasonActionType === "BAJA" ? "Ej. Pantalla rota, extraviado..." : "Ej. Se reparó, pieza cambiada..."}
                placeholderTextColor="#888"
                multiline={true}
                value={reasonText}
                onChangeText={setReasonText}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#555" }]}
                  onPress={() => setReasonModalVisible(false)}
                >
                  <Text style={styles.textStyle}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: reasonActionType === "BAJA" ? "#ff9800" : SUCCESS_COLOR },
                  ]}
                  onPress={handleConfirmReasonAction}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.textStyle}>
                      {reasonActionType === "BAJA" ? "Dar de Baja" : "Reactivar"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}


// ==========================================
// 3. PANTALLA PRINCIPAL 
// ==========================================

function InventoryScreen() {
  const navigation = useNavigation();
  const { userData } = useContext(AuthContext);

  const [equipos, setEquipos] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // --- NUEVO: DICCIONARIO DE ÍCONOS Y COLORES POR CATEGORÍA ---
  const categoryConfig = {
    "CÓMPUTO": { icon: "💻", color: "#4A90E2" }, // Azul
    "COMPUTO": { icon: "💻", color: "#4A90E2" }, // Por si lo escriben sin acento
    "AUDIOVISUAL": { icon: "📽️", color: "#E94A67" }, // Rosa/Rojo
    "REDES": { icon: "🌐", color: "#50E3C2" }, // Turquesa
    "ACCESORIOS": { icon: "🔌", color: "#F5A623" }, // Naranja
    "MOBILIARIO": { icon: "🪑", color: "#8B572A" }, // Café
    "GENERAL": { icon: "📦", color: "#9B9B9B" }, // Gris
  };

  const cargarDatos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "Equipos"));
      const lista = [];
      querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
      setEquipos(lista);
    } catch (e) {
      console.log("Error cargando equipos:", e);
    }
  };

  useEffect(() => {
    cargarDatos();
    const unsubscribe = navigation.addListener("focus", () => cargarDatos());
    return unsubscribe;
  }, [navigation]);

  // A. Búsqueda global
  const filteredEquipos = equipos.filter((item) => {
    const query = searchText.toLowerCase();
    const nombreMatch = item.nombre ? item.nombre.toLowerCase().includes(query) : false;
    const idMatch = item.id ? item.id.toLowerCase().includes(query) : false;
    return nombreMatch || idMatch;
  });

  // B. Lista de la categoría seleccionada
  const categoryEquipos = equipos.filter((item) => {
    const cat = item.categoria ? item.categoria.toUpperCase() : "GENERAL";
    return cat === selectedCategory;
  });

  // C. Extraer categorías únicas
  const categoriasData = equipos.reduce((acc, item) => {
    const cat = item.categoria ? item.categoria.toUpperCase() : "GENERAL";
    if (!acc[cat]) { acc[cat] = 0; }
    acc[cat]++;
    return acc;
  }, {});

  const listaCategorias = Object.keys(categoriasData).map(key => ({
    nombre: key,
    cantidad: categoriasData[key]
  })).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // ==========================================
  // DISEÑO DE LOS ELEMENTOS
  // ==========================================
  
  const renderItem = ({ item }) => {
    const estadoActual = item.estado ? item.estado.toUpperCase() : "DISPONIBLE";
    const isPrestado = estadoActual === "PRESTADO";
    const isFueraDeServicio = estadoActual === "FUERA DE SERVICIO";

    let statusColor = SUCCESS_COLOR; 
    if (isPrestado) { statusColor = DANGER_COLOR; } 
    else if (isFueraDeServicio) { statusColor = "#616161"; }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Detalles", { item: item })}
      >
        <View style={[styles.cardIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.nombre || "Sin nombre"}</Text>
          <Text style={styles.cardSubtitle}>ID: {item.id}</Text>
          <Text style={[styles.cardStatus, { color: statusColor, fontWeight: "bold" }]}>
            {estadoActual}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={statusColor} />
      </TouchableOpacity>
    );
  };

  // NUEVO DISEÑO: Tarjetas de categoría con Emojis
  const renderCategoria = ({ item }) => {
    // Buscamos la configuración de la categoría. Si no existe, usamos una por defecto.
    const config = categoryConfig[item.nombre] || { icon: "📁", color: PRIMARY_COLOR };

    return (
      <TouchableOpacity
        style={[styles.categoryCard, { borderColor: config.color }]}
        onPress={() => setSelectedCategory(item.nombre)}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color + "20" }]}>
          <Text style={styles.categoryIcon}>{config.icon}</Text>
        </View>
        <Text style={styles.categoryName}>{item.nombre}</Text>
        <Text style={styles.categoryCount}>
          {item.cantidad} {item.cantidad === 1 ? "artículo" : "artículos"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />

      <TouchableOpacity
        style={styles.bigOrangeButton}
        onPress={() => navigation.navigate("Scanner", { returnMode: false })}
      >
        <Text style={styles.bigButtonText}>ESCANEAR PRODUCTO</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        {isSearchActive ? (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearchActive(false); setSearchText(""); }}>
              <Ionicons name="close-circle" size={24} color="#888" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? selectedCategory : "Categorías"}
            </Text>
            <TouchableOpacity onPress={() => setIsSearchActive(true)}>
              <Ionicons name="search" size={28} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {searchText !== "" ? (
        <FlatList
          key="search-list"
          data={filteredEquipos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron resultados.</Text>}
        />
      ) : selectedCategory ? (
        <View style={{ flex: 1 }}>
          <TouchableOpacity 
            onPress={() => setSelectedCategory(null)} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.backButtonText}>Volver a categorías</Text>
          </TouchableOpacity>

          <FlatList
            key="category-list"
            data={categoryEquipos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        </View>
      ) : (
        <FlatList
          key="grid-list"
          data={listaCategorias}
          renderItem={renderCategoria}
          keyExtractor={(item) => item.nombre}
          numColumns={2} 
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay categorías registradas.</Text>}
        />
      )}

      {userData?.rol === "admin" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddProduct")}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ==========================================
// 4. PANTALLA DE ESCÁNER (Con Candado 🔒, Beep 🔊, Vibración 📳 y Fix de Cámara Fantasma 👻)
// ==========================================
function ScannerScreen({ route, navigation }) {
  const { userData } = useContext(AuthContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  
  // --- NUEVO: Hook para saber si la pantalla está activa ---
  const isFocused = useIsFocused(); 

  const { returnMode, expectedId, mode } = route.params || {};
  const isProcessing = useRef(false);
  // Cargamos el sonido de forma moderna y optimizada
  const player = useAudioPlayer('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "white", marginBottom: 20 }}>Necesitamos usar tu cámara</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.bigOrangeButton}>
          <Text style={styles.bigButtonText}>DAR PERMISO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }) => {
    if (isProcessing.current) return; 

    // Cerramos el candado e indicamos que ya se escaneó
    isProcessing.current = true;
    setScanned(true);

    // EJECUTAMOS VIBRACIÓN Y SONIDO
    Vibration.vibrate(100); 
    player.play(); 

    if (mode === "add") {
      navigation.navigate("AddProduct", { scannedId: data });
      isProcessing.current = false; 
      return;
    }

    // --- MODO DEVOLVER ---
    if (returnMode) {
      if (data === expectedId) {
        try {
          const equipoRef = doc(db, "Equipos", expectedId);
          
          const docSnap = await getDoc(equipoRef);
          const nombreEquipo = docSnap.exists() ? docSnap.data().nombre : "Desconocido";

          await updateDoc(equipoRef, {
            estado: "DISPONIBLE",
            usuarioActual: userData?.nombre || "Usuario Móvil",
            alumno_nombre: "",
            alumno_matricula: "",
            poseedor_actual: "",
          });

          await addDoc(collection(db, "Historial"), {
            idEquipo: expectedId,
            nombreEquipo: nombreEquipo,
            accion: "DEVOLUCIÓN",
            fecha: new Date(),
            admin: userData?.nombre || "Usuario Desconocido",
            observaciones: "Devuelto escaneando QR - Vía App Móvil 📱"
          });

          Alert.alert("✅ Devolución", "Equipo disponible y registrado en el historial.", [
            {
              text: "Terminar",
              onPress: () => {
                isProcessing.current = false;
                navigation.navigate("Detalles", { item: { id: expectedId, nombre: nombreEquipo } });
              }
            },
          ]);
        } catch (error) {
          Alert.alert("Error", "No se pudo actualizar.");
          setScanned(false);
          isProcessing.current = false;
        }
      } else {
        Vibration.vibrate(); 
        Alert.alert("⛔ Error", `El código no coincide.`, [
          { 
            text: "Reintentar", 
            onPress: () => {
              setScanned(false);
              isProcessing.current = false;
            }
          },
        ]);
      }
    }
    // --- MODO BUSCAR (Normal) ---
    else {
      const docSnap = await getDoc(doc(db, "Equipos", data));
      if (docSnap.exists()) {
        navigation.navigate("Detalles", {
          item: { id: data, ...docSnap.data() },
        });
        setScanned(false);
        isProcessing.current = false;
      } else {
        Alert.alert(
          "⚠️ No encontrado",
          `No existe un equipo con el ID: ${data}`,
          [{ 
            text: "OK", 
            onPress: () => {
              setScanned(false);
              isProcessing.current = false;
            }
          }],
        );
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* --- NUEVO: CONDICIÓN isFocused --- */}
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
      )}
      
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {mode === "add"
            ? "Escanea el nuevo QR"
            : returnMode
              ? `🔐 ESCANEA:\n${expectedId}`
              : "Escanea QR"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={{ color: "white" }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ==========================================
// 5. PANTALLA AGREGAR PRODUCTO (Actualizada con escáner, Marca y No. Serie)
// ==========================================
function AddProductScreen({ navigation, route }) {
  const { userData } = useContext(AuthContext);
  const [idQr, setIdQr] = useState("");
  const [nombre, setNombre] = useState("");
  // --- NUEVOS ESTADOS ---
  const [marca, setMarca] = useState("");
  const [noSerie, setNoSerie] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Estados para el Dropdown de Categorías
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState("Cómputo");
  const [items, setItems] = useState([
    { label: '💻 Cómputo (Laptops, Teclados, Mouse)', value: 'Cómputo' },
    { label: '📽️ Audiovisual (Proyectores)', value: 'Audiovisual' },
    { label: '🌐 Redes (Switches, Cables)', value: 'Redes' },
    { label: '🔌 Accesorios (Cargadores, Adaptadores)', value: 'Accesorios' },
    { label: '🪑 Mobiliario (Bases de Webcam)', value: 'Mobiliario' },
    { label: '📦 General', value: 'General' }
  ]);

  // Escuchar si venimos del escáner
  useEffect(() => {
    if (route.params?.scannedId) {
      setIdQr(route.params.scannedId);
      navigation.setParams({ scannedId: undefined });
    }
  }, [route.params?.scannedId]);

  const handleSaveProduct = async () => {
    if (!idQr.trim() || !nombre.trim()) {
      Alert.alert("Error", "El ID del equipo y el Nombre son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const equipoRef = doc(db, "Equipos", idQr.trim());
      const docSnap = await getDoc(equipoRef);

      if (docSnap.exists()) {
        Alert.alert("Error", "Ya existe un equipo registrado con este ID.");
        setLoading(false);
        return;
      }

      // --- AQUÍ GUARDAMOS LOS NUEVOS DATOS EN FIREBASE ---
      await setDoc(equipoRef, {
        id_qr: idQr.trim(),
        nombre: nombre,
        marca: marca,             // Nuevo campo
        no_serie: noSerie,        // Nuevo campo
        categoria: categoria || "General",
        descripcion: descripcion,
        estado: "DISPONIBLE",
        alumno_nombre: "",
        alumno_matricula: "",
        poseedor_actual: "",
        fecha_registro: new Date().toISOString(),
        personal_registro: userData?.nombre || "Admin",
        registrado_por: userData?.email || "",
      });

      Alert.alert("¡Éxito!", "Equipo agregado correctamente al inventario.");
      navigation.navigate("InventoryList");
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el equipo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.detailCard}>
        <Text style={styles.headerTitle}>Nuevo Equipo</Text>

        <Text style={styles.inputLabel}>ID del Equipo (Código QR):</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Ej. EQ-010"
            placeholderTextColor="#888"
            value={idQr}
            onChangeText={setIdQr}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={{
              backgroundColor: PRIMARY_COLOR,
              padding: 15,
              borderRadius: 10,
              marginLeft: 10,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={() => navigation.navigate("Scanner", { mode: "add" })}
          >
            <Ionicons name="qr-code-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Nombre del Artículo:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Proyector"
          placeholderTextColor="#888"
          value={nombre}
          onChangeText={setNombre}
        />

        {/* --- NUEVO INPUT: MARCA --- */}
        <Text style={styles.inputLabel}>Marca:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Epson, Dell, HP..."
          placeholderTextColor="#888"
          value={marca}
          onChangeText={setMarca}
        />

        {/* --- NUEVO INPUT: NÚMERO DE SERIE --- */}
        <Text style={styles.inputLabel}>Número de Serie:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. SN123456789"
          placeholderTextColor="#888"
          value={noSerie}
          onChangeText={setNoSerie}
          autoCapitalize="characters"
        />

        <Text style={styles.inputLabel}>Categoría:</Text>
        <View style={{ marginBottom: 15, zIndex: 1000 }}>
          <DropDownPicker
            open={open}
            value={categoria}
            items={items}
            setOpen={setOpen}
            setValue={setCategoria}
            setItems={setItems}
            theme="DARK"
            placeholder="Selecciona una categoría"
            style={{ backgroundColor: "#1E1E1E", borderColor: "#333", borderRadius: 8 }}
            dropDownContainerStyle={{ backgroundColor: "#1E1E1E", borderColor: "#333" }}
            textStyle={{ color: "white", fontSize: 16 }}
            listMode="SCROLLVIEW" 
            scrollViewProps={{ nestedScrollEnabled: true }}
          />
        </View>

        <Text style={styles.inputLabel}>Descripción Breve:</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          placeholder="Detalles, estado físico, etc."
          placeholderTextColor="#888"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />

        <TouchableOpacity
          style={styles.bigOrangeButton}
          onPress={handleSaveProduct}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.bigButtonText}>GUARDAR EQUIPO</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ==========================================
// 5.1. PANTALLA EDITAR PRODUCTO (SOLO ADMIN)
// ==========================================
function EditProductScreen({ route, navigation }) {
  const { item } = route.params;

  // Inicializamos los inputs con los datos existentes, incluyendo Marca y Serie
  const [nombre, setNombre] = useState(item.nombre || "");
  const [marca, setMarca] = useState(item.marca || "");       // Nuevo
  const [noSerie, setNoSerie] = useState(item.no_serie || ""); // Nuevo
  const [descripcion, setDescripcion] = useState(item.descripcion || "");
  const [loading, setLoading] = useState(false);
  
  // Estados para el Dropdown de Categorías
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState(item.categoria || "Cómputo");
  const [items, setItems] = useState([
    { label: '💻 Cómputo (Laptops, Teclados, Mouse)', value: 'Cómputo' },
    { label: '📽️ Audiovisual (Proyectores)', value: 'Audiovisual' },
    { label: '🌐 Redes (Switches, Cables)', value: 'Redes' },
    { label: '🔌 Accesorios (Cargadores, Adaptadores)', value: 'Accesorios' },
    { label: '🪑 Mobiliario (Bases de Webcam)', value: 'Mobiliario' },
    { label: '📦 General', value: 'General' }
  ]);

  const handleUpdateProduct = async () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "El Nombre del artículo no puede estar vacío.");
      return;
    }

    setLoading(true);
    try {
      const equipoRef = doc(db, "Equipos", item.id);
      
      // --- AQUÍ ACTUALIZAMOS LOS DATOS EN FIREBASE ---
      await updateDoc(equipoRef, {
        nombre: nombre,
        marca: marca,             // Nuevo campo
        no_serie: noSerie,        // Nuevo campo
        categoria: categoria || "General",
        descripcion: descripcion,
      });

      Alert.alert("¡Actualizado!", "Los datos del equipo han sido guardados.");
      
      // Pasamos los nuevos datos de vuelta a la pantalla de detalles
      navigation.navigate("Detalles", {
        item: { ...item, nombre, marca, no_serie: noSerie, categoria, descripcion },
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.detailCard}>
        <Text style={styles.headerTitle}>Editar Equipo</Text>

        <Text style={styles.inputLabel}>ID del Equipo (Código QR):</Text>
        <TextInput
          style={[styles.input, { backgroundColor: "#222", color: "#666" }]}
          value={item.id}
          editable={false}
        />

        <Text style={styles.inputLabel}>Nombre del Artículo:</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor="#888"
          value={nombre}
          onChangeText={setNombre}
        />

        {/* --- NUEVO INPUT: MARCA --- */}
        <Text style={styles.inputLabel}>Marca:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Epson, Dell, HP..."
          placeholderTextColor="#888"
          value={marca}
          onChangeText={setMarca}
        />

        {/* --- NUEVO INPUT: NÚMERO DE SERIE --- */}
        <Text style={styles.inputLabel}>Número de Serie:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. SN123456789"
          placeholderTextColor="#888"
          value={noSerie}
          onChangeText={setNoSerie}
          autoCapitalize="characters"
        />

        <Text style={styles.inputLabel}>Categoría:</Text>
        <View style={{ marginBottom: 15, zIndex: 1000 }}>
          <DropDownPicker
            open={open}
            value={categoria}
            items={items}
            setOpen={setOpen}
            setValue={setCategoria}
            setItems={setItems}
            theme="DARK"
            placeholder="Selecciona una categoría"
            style={{ backgroundColor: "#1E1E1E", borderColor: "#333", borderRadius: 8 }}
            dropDownContainerStyle={{ backgroundColor: "#1E1E1E", borderColor: "#333" }}
            textStyle={{ color: "white", fontSize: 16 }}
            listMode="SCROLLVIEW" 
            scrollViewProps={{ nestedScrollEnabled: true }}
          />
        </View>

        <Text style={styles.inputLabel}>Descripción Breve:</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          placeholderTextColor="#888"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />

        <TouchableOpacity
          style={styles.bigOrangeButton}
          onPress={handleUpdateProduct}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.bigButtonText}>GUARDAR CAMBIOS</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ==========================================
// 6. NAVEGACIÓN PRINCIPAL
// ==========================================
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function MainStack() {
  return (
    <Stack.Navigator
      // Al pasar { navigation } aquí, el botón funcionará en cualquier pantalla
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: PRIMARY_COLOR },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        // --- ESTO PONE EL MENÚ HAMBURGUESA EN TODAS LAS PANTALLAS ---
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={{ marginLeft: 10, marginRight: 15 }}
          >
            <Ionicons name="menu" size={30} color="white" />
          </TouchableOpacity>
        ),
      })}
    >
      <Stack.Screen
        name="InventoryList"
        component={InventoryScreen}
        options={{ title: "Inventario SIGAT" }}
      />
      <Stack.Screen
        name="Detalles"
        component={DetailScreen}
        options={{ title: "Detalle del Equipo" }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: "Agregar Equipo" }}
      />
      <Stack.Screen
        name="EditProduct"
        component={EditProductScreen}
        options={{ title: "Editar Equipo" }}
      />
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        // El escáner lo dejamos sin cabecera para que la cámara use toda la pantalla
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ==========================================
// 7. COMPONENTE PRINCIPAL (APP) Y ESTADO DE SESIÓN
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchamos si el usuario inicia o cierra sesión
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Si hay un usuario, buscamos sus datos en la colección "Usuarios"
        try {
          const docRef = doc(db, "Usuarios", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserData(docSnap.data()); // Aquí obtenemos el nombre y el rol
          } else {
            // Si no existe el documento, le damos datos por defecto
            setUserData({
              email: currentUser.email,
              nombre: "Administrador",
              rol: "admin",
            });
          }
        } catch (error) {
          console.log("Error al obtener datos del usuario:", error);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BACKGROUND_COLOR,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
// ¡ESTO ES VITAL! El Provider envuelve la app para que todos tengan acceso a userData
    <AuthContext.Provider value={{ user, userData }}>
      <NavigationContainer>
        {user ? (
          <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
              headerShown: false,
              // --- ESTO ES LO NUEVO: OBLIGA AL MENÚ A SER OSCURO ---
              drawerStyle: {
                backgroundColor: BACKGROUND_COLOR,
                width: 280, // Un tamaño estándar y elegante
              },
            }}
          >
            {/* 1. Tu pantalla principal con el inventario */}
            <Drawer.Screen name="Main" component={MainStack} />

            {/* 2. NUEVA PANTALLA: Acerca del Desarrollador */}
            <Drawer.Screen 
              name="About" 
              component={AboutScreen} 
              options={{ 
                headerShown: true, // Encendemos la barra superior solo para esta ventana
                title: 'Acerca de', // Título que aparecerá en la parte superior
                headerStyle: { backgroundColor: CARD_COLOR }, // Color de fondo oscuro para la barra
                headerTintColor: PRIMARY_COLOR, // Botón de retroceso y texto en naranja
              }} 
            />
          </Drawer.Navigator>
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

// ==========================================
// 8. ESTILOS
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR, padding: 15 },
  loginContainer: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    justifyContent: "center",
    padding: 20,
  },
  loginLogoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY_COLOR,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 10,
  },
  loginTitle: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  loginSubtitle: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  loginCard: {
    backgroundColor: CARD_COLOR,
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  drawerHeader: {
    backgroundColor: PRIMARY_COLOR,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  profileIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  drawerName: { color: "white", fontWeight: "bold", fontSize: 16 },
  drawerEmail: { color: "white", fontSize: 12, opacity: 0.9 },
  bigOrangeButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    elevation: 5,
    marginTop: 10,
  },
  bigButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  inputLabel: {
    alignSelf: "flex-start",
    color: "#ccc",
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: "white",
    borderWidth: 1,
    borderColor: "#444",
  },
  sectionTitle: { color: "#888", fontSize: 14, fontWeight: "bold" },
  card: {
    backgroundColor: CARD_COLOR,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cardIndicator: { width: 4, height: "100%", borderRadius: 2, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { color: "white", fontWeight: "bold", fontSize: 16 },
  cardSubtitle: { color: "#aaa", fontSize: 12, marginTop: 2 },
  cardStatus: { fontSize: 10, marginTop: 5, fontWeight: "bold" },
  headerTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 10,
  },
  detailCard: {
    backgroundColor: CARD_COLOR,
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
  },
  label: {
    color: "#888",
    fontSize: 12,
    marginTop: 15,
    textTransform: "uppercase",
  },
  value: { color: TEXT_COLOR, fontSize: 16, marginBottom: 5 },
  valueLarge: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  valueHighlight: { color: PRIMARY_COLOR, fontSize: 18, fontWeight: "bold" },
  buttonRow: { flexDirection: "row", gap: 15 },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  buttonText: { fontWeight: "bold", fontSize: 14 },
  closeButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#555",
  },
  overlay: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    width: "90%",
  },
  overlayText: {
    color: "white",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
    borderRadius: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  modalSubtitle: { fontSize: 14, color: "#aaa", marginBottom: 20 },
  modalButtonRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    width: "48%",
    alignItems: "center",
  },
  textStyle: { color: "white", fontWeight: "bold", textAlign: "center" },

  // --- BOTÓN FLOTANTE ---
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 20,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  // ==========================================
  // --- NUEVOS ESTILOS PARA LAS CARPETAS ---
  // ==========================================
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: CARD_COLOR,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: {
    flex: 1,
    color: TEXT_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: 50,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  backButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: CARD_COLOR,
    margin: 8,
    paddingVertical: 25,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    minHeight: 140,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    color: TEXT_COLOR,
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 15,
  },
  categoryCount: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
});