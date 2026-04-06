import { Ionicons } from "@expo/vector-icons";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer, useNavigation, useIsFocused } from "@react-navigation/native"; // <--- ✅ AQUÍ ES SU LUGAR CORRECTO
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
  useColorScheme,
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

  // --- DETECCIÓN DE MODO OSCURO ---
  const colorScheme = useColorScheme(); // Asegúrate de tener esto importado de 'react-native'
  const isDarkMode = colorScheme === 'dark';

  // --- COLORES DINÁMICOS ---
  const theme = {
    background: isDarkMode ? "#121212" : "#F5F5F5",
    cardBg: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#333333",
    subText: isDarkMode ? "#AAAAAA" : "#666666",
    border: isDarkMode ? "#333333" : "#E0E0E0",
  };

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
      style={{ backgroundColor: theme.background }} // <-- Fondo dinámico principal
    >
      <View
        style={[
          styles.drawerHeader,
          {
            backgroundColor: theme.cardBg, // <-- Fondo de la cabecera dinámico
            padding: 20,
            paddingTop: 40, 
            paddingBottom: 30,
            borderBottomWidth: 1,
            borderBottomColor: theme.border, // <-- Línea separadora dinámica
            alignItems: "center", 
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
            { color: theme.text, fontSize: 18, fontWeight: "bold", textAlign: "center" }, // <-- Nombre dinámico
          ]}
        >
          {userData?.nombre || "Cargando Usuario..."}
        </Text>
        <Text style={[styles.drawerEmail, { color: theme.subText, fontSize: 14, textAlign: "center", marginTop: 2 }]}>
          {userData?.email || ""} 
        </Text>
        
        {/* Etiqueta de Admin visual (Esta la dejamos fija en dorado porque es un resaltado) */}
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
          labelStyle={{ color: theme.text, fontSize: 16 }} // <-- Texto dinámico
          icon={() => <Ionicons name="home" size={22} color={PRIMARY_COLOR} />} // Mantenemos tu color primario (naranja)
          onPress={() =>
            props.navigation.navigate("Main", { screen: "InventoryList" })
          }
        />
        
        {/* NUEVO BOTÓN: ACERCA DE */}
        <DrawerItem
          label="Acerca de"
          labelStyle={{ color: theme.text, fontSize: 16 }} // <-- Texto dinámico
          icon={() => <Ionicons name="information-circle" size={22} color={PRIMARY_COLOR} />}
          onPress={() =>
            props.navigation.navigate("About") 
          }
        />

        {/* Botón de Cerrar Sesión (Se queda rojo por ser de peligro/alerta) */}
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
// PANTALLA ACERCA DE (Profesional / Titulación)
// ==========================================
function AboutScreen() {
  // --- DETECCIÓN DE MODO OSCURO ---
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const theme = {
    background: isDarkMode ? "#121212" : "#F5F5F5",
    cardBg: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#333333",
    subText: isDarkMode ? "#AAAAAA" : "#666666",
    border: isDarkMode ? "#444444" : "#DDDDDD",
    primary: "#E65100", // PRIMARY_COLOR (Ajusta si tienes otra variable global)
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* CABECERA (LOGO Y VERSIÓN) */}
      <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 30 }}>
        <View style={{
          width: 90, 
          height: 90, 
          borderRadius: 25, 
          backgroundColor: theme.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 15,
          elevation: 5,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}>
          <Ionicons name="cube-outline" size={50} color="white" />
        </View>
        <Text style={[styles.headerTitle, { color: theme.text, marginBottom: 5 }]}>
          SIGAT {}
        </Text>
        <Text style={{ color: theme.subText, fontSize: 14, fontWeight: '500' }}>
          Versión 1.6.1
        </Text>
      </View>

      {/* TARJETA 1: SOBRE EL PROYECTO */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Ionicons name="school" size={24} color={theme.primary} style={{ marginRight: 10 }} />
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>
            Proyecto de Titulación
          </Text>
        </View>
        
        <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22, textAlign: 'justify' }}>
          Este sistema fue desarrollado como proyecto oficial para la obtención del título profesional. 
          Su propósito principal es optimizar el control, rastreo y gestión de activos físicos mediante 
          el uso de tecnología de códigos QR, asegurando la integridad y disponibilidad de la información en tiempo real.
        </Text>
        
        <Text style={[styles.label, { color: theme.subText, marginTop: 20 }]}>Institución:</Text>
        <Text style={[styles.value, { color: theme.text, fontWeight: '500' }]}>
          Centro de Estudios Superiores del Bajio Qro. (CESBA)
        </Text>

        <Text style={[styles.label, { color: theme.subText, marginTop: 10 }]}>Carrera:</Text>
        <Text style={[styles.value, { color: theme.text, fontWeight: '500' }]}>
          Ingeniería en Sistemas Computacionales
        </Text>
      </View>

      {/* TARJETA 2: DATOS DEL DESARROLLADOR */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Ionicons name="code-slash" size={24} color={theme.primary} style={{ marginRight: 10 }} />
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>
            Desarrollador
          </Text>
        </View>
        
        <Text style={[styles.label, { color: theme.subText, marginTop: 5 }]}>Autor:</Text>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold', marginTop: 2 }}>
          Ing. Ulises González Hernández
        </Text>

        <Text style={[styles.label, { color: theme.subText, marginTop: 15 }]}>Contacto:</Text>
        <Text style={[styles.value, { color: theme.text }]}>
          ulises.dev.hdz@gmail.com
        </Text>

        <Text style={[styles.label, { color: theme.subText, marginTop: 15 }]}>Tecnologías Principales:</Text>
        <Text style={[styles.value, { color: theme.text, fontSize: 14 }]}>
          React Native • Firebase • Expo
        </Text>
      </View>

      {/* PIE DE PÁGINA */}
      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
        <Text style={{ color: theme.subText, fontSize: 12 }}>
          © {new Date().getFullYear()} Santiago de Querétaro, México.
        </Text>
        <Text style={{ color: theme.subText, fontSize: 12 }}>
          Todos los derechos reservados.
        </Text>
      </View>

    </ScrollView>
  );
}

