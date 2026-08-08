import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export default function SuperAdminPanel() {
  const [usuarios, setUsuarios] = useState(null);
  const [mesas, setMesas] = useState(null);
  const [vista, setVista] = useState("jugadores"); // "jugadores" | "mesas"

  useEffect(() => {
    async function cargar() {
      const [snapUsuarios, snapMesas] = await Promise.all([getDocs(collection(db, "usuarios")), getDocs(collection(db, "mesas"))]);
      setUsuarios(snapUsuarios.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setMesas(snapMesas.docs.map((d) => ({ codigo: d.id, ...d.data() })));
    }
    cargar();
  }, []);

  if (!usuarios || !mesas) {
    return <p style={{ color: "#F2EAD3", textAlign: "center", padding: 60, fontFamily: "Helvetica, Arial, sans-serif" }}>Cargando estadísticas...</p>;
  }

  const aliasPorUid = Object.fromEntries(usuarios.map((u) => [u.uid, u.alias || u.uid.slice(0, 6)]));

  const filasJugadores = usuarios
    .map((u) => {
      const stats = u.estadisticas?.juego21 || {};
      return {
        uid: u.uid,
        alias: u.alias || "(sin alias)",
        apostado: stats.totalApostado || 0,
        ganado: stats.totalGanado || 0,
        perdido: stats.totalPerdido || 0,
        partidasGanadas: stats.partidasGanadas || 0,
      };
    })
    .filter((f) => f.apostado > 0)
    .sort((a, b) => b.apostado - a.apostado);

  const filasMesas = mesas
    .map((m) => ({
      codigo: m.codigo,
      admin: aliasPorUid[m.creadorUid] || m.creadorUid?.slice(0, 6) || "?",
      ante: m.ante,
      totalMovido: m.totalFichasMovidas || 0,
      manosJugadas: m.manosJugadas || 0,
      jugadoresActuales: m.jugadores?.length || 0,
      fase: m.fase,
    }))
    .sort((a, b) => b.totalMovido - a.totalMovido);

  const totalGeneral = filasMesas.reduce((s, m) => s + m.totalMovido, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0B3D2E", padding: "20px 14px", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ color: "#F2EAD3", fontFamily: "Georgia, serif", textAlign: "center", marginBottom: 4 }}>Panel de Superadmin</h1>
        <p style={{ color: "#C9A227", textAlign: "center", fontSize: 13, marginBottom: 20 }}>
          Total de fichas movidas en toda la plataforma: <strong>{totalGeneral}</strong>
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
          <button
            onClick={() => setVista("jugadores")}
            style={botonTab(vista === "jugadores")}
          >
            Por jugador
          </button>
          <button
            onClick={() => setVista("mesas")}
            style={botonTab(vista === "mesas")}
          >
            Por mesa/admin
          </button>
        </div>

        {vista === "jugadores" && (
          <div style={{ background: "#F7F3E8", borderRadius: 10, overflow: "hidden" }}>
            <TablaHeader columnas={["Jugador", "Apostado", "Ganado", "Perdido", "Neto", "Manos ganadas"]} />
            {filasJugadores.map((f) => (
              <FilaTabla
                key={f.uid}
                valores={[f.alias, f.apostado, f.ganado, f.perdido, f.ganado - f.perdido, f.partidasGanadas]}
                destacarNeto={f.ganado - f.perdido}
              />
            ))}
            {filasJugadores.length === 0 && <p style={{ padding: 16, fontSize: 13, color: "#555" }}>Todavía no hay partidas jugadas.</p>}
          </div>
        )}

        {vista === "mesas" && (
          <div style={{ background: "#F7F3E8", borderRadius: 10, overflow: "hidden" }}>
            <TablaHeader columnas={["Código", "Admin", "Ante", "Total movido", "Manos", "Jugadores", "Estado"]} />
            {filasMesas.map((m) => (
              <FilaTabla key={m.codigo} valores={[m.codigo, m.admin, m.ante, m.totalMovido, m.manosJugadas, m.jugadoresActuales, m.fase]} />
            ))}
            {filasMesas.length === 0 && <p style={{ padding: 16, fontSize: 13, color: "#555" }}>Todavía no se ha creado ninguna mesa.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function botonTab(activo) {
  return {
    padding: "8px 16px",
    borderRadius: 8,
    border: activo ? "none" : "2px solid #C9A227",
    background: activo ? "#C9A227" : "transparent",
    color: activo ? "#0B3D2E" : "#F2EAD3",
    fontWeight: "bold",
    fontSize: 13,
    cursor: "pointer",
  };
}

function TablaHeader({ columnas }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columnas.length}, 1fr)`, background: "#0E4A38", padding: "8px 6px" }}>
      {columnas.map((c) => (
        <div key={c} style={{ color: "#F2EAD3", fontSize: 11, fontWeight: "bold", textAlign: "center" }}>{c}</div>
      ))}
    </div>
  );
}

function FilaTabla({ valores, destacarNeto }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${valores.length}, 1fr)`, padding: "8px 6px", borderBottom: "1px solid #ddd" }}>
      {valores.map((v, i) => {
        const esNeto = destacarNeto !== undefined && i === 4;
        const color = esNeto ? (destacarNeto >= 0 ? "#2E7D32" : "#B3432B") : "#0B3D2E";
        return (
          <div key={i} style={{ fontSize: 12, textAlign: "center", color, fontWeight: esNeto ? "bold" : "normal" }}>
            {v}
          </div>
        );
      })}
    </div>
  );
}
