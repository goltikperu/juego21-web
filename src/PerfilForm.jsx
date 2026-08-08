import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const AVATARES = ["🂡", "🂱", "🃁", "🃑", "🎩", "🕶️", "🦁", "🐯"];

export default function PerfilForm({ uid, onListo, onCancelar, valoresIniciales }) {
  const esEdicion = Boolean(valoresIniciales);
  const [alias, setAlias] = useState(valoresIniciales?.alias || "");
  const [celular, setCelular] = useState(valoresIniciales?.celular || "");
  const [telefono, setTelefono] = useState(valoresIniciales?.telefono || "");
  const [avatarId, setAvatarId] = useState(valoresIniciales?.avatarId || AVATARES[0]);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    if (!alias.trim()) return;
    setGuardando(true);
    await setDoc(
      doc(db, "usuarios", uid),
      {
        alias: alias.trim(),
        avatarId,
        celular: celular.trim(),
        telefono: telefono.trim(),
      },
      { merge: true }
    );
    onListo({ alias: alias.trim(), avatarId, celular: celular.trim(), telefono: telefono.trim() });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B3D2E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <form onSubmit={guardar} style={{ background: "#F7F3E8", borderRadius: 12, padding: 32, maxWidth: 360, width: "100%" }}>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#0B3D2E", marginTop: 0 }}>{esEdicion ? "Editar mi perfil" : "Elige tu alias"}</h2>

        <input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Ej. ElTigre99"
          maxLength={16}
          required
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", marginBottom: 16, boxSizing: "border-box" }}
        />

        <label style={{ fontSize: 13, color: "#0B3D2E", fontWeight: "bold" }}>Celular</label>
        <input
          type="tel"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          placeholder="Ej. 987654321"
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", margin: "6px 0 16px", boxSizing: "border-box" }}
        />

        <label style={{ fontSize: 13, color: "#0B3D2E", fontWeight: "bold" }}>Teléfono</label>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej. 014567890"
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", margin: "6px 0 20px", boxSizing: "border-box" }}
        />

        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>Elige tu avatar</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {AVATARES.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatarId(a)}
              style={{
                fontSize: 28,
                padding: 10,
                borderRadius: 8,
                border: avatarId === a ? "3px solid #C9A227" : "2px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {a}
            </button>
          ))}
        </div>

        <button type="submit" disabled={guardando} style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "#C9A227", fontWeight: "bold", cursor: "pointer" }}>
          {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Empezar a jugar"}
        </button>

        {esEdicion && (
          <button
            type="button"
            onClick={onCancelar}
            style={{ width: "100%", padding: 10, marginTop: 8, border: "none", background: "transparent", color: "#555", cursor: "pointer" }}
          >
            Cancelar
          </button>
        )}
      </form>
    </div>
  );
}
