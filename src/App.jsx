import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./Login";
import PerfilForm from "./PerfilForm";
import CrearOUnirse from "./CrearOUnirse";
import MesaEnVivo from "./MesaEnVivo";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mesa, setMesa] = useState(null); // { codigo, esAdmin }

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
  if (!mesa) {
    return <CrearOUnirse perfil={perfil} uid={usuario.uid} onListo={setMesa} />;
  }

  return <MesaEnVivo codigo={mesa.codigo} esAdmin={mesa.esAdmin} uid={usuario.uid} />;
}
