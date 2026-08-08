import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./Login";
import PerfilForm from "./PerfilForm";
import CrearOUnirse from "./CrearOUnirse";
import MesaEnVivo from "./MesaEnVivo";
import SuperAdminPanel from "./SuperAdminPanel";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mesa, setMesa] = useState(null); // { codigo, esAdmin }
  const [verSuperAdmin, setVerSuperAdmin] = useState(false);

  useEffect(() => {
    const quitar = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        const snap = await getDoc(doc(db, "usuarios", u.uid));
        setPerfil(snap.exists() ? snap.data() : null);
      } else {
        setPerfil(null);
      }
      setCargando(false);
    });
    return quitar;
  }, []);

  if (cargando) return null;
  if (!usuario) return <Login onEntrar={setUsuario} />;
  if (!perfil || !perfil.alias) {
    return (
      <PerfilForm
        uid={usuario.uid}
        onListo={(p) => setPerfil((prev) => ({ ...prev, ...p }))}
      />
    );
  }

  if (perfil.esSuperAdmin && verSuperAdmin) {
    return (
      <div>
        <div style={{ textAlign: "center", padding: "10px 0", background: "#0B3D2E" }}>
          <button
            onClick={() => setVerSuperAdmin(false)}
            style={{ background: "none", border: "none", color: "#C9A227", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
          >
            ← Volver al juego
          </button>
        </div>
        <SuperAdminPanel />
      </div>
    );
  }

  if (!mesa) {
    return (
      <>
        <CrearOUnirse perfil={perfil} uid={usuario.uid} onListo={setMesa} />
        {perfil.esSuperAdmin && (
          <div style={{ textAlign: "center", marginTop: -16, paddingBottom: 20 }}>
            <button
              onClick={() => setVerSuperAdmin(true)}
              style={{ background: "none", border: "none", color: "#C9A227", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
            >
              Ver panel de superadmin
            </button>
          </div>
        )}
      </>
    );
  }

  return <MesaEnVivo codigo={mesa.codigo} esAdmin={mesa.esAdmin} uid={usuario.uid} />;
}