// ==========================================
// 2. PANTALLA DE DETALLES (Actualizada con Marca y No. Serie)
// ==========================================
function DetailScreen({ route, navigation }) {
  const { userData } = useContext(AuthContext); 
  const { item: initialItem } = route.params;
  const [item, setItem] = useState(initialItem);
  
  // --- DETECCIÓN DE MODO OSCURO ---
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // --- COLORES DINÁMICOS ---
  const theme = {
    background: isDarkMode ? "#121212" : "#F5F5F5",
    cardBg: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#333333",
    subText: isDarkMode ? "#AAAAAA" : "#666666",
    inputBg: isDarkMode ? "#333333" : "#F0F0F0",
    border: isDarkMode ? "#444444" : "#DDDDDD",
  };

  // Estados para el Modal de Préstamo
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [matriculaAlumno, setMatriculaAlumno] = useState("");
  
  // Estados para el Modal de Motivos (Baja/Reactivar)
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [reasonActionType, setReasonActionType] = useState(""); 
  const [reasonText, setReasonText] = useState("");
  
  const [loading, setLoading] = useState(false);

  // Normalización de estados
  const estadoNormalizado = item.estado ? item.estado.toUpperCase() : "DESCONOCIDO";
  const isPrestado = estadoNormalizado === "PRESTADO" || estadoNormalizado === "SIN ENTREGAR";
  const isNoResponde = estadoNormalizado === "NO RESPONDE"; // NUEVO ESTADO MOROSO
  const isFueraDeServicio = estadoNormalizado === "FUERA DE SERVICIO"; 

  // Determinar color del estado
  let statusColor = SUCCESS_COLOR;
  if (isNoResponde) statusColor = "#ad1457"; // Magenta para falta
  else if (isPrestado) statusColor = DANGER_COLOR;
  else if (isFueraDeServicio) statusColor = "#616161"; 

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

  const handleConfirmReasonAction = async () => {
    if (reasonText.trim() === "") {
      return Alert.alert("Campo vacío", "Por favor ingresa un motivo para el historial.");
    }
    setLoading(true);

    try {
      const nuevoEstado = reasonActionType === "BAJA" ? "Fuera de Servicio" : "Disponible";
      const accionHistorial = reasonActionType === "BAJA" ? "BAJA" : "REACTIVACIÓN";
      const prefijoObs = reasonActionType === "BAJA" ? "Baja del sistema" : "Equipo reactivado tras reparación";

      await updateDoc(doc(db, "Equipos", item.id), {
        estado: nuevoEstado,
        usuarioActual: userData?.nombre || "Usuario Móvil",
        alumno_nombre: "",
        alumno_matricula: "",
        poseedor_actual: "",
      });

      await addDoc(collection(db, "Historial"), {
        idEquipo: item.id,
        nombreEquipo: item.nombre,
        accion: accionHistorial,
        fecha: new Date(),
        admin: userData?.nombre || "Usuario Móvil",
        observaciones: `${prefijoObs}. Motivo: ${reasonText} - Vía App Móvil 📱`,
      });

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

  // Lógica de deshabilitación de botones
  const canPrestar = !isPrestado && !isFueraDeServicio && !isNoResponde;
  // Solo se puede devolver si está prestado, sin entregar, o no responde (para recuperarlo).
  const canDevolver = (isPrestado || isNoResponde) && !isFueraDeServicio;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={styles.container}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detalles del Equipo</Text>
        <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.label, { color: theme.subText }]}>Nombre del Equipo</Text>
          <Text style={[styles.valueLarge, { color: theme.text }]}>{item.nombre}</Text>
          <Text style={[styles.label, { color: theme.subText }]}>ID / Código</Text>
          <Text style={[styles.value, { color: theme.text }]}>{item.id}</Text>
          <Text style={[styles.label, { color: theme.subText }]}>Categoría</Text>
          <Text style={[styles.value, { color: theme.text }]}>{item.categoria || "General"}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.label, { marginTop: 0, color: theme.subText }]}>Marca</Text>
              <Text style={[styles.value, { color: theme.text }]}>{item.marca || "No registrada"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginTop: 0, color: theme.subText }]}>No. de Serie</Text>
              <Text style={[styles.value, { color: theme.text }]}>{item.no_serie || "No registrado"}</Text>
            </View>
          </View>

          <Text style={[styles.label, { color: theme.subText }]}>Estado Actual</Text>
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
          <Text style={[styles.label, { color: theme.subText }]}>Descripción</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {item.descripcion || "Sin descripción"}
          </Text>
          
          {/* Se muestra a quién está prestado incluso si "No responde" para saber a quién cobrarle */}
          {(isPrestado || isNoResponde) && (
            <>
              <Text style={[styles.label, { color: theme.subText }]}>Poseedor / Deudor:</Text>
              <Text style={styles.valueHighlight}>
                {item.alumno_nombre || item.poseedor_actual || "Sin datos"}
              </Text>
              <Text style={[styles.label, { color: theme.subText }]}>Matrícula:</Text>
              <Text style={[styles.value, { color: theme.text }]}>{item.alumno_matricula || "-"}</Text>
            </>
          )}

          {(userData?.rol === "admin" || userData?.rol === "superadmin") && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 20, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15, gap: 15 }}>
              <TouchableOpacity onPress={() => navigation.navigate("EditProduct", { item })} style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="pencil" size={20} color={PRIMARY_COLOR} />
                <Text style={{ color: PRIMARY_COLOR, marginLeft: 5, fontWeight: "bold" }}>EDITAR</Text>
              </TouchableOpacity>

              {!isFueraDeServicio ? (
                <TouchableOpacity onPress={() => openReasonModal("BAJA")} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="close-circle" size={20} color="#ff9800" />
                  <Text style={{ color: "#ff9800", marginLeft: 5, fontWeight: "bold" }}>BAJA</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => openReasonModal("REACTIVAR")} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="checkmark-circle" size={20} color={SUCCESS_COLOR} />
                  <Text style={{ color: SUCCESS_COLOR, marginLeft: 5, fontWeight: "bold" }}>REACTIVAR</Text>
                </TouchableOpacity>
              )}

              {userData?.rol === "superadmin" && (
                <TouchableOpacity onPress={handleDelete} style={{ flexDirection: "row", alignItems: "center" }}>
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
              { backgroundColor: canPrestar ? SUCCESS_COLOR : DISABLED_COLOR },
            ]}
            disabled={!canPrestar}
            onPress={() => setModalVisible(true)}
          >
            <Text
              style={[
                styles.buttonText,
                { color: canPrestar ? "white" : "#AAA" },
              ]}
            >
              {isFueraDeServicio ? "NO DISPONIBLE" : isNoResponde ? "BLOQUEADO (FALTA)" : isPrestado ? "OCUPADO" : "PRESTAR"}
            </Text>
          </TouchableOpacity>

          {/* BOTÓN DEVOLVER / RECUPERAR */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: canDevolver ? DANGER_COLOR : DISABLED_COLOR },
            ]}
            disabled={!canDevolver}
            onPress={() => {
              Alert.alert(
                isNoResponde ? "Recuperar Equipo" : "Confirmación",
                isNoResponde 
                  ? "Vas a recibir un equipo marcado con falta. Por favor escanea el QR nuevamente para procesar el regreso."
                  : "Para devolver, escanea el QR nuevamente.",
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
                { color: canDevolver ? "white" : "#AAA" },
              ]}
            >
              {isNoResponde ? "RECUPERAR" : "DEVOLVER"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("InventoryList")} style={{ alignSelf: "center", marginTop: 20 }}>
          <Text style={{ color: PRIMARY_COLOR, fontSize: 16, fontWeight: "bold" }}>VOLVER AL INICIO</Text>
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* MODAL DE PRÉSTAMO */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <View style={[styles.modalView, { backgroundColor: theme.cardBg }]}> 
              <Text style={[styles.modalTitle, { color: theme.text }]}>Datos del Alumno</Text>
              <Text style={[styles.modalSubtitle, { color: theme.subText }]}>Ingresa quién recibe el equipo</Text>
              
              <Text style={[styles.inputLabel, { color: theme.text }]}>Nombre Completo:</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Ej. Juan Pérez" placeholderTextColor={theme.subText} value={nombreAlumno} onChangeText={setNombreAlumno} />
              
              <Text style={[styles.inputLabel, { color: theme.text }]}>Matrícula:</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Ej. 2314209" placeholderTextColor={theme.subText} keyboardType="numeric" value={matriculaAlumno} onChangeText={setMatriculaAlumno} />
              
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#555" }]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.textStyle}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: PRIMARY_COLOR }]} onPress={handleConfirmarPrestamo} disabled={loading}>
                  <Text style={styles.textStyle}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL PARA BAJA / REACTIVACIÓN */}
      <Modal animationType="fade" transparent={true} visible={reasonModalVisible} onRequestClose={() => setReasonModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <View style={[styles.modalView, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{reasonActionType === "BAJA" ? "Dar de Baja Equipo" : "Reactivar Equipo"}</Text>
              <Text style={[styles.modalSubtitle, { color: theme.subText }]}>{reasonActionType === "BAJA" ? "¿Por qué vas a dar de baja este equipo?" : "¿Por qué se vuelve a activar este equipo?"}</Text>
              
              <Text style={[styles.inputLabel, { color: theme.text }]}>Motivo u Observaciones:</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder={reasonActionType === "BAJA" ? "Ej. Pantalla rota, extraviado..." : "Ej. Se reparó, pieza cambiada..."} placeholderTextColor={theme.subText} multiline={true} value={reasonText} onChangeText={setReasonText} />
              
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#555" }]} onPress={() => setReasonModalVisible(false)}>
                  <Text style={styles.textStyle}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: reasonActionType === "BAJA" ? "#ff9800" : SUCCESS_COLOR }]} onPress={handleConfirmReasonAction} disabled={loading}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.textStyle}>{reasonActionType === "BAJA" ? "Dar de Baja" : "Reactivar"}</Text>}
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

  // --- DETECCIÓN DE MODO OSCURO ---
  const colorScheme = useColorScheme(); 
  const isDarkMode = colorScheme === 'dark';

  // --- COLORES DINÁMICOS ---
  const theme = {
    background: isDarkMode ? "#121212" : "#F5F5F5",
    cardBg: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#333333",
    subText: isDarkMode ? "#AAAAAA" : "#666666",
    border: isDarkMode ? "#333333" : "#E0E0E0",
    searchBg: isDarkMode ? "#2C2C2C" : "#EEEEEE",
  };

  const [equipos, setEquipos] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categoryConfig = {
    "CÓMPUTO": { icon: "💻", color: "#4A90E2" }, 
    "COMPUTO": { icon: "💻", color: "#4A90E2" }, 
    "AUDIOVISUAL": { icon: "📽️", color: "#E94A67" }, 
    "REDES": { icon: "🌐", color: "#50E3C2" }, 
    "ACCESORIOS": { icon: "🔌", color: "#F5A623" }, 
    "MOBILIARIO": { icon: "🪑", color: "#8B572A" }, 
    "GENERAL": { icon: "📦", color: "#9B9B9B" }, 
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

  const filteredEquipos = equipos.filter((item) => {
    const query = searchText.toLowerCase();
    const nombreMatch = item.nombre ? item.nombre.toLowerCase().includes(query) : false;
    const idMatch = item.id ? item.id.toLowerCase().includes(query) : false;
    return nombreMatch || idMatch;
  });

  const categoryEquipos = equipos.filter((item) => {
    const cat = item.categoria ? item.categoria.toUpperCase() : "GENERAL";
    return cat === selectedCategory;
  });

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
    const isPrestado = estadoActual === "PRESTADO" || estadoActual === "SIN ENTREGAR";
    const isNoResponde = estadoActual === "NO RESPONDE";
    const isFueraDeServicio = estadoActual === "FUERA DE SERVICIO";

    let statusColor = SUCCESS_COLOR; 
    if (isNoResponde) { statusColor = "#ad1457"; } 
    else if (isPrestado) { statusColor = DANGER_COLOR; } 
    else if (isFueraDeServicio) { statusColor = "#616161"; }

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => navigation.navigate("Detalles", { item: item })}
      >
        <View style={[styles.cardIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.nombre || "Sin nombre"}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.subText }]}>ID: {item.id}</Text>
          <Text style={[styles.cardStatus, { color: statusColor, fontWeight: "bold" }]}>
            {estadoActual}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={statusColor} />
      </TouchableOpacity>
    );
  };

  const renderCategoria = ({ item }) => {
    const config = categoryConfig[item.nombre] || { icon: "📁", color: PRIMARY_COLOR };

    return (
      <TouchableOpacity
        style={[styles.categoryCard, { backgroundColor: theme.cardBg, borderColor: config.color }]}
        onPress={() => setSelectedCategory(item.nombre)}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color + "20" }]}>
          <Text style={styles.categoryIcon}>{config.icon}</Text>
        </View>
        <Text style={[styles.categoryName, { color: theme.text }]}>{item.nombre}</Text>
        <Text style={[styles.categoryCount, { color: theme.subText }]}>
          {item.cantidad} {item.cantidad === 1 ? "artículo" : "artículos"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      <TouchableOpacity
        style={styles.bigOrangeButton}
        onPress={() => navigation.navigate("Scanner", { returnMode: false })}
      >
        <Text style={styles.bigButtonText}>ESCANEAR PRODUCTO</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        {isSearchActive ? (
          <View style={[styles.searchContainer, { backgroundColor: theme.searchBg, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.subText} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar producto..."
              placeholderTextColor={theme.subText}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setIsSearchActive(false); setSearchText(""); }}>
              <Ionicons name="close-circle" size={24} color={theme.subText} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
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
          ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subText }]}>No se encontraron resultados.</Text>}
        />
      ) : selectedCategory ? (
        <View style={{ flex: 1 }}>
          <TouchableOpacity 
            onPress={() => setSelectedCategory(null)} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={PRIMARY_COLOR} />
            <Text style={[styles.backButtonText, { color: theme.text }]}>Volver a categorías</Text>
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
          ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subText }]}>No hay categorías registradas.</Text>}
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
// 5. PANTALLA AGREGAR PRODUCTO
// ==========================================
function AddProductScreen({ navigation, route }) {
  const { userData } = useContext(AuthContext);
  
  // --- DETECCIÓN DE MODO OSCURO ---
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const theme = {
    background: isDarkMode ? "#121212" : "#F5F5F5",
    cardBg: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#333333",
    subText: isDarkMode ? "#AAAAAA" : "#666666",
    inputBg: isDarkMode ? "#333333" : "#F0F0F0",
    border: isDarkMode ? "#444444" : "#DDDDDD",
  };

  const [idQr, setIdQr] = useState("");
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [noSerie, setNoSerie] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  
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

      await setDoc(equipoRef, {
        id_qr: idQr.trim(),
        nombre: nombre,
        marca: marca,
        no_serie: noSerie,
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
    <KeyboardAwareScrollView 
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1, padding: 15, paddingBottom: 40 }}
      enableOnAndroid={true} 
      extraHeight={120} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Nuevo Equipo</Text>

        <Text style={[styles.inputLabel, { color: theme.text }]}>ID del Equipo (Código QR):</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="Ej. EQ-010"
            placeholderTextColor={theme.subText}
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

        <Text style={[styles.inputLabel, { color: theme.text }]}>Nombre del Artículo:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Ej. Proyector"
          placeholderTextColor={theme.subText}
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Marca:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Ej. Epson, Dell, HP..."
          placeholderTextColor={theme.subText}
          value={marca}
          onChangeText={setMarca}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Número de Serie:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Ej. SN123456789"
          placeholderTextColor={theme.subText}
          value={noSerie}
          onChangeText={setNoSerie}
          autoCapitalize="characters"
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Categoría:</Text>
        <View style={{ marginBottom: 15, ...(Platform.OS !== 'android' && { zIndex: 1000 }) }}>
          <DropDownPicker
            open={open}
            value={categoria}
            items={items}
            setOpen={setOpen}
            setValue={setCategoria}
            setItems={setItems}
            theme={isDarkMode ? "DARK" : "LIGHT"}
            placeholder="Selecciona una categoría"
            style={{ backgroundColor: theme.inputBg, borderColor: theme.border, borderRadius: 8 }}
            dropDownContainerStyle={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
            textStyle={{ color: theme.text, fontSize: 16 }}
            listMode="SCROLLVIEW" 
            scrollViewProps={{ nestedScrollEnabled: true }}
          />
        </View>

        <Text style={[styles.inputLabel, { color: theme.text }]}>Descripción Breve:</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top", backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Detalles, estado físico, etc."
          placeholderTextColor={theme.subText}
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
    </KeyboardAwareScrollView>
  );
}

