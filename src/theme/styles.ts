import { StyleSheet } from "react-native";
import { BRAND } from "./colors";

// Estilos de estructura compartidos. Los colores que dependen del modo
// claro/oscuro se aplican en cada pantalla con useTheme().
export const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },

  // --- Login ---
  loginContainer: { flex: 1, justifyContent: "center", padding: 20 },
  loginTitle: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 5 },
  loginSubtitle: { fontSize: 16, textAlign: "center", marginBottom: 40 },
  loginCard: { padding: 20, borderRadius: 15, elevation: 5 },

  // --- Menú lateral ---
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  drawerName: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  drawerEmail: { fontSize: 14, textAlign: "center", marginTop: 2 },

  // --- Botones y formularios ---
  bigOrangeButton: {
    backgroundColor: BRAND.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    elevation: 5,
    marginTop: 10,
  },
  bigButtonText: { color: "white", fontWeight: "bold", fontSize: 16, letterSpacing: 1 },
  inputLabel: { alignSelf: "flex-start", marginBottom: 5, fontSize: 14, fontWeight: "bold" },
  input: { width: "100%", borderRadius: 10, padding: 15, marginBottom: 15, borderWidth: 1 },
  textArea: { height: 80, textAlignVertical: "top" },

  // --- Tarjetas de equipo ---
  sectionTitle: { fontSize: 14, fontWeight: "bold" },
  card: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  cardIndicator: { width: 4, height: "100%", borderRadius: 2, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: "bold", fontSize: 16 },
  cardSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  cardStatus: { fontSize: 10, marginTop: 5, fontWeight: "bold" },

  // --- Detalle ---
  headerTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center", marginTop: 10 },
  detailCard: { borderRadius: 12, padding: 20, marginBottom: 25 },
  label: { fontSize: 12, marginTop: 15, textTransform: "uppercase" },
  value: { fontSize: 16, marginBottom: 5 },
  valueLarge: { fontSize: 24, fontWeight: "bold", marginBottom: 5 },
  valueHighlight: { color: BRAND.primary, fontSize: 18, fontWeight: "bold" },
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
  adminActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 15,
    gap: 15,
  },
  adminAction: { flexDirection: "row", alignItems: "center" },
  adminActionText: { marginLeft: 5, fontWeight: "bold" },

  // --- Escáner ---
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
  overlay: { position: "absolute", top: 100, alignSelf: "center", width: "90%" },
  overlayText: {
    color: "white",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
    borderRadius: 10,
    textAlign: "center",
    fontWeight: "bold",
  },

  // --- Modales ---
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  modalView: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 5, textAlign: "center" },
  modalSubtitle: { fontSize: 14, marginBottom: 20, textAlign: "center" },
  modalButtonRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginTop: 10 },
  modalButton: { borderRadius: 10, padding: 15, elevation: 2, width: "48%", alignItems: "center" },
  textStyle: { color: "white", fontWeight: "bold", textAlign: "center" },

  // --- Botón flotante ---
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 20,
    backgroundColor: BRAND.primary,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  // --- Carpetas (categorías) ---
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, marginLeft: 8 },
  levelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 15 },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  backButtonText: { fontSize: 16, fontWeight: "bold", marginLeft: 5 },
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
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryIcon: { fontSize: 32 },
  categoryName: { fontWeight: "bold", textAlign: "center", fontSize: 15 },
  categoryCount: { fontSize: 12, marginTop: 5, textAlign: "center" },
  listContent: { paddingBottom: 80 },
});
