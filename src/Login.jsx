import { useState, useEffect } from "react";
import {
  entrarConGoogle,
  enviarLinkPorCorreo,
  completarLoginPorLink,
  entrarConContrasena,
  crearCuentaConContrasena,
} from "./auth";

export default function Login({ onEntrar }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    completarLoginPorLink().then((usuario) => {
      if (usuario) onEntrar(usuario);
      setCargando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function conGoogle() {
    const usuario = await entrarConGoogle();
    onEntrar(usuario);
  }

  async function conLinkDeCorreo(e) {
    e.preventDefault();
    await enviarLinkPorCorreo(correo);
    setEnviado(true);
  }

  async function conContrasena(e) {
    e.preventDefault();
    setError("");
    setProcesando(true);
    try {
      const usuario = modoRegistro
        ? await crearCuentaConContrasena(correo, contrasena)
        : await entrarConContrasena(correo, contrasena);
      onEntrar(usuario);
    } catch (err) {
      setError(traducirError(err.code));
      setProcesando(false);
    }
  }

  function traducirError(code) {
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "Correo o contraseña incorrectos.";
    if (code === "auth/email-already-in-use") return "Ese correo ya tiene una cuenta con contraseña. Intenta entrar en vez de registrarte.";
    if (code === "auth/weak-password") return "La contraseña debe tener al menos 6 caracteres.";
    if (code === "auth/user-not-found") return "No existe una cuenta con ese correo. Regístrate primero.";
    return "Ocurrió un error. Intenta de nuevo.";
  }

  if (cargando) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0B3D2E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ background: "#F7F3E8", borderRadius: 12, padding: 32, maxWidth: 360, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", color: "#0B3D2E" }}>Mesa de 21</h1>

        <button onClick={conGoogle} style={{ width: "100%", padding: 12, marginTop: 16, borderRadius: 8, border: "none", background: "#C9A227", fontWeight: "bold", cursor: "pointer" }}>
          Entrar con Google
        </button>

        <p style={{ margin: "20px 0 10px", color: "#555", fontSize: 13 }}>o con correo y contraseña</p>

        <form onSubmit={conContrasena}>
          <input
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", marginBottom: 8, boxSizing: "border-box" }}
          />
          <input
            type="password"
            required
            minLength={6}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Contraseña"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", marginBottom: 8, boxSizing: "border-box" }}
          />
          <button
            type="submit"
            disabled={procesando}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: "#0B3D2E", color: "#F2EAD3", fontWeight: "bold", cursor: "pointer" }}
          >
            {procesando ? "..." : modoRegistro ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        <button
          onClick={() => { setModoRegistro((m) => !m); setError(""); }}
          style={{ background: "none", border: "none", color: "#0B3D2E", fontSize: 12, textDecoration: "underline", cursor: "pointer", marginTop: 8 }}
        >
          {modoRegistro ? "Ya tengo cuenta, quiero entrar" : "No tengo cuenta, quiero crear una"}
        </button>

        {error && <p style={{ color: "#B3432B", fontSize: 13, marginTop: 8 }}>{error}</p>}

        <p style={{ margin: "18px 0 8px", color: "#555", fontSize: 13 }}>o recibe un link sin contraseña</p>

        {enviado ? (
          <p style={{ color: "#0B3D2E", fontSize: 14 }}>Te mandamos un link a {correo}. Ábrelo desde este celular para entrar.</p>
        ) : (
          <button
            onClick={conLinkDeCorreo}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "2px solid #0B3D2E", background: "transparent", cursor: "pointer" }}
          >
            Enviarme un link a {correo || "mi correo"}
          </button>
        )}
      </div>
    </div>
  );
}
