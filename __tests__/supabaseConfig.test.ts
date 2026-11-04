import { validateSupabaseConfig } from "../src/services/supabaseConfig";

describe("validateSupabaseConfig", () => {
  it("acepta una URL y una clave publishable reales", () => {
    expect(validateSupabaseConfig(" https://abcd1234.supabase.co ", "sb_publishable_xyz")).toEqual({
      ok: true,
      config: { url: "https://abcd1234.supabase.co", key: "sb_publishable_xyz" },
    });
  });

  it("detecta variables faltantes", () => {
    const result = validateSupabaseConfig(undefined, "");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("EXPO_PUBLIC_SUPABASE_URL");
      expect(result.error).toContain("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }
  });

  it("detecta los valores de ejemplo del README (la causa de que la APK se cerrara)", () => {
    const result = validateSupabaseConfig("https://<project-ref>.supabase.co", "<publishable-key>");
    expect(result).toEqual({ ok: false, error: expect.stringContaining("valores de ejemplo") });
  });

  it("rechaza una URL inválida", () => {
    expect(validateSupabaseConfig("abcd1234.supabase.co", "sb_publishable_xyz").ok).toBe(false);
  });

  it("rechaza claves secretas", () => {
    expect(validateSupabaseConfig("https://abcd1234.supabase.co", "sb_secret_xyz")).toEqual({
      ok: false,
      error: expect.stringContaining("clave secreta"),
    });
  });
});
