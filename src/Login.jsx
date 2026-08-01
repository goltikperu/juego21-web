import { useState, useEffect } from "react";
import { entrarConGoogle, enviarLinkPorCorreo, completarLoginPorLink } from "./auth";

export default function Login({ onEntrar }) {
  const [correo, setCorreo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(true);

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

  async function conCorreo(e) {
    e.preventDefault();
    await enviarLinkPorCorreo(correo);
    setEnviado(true);
  }

  if (cargando) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0B3D2E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Helvetica, Arial, sans-serif" }}>
      <div style={{ background: "#F7F3E8", borderRadius: 12, padding: 32, maxWidth: 360, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", color: "#0B3D2E" }}>Mesa de 21</h1>

        <button onClick={conGoogle} style={{ width: "100%", padding: 12, marginTop: 16, borderRadius: 8, border: "none", background: "#C9A227", fontWeight: "bold", cursor: "pointer" }}>
          Entrar con Google
        </button>

        <p style={{ margin: "16px 0 8px", color: "#555", fontSize: 13 }}>o con tu correo</p>

        {enviado ? (
          <p style={{ color: "#0B3D2E", fontSize: 14 }}>Te mandamos un link a {correo}. Ábrelo desde este celular para entrar.</p>
        ) : (
          <form onSubmit={conCorreo}>
            <input
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #999", marginBottom: 8, boxSizing: "border-box" }}
            />
            <button type="submit" style={{ width: "100%", padding: 12, borderRadius: 8, border: "2px solid #0B3D2E", background: "transparent", cursor: "pointer" }}>
              Enviarme un link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}