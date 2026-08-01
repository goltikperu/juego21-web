import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const AVATARES = ["🂡", "🂱", "🃁", "🃑", "🎩", "🕶️", "🦁", "🐯"];

export default function PerfilForm({ uid, onListo }) {
  const [alias, setAlias] = useState("");
  const [avatarId, setAvatarId] = useState(AVATARES[0]);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    if (!alias.trim()) return;
    setGuardando(true);
    await setDoc(doc(db, "usuarios", uid), { alias: alias.trim(), avatarId }, { merge: true });
    onListo({ alias: alias.trim(), avatarId });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B3D2E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <form onSubmit={guardar} style={{ background: "#F7F3E8", borderRadius: 12, padding: 32, maxWidth: 360, width: "100%" }}>
        <h2 style={{ fontFamily: "Georgia, serif", color: "#0B3D2E", marginTop: 0 }}>Elige tu alias</h2>

        <input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Ej. ElTigre99"
          maxLength={16}
          required
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", marginBottom: 16, boxSizing: "border-box" }}
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
          {guardando ? "Guardando..." : "Empezar a jugar"}
        </button>
      </form>
    </div>
  );
}