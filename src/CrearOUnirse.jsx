import { useState } from "react";
import { crearMesa, unirseAMesa } from "./mesa";

export default function CrearOUnirse({ perfil, uid, onListo }) {
  const [modo, setModo] = useState(null); // "crear" | "unirse" | null
  const [ante, setAnte] = useState(20);
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleCrear() {
    setCargando(true);
    setError("");
    try {
      const codigoNuevo = await crearMesa({
        uid,
        alias: perfil.alias,
        avatarId: perfil.avatarId,
        ante: Number(ante),
      });
      onListo({ codigo: codigoNuevo, esAdmin: true });
    } catch (e) {
      setError("No se pudo crear la mesa. Intenta de nuevo.");
      setCargando(false);
    }
  }

  async function handleUnirse(e) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      await unirseAMesa({
        codigo,
        uid,
        alias: perfil.alias,
        avatarId: perfil.avatarId,
      });
      onListo({ codigo: codigo.toUpperCase(), esAdmin: false });
    } catch (e) {
      setError(e.message || "No se pudo unir a la mesa.");
      setCargando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B3D2E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif", padding: 16 }}>
      <div style={{ background: "#F7F3E8", borderRadius: 12, padding: 28, maxWidth: 380, width: "100%" }}>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#0B3D2E", marginTop: 0, textAlign: "center" }}>Mesa de 21</h2>

        {!modo && (
          <>
            <button
              onClick={() => setModo("crear")}
              style={{ width: "100%", padding: 14, borderRadius: 8, border: "none", background: "#C9A227", fontWeight: "bold", cursor: "pointer", marginBottom: 10 }}
            >
              Crear una mesa nueva
            </button>
            <button
              onClick={() => setModo("unirse")}
              style={{ width: "100%", padding: 14, borderRadius: 8, border: "2px solid #0B3D2E", background: "transparent", fontWeight: "bold", cursor: "pointer" }}
            >
              Unirme con un código
            </button>
          </>
        )}

        {modo === "crear" && (
          <>
            <p style={{ fontSize: 13, color: "#555" }}>Vas a ser el administrador de esta mesa.</p>
            <label style={{ fontSize: 13, color: "#0B3D2E", fontWeight: "bold" }}>Ante por ronda (fichas)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={ante}
              onChange={(e) => setAnte(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", margin: "8px 0 16px", boxSizing: "border-box" }}
            />
            <button
              onClick={handleCrear}
              disabled={cargando}
              style={{ width: "100%", padding: 14, borderRadius: 8, border: "none", background: "#C9A227", fontWeight: "bold", cursor: "pointer" }}
            >
              {cargando ? "Creando..." : "Crear mesa"}
            </button>
            <button onClick={() => setModo(null)} style={{ width: "100%", padding: 10, marginTop: 8, border: "none", background: "transparent", color: "#555", cursor: "pointer" }}>
              Volver
            </button>
          </>
        )}

        {modo === "unirse" && (
          <form onSubmit={handleUnirse}>
            <label style={{ fontSize: 13, color: "#0B3D2E", fontWeight: "bold" }}>Código de la mesa</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej. TIGRE9"
              maxLength={6}
              required
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", margin: "8px 0 16px", boxSizing: "border-box", textTransform: "uppercase" }}
            />
            <button
              type="submit"
              disabled={cargando}
              style={{ width: "100%", padding: 14, borderRadius: 8, border: "none", background: "#C9A227", fontWeight: "bold", cursor: "pointer" }}
            >
              {cargando ? "Uniendo..." : "Unirme"}
            </button>
            <button type="button" onClick={() => setModo(null)} style={{ width: "100%", padding: 10, marginTop: 8, border: "none", background: "transparent", color: "#555", cursor: "pointer" }}>
              Volver
            </button>
          </form>
        )}

        {error && <p style={{ color: "#B3432B", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
