import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { FieldLabel, LabeledInput, ThemedInput } from "../components/ThemedInput";
import { ThemedPicker } from "../components/ThemedPicker";
import { actualizarPersonal, crearPersonal, getPersonalLocal } from "../services/personalData";
import { getCarpetas, getCarpetasLocal, getEquiposLocal } from "../services/supabaseData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { PersonalStackParamList } from "../types";
import {
  CONDUCTAS,
  departamentosAdministrativos,
  type FormularioPersonal,
  formularioDesde,
  mascaraFecha,
  validarFormulario,
} from "../utils/personal";

// Opción del selector para dejar el departamento vacío.
const SIN_DEPARTAMENTO = "__sin_departamento__";

export function PersonalFormScreen({ route, navigation }: NativeStackScreenProps<PersonalStackParamList, "PersonalForm">) {
  const personalId = route.params?.personalId;
  const { colors } = useTheme();
  const [form, setForm] = useState<FormularioPersonal>(() => formularioDesde(null));
  const [guardando, setGuardando] = useState(false);
  const [departamentos, setDepartamentos] = useState<string[]>([]);

  // Departamentos = subcategorías de ADMINISTRATIVOS. Primero lo guardado en el
  // teléfono y luego, si hay conexión, las carpetas actualizadas del servidor.
  useEffect(() => {
    let active = true;
    void Promise.all([getCarpetasLocal(), getEquiposLocal()])
      .then(async ([carpetas, equipos]) => {
        if (active) setDepartamentos(departamentosAdministrativos(carpetas, equipos));
        const remotas = await getCarpetas();
        if (active) setDepartamentos(departamentosAdministrativos(remotas, equipos));
      })
      .catch((e: unknown) => console.log("No se pudieron cargar los departamentos:", e));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: personalId ? "Editar personal" : "Alta de personal" });
    if (!personalId) return;
    void getPersonalLocal().then((lista) => {
      const persona = lista.find((p) => p.id === personalId);
      if (persona) setForm(formularioDesde(persona));
    });
  }, [navigation, personalId]);

  const cambiar = <K extends keyof FormularioPersonal>(campo: K, valor: FormularioPersonal[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    const resultado = validarFormulario(form);
    if (!resultado.ok) {
      Alert.alert("Revisa los datos", resultado.error);
      return;
    }
    setGuardando(true);
    try {
      const guardada = personalId
        ? await actualizarPersonal(personalId, resultado.datos)
        : await crearPersonal(resultado.datos);
      if (personalId) navigation.goBack();
      else navigation.replace("PersonalDetalle", { personalId: guardada.id });
    } catch (e) {
      Alert.alert("No se guardó", e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <LabeledInput label="Nombre completo *" placeholder="Ej. María López Hernández" value={form.nombre} onChangeText={(v) => cambiar("nombre", v)} />
      <FieldLabel>Departamento</FieldLabel>
      <ThemedPicker
        value={form.departamento || null}
        items={[
          { label: "Sin departamento", value: SIN_DEPARTAMENTO },
          ...departamentos.map((d) => ({ label: d, value: d })),
        ]}
        onChange={(v) => cambiar("departamento", !v || v === SIN_DEPARTAMENTO ? "" : v)}
        placeholder="Selecciona el departamento"
        modalTitle="Departamentos (Administrativos)"
      />
      {departamentos.length === 0 ? (
        <Text style={{ color: colors.subText, fontSize: 12, marginTop: -8, marginBottom: 15 }}>
          No hay subcategorías en ADMINISTRATIVOS. Créalas en el inventario para poder elegirlas aquí.
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <LabeledInput
            label="Fecha de ingreso"
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            value={form.fechaIngreso}
            onChangeText={(v) => cambiar("fechaIngreso", mascaraFecha(v))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <LabeledInput
            label="Fecha de término"
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            value={form.fechaTermino}
            onChangeText={(v) => cambiar("fechaTermino", mascaraFecha(v))}
          />
        </View>
      </View>
      <Text style={{ color: colors.subText, fontSize: 12, marginTop: -8, marginBottom: 15 }}>
        Escribe solo los números (las diagonales se ponen solas). Deja la fecha de término vacía mientras la persona siga laborando.
      </Text>

      <FieldLabel>Conducta respecto al uso del equipo</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        {CONDUCTAS.map((c) => {
          const elegida = form.conducta === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              onPress={() => cambiar("conducta", elegida ? null : c.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegida }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: c.color,
                backgroundColor: elegida ? c.color : "transparent",
              }}
            >
              <Text style={{ color: elegida ? "white" : c.color, fontWeight: "bold" }}>{c.value}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{ color: colors.subText, fontSize: 12, marginBottom: 15 }}>
        {CONDUCTAS.find((c) => c.value === form.conducta)?.descripcion ?? "Sin evaluar"}
      </Text>
      <ThemedInput
        multiline
        placeholder="Notas sobre la conducta (opcional)"
        value={form.conductaNotas}
        onChangeText={(v) => cambiar("conductaNotas", v)}
      />

      <TouchableOpacity style={styles.bigOrangeButton} onPress={guardar} disabled={guardando} accessibilityRole="button">
        {guardando ? <ActivityIndicator color="white" /> : <Text style={styles.bigButtonText}>{personalId ? "GUARDAR CAMBIOS" : "DAR DE ALTA"}</Text>}
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}