// ==========================================
// 5.1. PANTALLA EDITAR PRODUCTO (SOLO ADMIN)
// ==========================================
function EditProductScreen({ route, navigation }) {
  const { item } = route.params;

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const theme = {
    background: isDarkMode ? "#121212" : "#F5F5F5",
    cardBg: isDarkMode ? "#1E1E1E" : "#FFFFFF",
    text: isDarkMode ? "#FFFFFF" : "#333333",
    subText: isDarkMode ? "#AAAAAA" : "#666666",
    inputBg: isDarkMode ? "#333333" : "#F0F0F0",
    border: isDarkMode ? "#444444" : "#DDDDDD",
    disabledInput: isDarkMode ? "#222222" : "#E8E8E8",
  };

  const [nombre, setNombre] = useState(item.nombre || "");
  const [marca, setMarca] = useState(item.marca || ""); 
  const [noSerie, setNoSerie] = useState(item.no_serie || ""); 
  const [descripcion, setDescripcion] = useState(item.descripcion || "");
  const [loading, setLoading] = useState(false);
  
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
      
      await updateDoc(equipoRef, {
        nombre: nombre,
        marca: marca, 
        no_serie: noSerie, 
        categoria: categoria || "General",
        descripcion: descripcion,
      });

      Alert.alert("¡Actualizado!", "Los datos del equipo han sido guardados.");
      
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
    <KeyboardAwareScrollView 
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1, padding: 15, paddingBottom: 40 }}
      enableOnAndroid={true} 
      extraHeight={120} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Editar Equipo</Text>

        <Text style={[styles.inputLabel, { color: theme.text }]}>ID del Equipo (Código QR):</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.disabledInput, color: theme.subText, borderColor: theme.border }]}
          value={item.id}
          editable={false}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Nombre del Artículo:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholderTextColor={theme.subText}
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Marca:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Ej. Epson, Dell, HP..."
          placeholderTextColor={theme.subText}
          value={marca}
          onChangeText={setMarca}
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Número de Serie:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Ej. SN123456789"
          placeholderTextColor={theme.subText}
          value={noSerie}
          onChangeText={setNoSerie}
          autoCapitalize="characters"
        />

        <Text style={[styles.inputLabel, { color: theme.text }]}>Categoría:</Text>
        <View style={{ marginBottom: 15, ...(Platform.OS !== 'android' && { zIndex: 1000 }) }}>
          <DropDownPicker
            open={open}
            value={categoria}
            items={items}
            setOpen={setOpen}
            setValue={setCategoria}
            setItems={setItems}
            theme={isDarkMode ? "DARK" : "LIGHT"}
            placeholder="Selecciona una categoría"
            style={{ backgroundColor: theme.inputBg, borderColor: theme.border, borderRadius: 8 }}
            dropDownContainerStyle={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
            textStyle={{ color: theme.text, fontSize: 16 }}
            listMode="SCROLLVIEW" 
            scrollViewProps={{ nestedScrollEnabled: true }}
          />
        </View>

        <Text style={[styles.inputLabel, { color: theme.text }]}>Descripción Breve:</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top", backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholderTextColor={theme.subText}
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
    </KeyboardAwareScrollView>
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
  container: { 
    flex: 1, 
    padding: 15 
    // backgroundColor: se controla dinámicamente con theme
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    // backgroundColor: se controla dinámicamente con theme
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
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    // color: se controla dinámicamente con theme
  },
  loginSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    // color: se controla dinámicamente con theme.subText
  },
  loginCard: {
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    // backgroundColor: se controla dinámicamente con theme.cardBg
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
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "bold",
    // color: se controla dinámicamente con theme.text
  },
  input: {
    width: "100%",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    // backgroundColor, color y borderColor: se controlan con theme
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: "bold" 
    // color: se controla dinámicamente con theme.subText o text
  },
  card: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1, // Añadido para que el borde dinámico se vea
    // backgroundColor y borderColor: se controlan con theme
  },
  cardIndicator: { width: 4, height: "100%", borderRadius: 2, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "bold", fontSize: 16 }, // color dinámico
  cardSubtitle: { fontSize: 12, marginTop: 2 }, // color dinámico
  cardStatus: { fontSize: 10, marginTop: 5, fontWeight: "bold" }, // color depende del status
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 10,
    // color: se controla dinámicamente con theme
  },
  detailCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    // backgroundColor: se controla dinámicamente con theme.cardBg
  },
  label: {
    fontSize: 12,
    marginTop: 15,
    textTransform: "uppercase",
    // color: se controla dinámicamente con theme.subText
  },
  value: { fontSize: 16, marginBottom: 5 }, // color dinámico
  valueLarge: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    // color: se controla dinámicamente con theme.text
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
    backgroundColor: "#333", // Se queda oscuro porque va sobre la cámara
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
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    // backgroundColor: se controla con theme.cardBg
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    // color: se controla con theme.text
  },
  modalSubtitle: { fontSize: 14, marginBottom: 20 }, // color dinámico
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
  // --- ESTILOS PARA LAS CARPETAS (CATEGORÍAS) ---
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
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    // backgroundColor y borderColor: dinámicos con theme
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    // color: dinámico
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    // color: dinámico
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
    margin: 8,
    paddingVertical: 25,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    minHeight: 140,
    // backgroundColor y borderColor: dinámicos
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
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 15,
    // color: dinámico
  },
  categoryCount: {
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
    // color: dinámico
  },
});