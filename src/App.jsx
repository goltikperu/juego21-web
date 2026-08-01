import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./Login";
import PerfilForm from "./PerfilForm";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

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

  return <Juego21 />;
}

const PALO = { p: "♠", c: "♥", d: "♦", t: "♣" };
const ROJOS = new Set(["c", "d"]);
const NOMBRES = ["Jugador 1", "Jugador 2", "Jugador 3", "Jugador 4", "Jugador 5"];
const AVATARES = ["🂡", "🂱", "🃁", "🃑", "🎩", "🕶️", "🦁", "🐯"];
const ANTE = 20;
const MAX_CARTAS_EXTRA = 4;

const FRASES_RESPALDO = {
  reparto: [
    "Una carta abierta para cada quien. Ahora decidan cuántas más quieren.",
    "Ahí va la primera carta. El resto se lo piden ustedes.",
  ],
  pidiendo: [
    "Bien, cartas cerradas al que las pidió.",
    "Nadie ve esas cartas todavía. Paciencia.",
  ],
  revelar_pasado: ["Se pasó de 21. Esa mano queda fuera.", "Demasiadas cartas. Ahí quedó."],
  revelar_ok: ["Mano sólida esa.", "Se guarda bien esa jugada."],
  resultado: ["La mesa tiene ganador.", "Se reparte el pozo. Siguiente mano cuando quieran."],
};

function crearMazo() {
  const mazo = [];
  for (const palo of Object.keys(PALO)) {
    for (let v = 1; v <= 13; v++) {
      mazo.push({ palo, v });
    }
  }
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

function valorCarta(v) {
  if (v === 1) return 11;
  if (v >= 11) return 10;
  return v;
}

function etiquetaCarta(v) {
  if (v === 1) return "A";
  if (v === 11) return "J";
  if (v === 12) return "Q";
  if (v === 13) return "K";
  return String(v);
}

function totalMano(mano) {
  return mano.reduce((s, c) => s + valorCarta(c.v), 0);
}

function manoCompleta(j) {
  return [j.cartaAbierta, ...j.cartasCerradas];
}

function nuevaRonda(saldos, numRondaAnterior) {
  const mazo = crearMazo();
  const jugadores = NOMBRES.map((nombre, i) => ({
    nombre,
    avatarId: AVATARES[i % AVATARES.length],
    cartaAbierta: mazo.pop(),
    cartasCerradas: [],
    saldo: saldos[i],
    revelada: false,
    quebrado: false,
  }));
  return {
    mazo,
    jugadores,
    fase: "pidiendo",
    turnoPidiendo: 0,
    turnoRevelando: null,
    pozo: ANTE * 5,
    numRonda: (numRondaAnterior || 0) + 1,
    ganadorIdx: null,
  };
}

async function pedirComentario(prompt, respaldoLista) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content:
              "Eres el crupier de una mesa de 21 entre amigos, con fichas virtuales. Hablas en español, tono relajado y con carácter, como un anfitrión de casino casero. " +
              "Responde con UNA sola frase corta (máximo 15 palabras), sin comillas, sin markdown, sin emojis. Situación: " +
              prompt,
          },
        ],
      }),
    });
    const data = await response.json();
    const texto = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join(" ")
      .trim();
    if (!texto) throw new Error("respuesta vacía");
    return texto.replace(/^"|"$/g, "");
  } catch (e) {
    const lista = respaldoLista;
    return lista[Math.floor(Math.random() * lista.length)];
  }
}

function EstilosAnimacion() {
  return (
    <style>{`
      @keyframes repartirCarta {
        0% { opacity: 0; transform: scale(0.25) translateY(-60px); }
        70% { opacity: 1; transform: scale(1.08) translateY(4px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes caerConfeti {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(105vh) rotate(540deg); opacity: 0.9; }
      }
      @keyframes aplaudir {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
    `}</style>
  );
}

const COLORES_CONFETI = ["#C9A227", "#F2EAD3", "#2E7D32", "#B3432B", "#0E4A38"];

function Confeti() {
  const piezas = Array.from({ length: 26 }, (_, i) => ({
    izquierda: Math.random() * 100,
    retraso: Math.random() * 0.6,
    duracion: 1.8 + Math.random() * 1.2,
    color: COLORES_CONFETI[i % COLORES_CONFETI.length],
    giro: Math.random() * 360,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
      {piezas.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.izquierda + "%",
            top: 0,
            width: 8,
            height: 12,
            background: p.color,
            transform: `rotate(${p.giro}deg)`,
            animation: `caerConfeti ${p.duracion}s ease-in ${p.retraso}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function Crupier({ hablando, frase, repartiendo, celebrando }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "#C9A227",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "2px solid #F2EAD3",
          transform: repartiendo ? "rotate(-8deg) scale(1.05)" : "rotate(0deg) scale(1)",
          transition: "transform 220ms ease",
          animation: celebrando ? "aplaudir 550ms ease-in-out 3" : "none",
        }}
      >
        {celebrando ? (
          <span style={{ fontSize: 20 }}>👏</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20 C4 14, 8 10, 12 10 C16 10, 20 14, 20 20"
              stroke="#0B3D2E"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="6" r="4" fill="#0B3D2E" />
          </svg>
        )}
      </div>
      <div
        style={{
          background: "#F7F3E8",
          borderRadius: 12,
          borderTopLeftRadius: 2,
          padding: "8px 12px",
          maxWidth: 460,
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 12,
          color: "#0B3D2E",
          minHeight: 20,
        }}
      >
        {hablando ? "El crupier está pensando..." : frase || "Bienvenidos a la mesa. Reparto la carta abierta a todos."}
      </div>
    </div>
  );
}

function Carta({ carta, oculta }) {
  const estiloBase = {
    width: "clamp(28px, 9.5vw, 48px)",
    height: "clamp(40px, 13.5vw, 68px)",
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "clamp(12px, 3.1vw, 20px)",
    fontFamily: "Georgia, serif",
    fontWeight: "bold",
    animation: "repartirCarta 380ms ease-out",
    boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
  };
  if (oculta) {
    return (
      <div
        style={{
          ...estiloBase,
          background: "repeating-linear-gradient(45deg, #0E4A38, #0E4A38 6px, #0B3D2E 6px, #0B3D2E 12px)",
          border: "2px solid #C9A227",
        }}
      />
    );
  }
  return (
    <div style={{ ...estiloBase, background: "#fff", border: "1px solid #999", color: ROJOS.has(carta.palo) ? "#B3432B" : "#222" }}>
      {etiquetaCarta(carta.v)}{PALO[carta.palo]}
    </div>
  );
}

function Juego21() {
  const saldosIniciales = [500, 500, 500, 500, 500];
  const [estado, setEstado] = useState(() => nuevaRonda(saldosIniciales));
  const [historial, setHistorial] = useState([]);
  const [fraseCrupier, setFraseCrupier] = useState("");
  const [pensando, setPensando] = useState(false);
  const [repartiendo, setRepartiendo] = useState(false);
  const [segundosParaSiguiente, setSegundosParaSiguiente] = useState(null);
  const [cantidadElegida, setCantidadElegida] = useState(0);
  const rondaId = useRef(0);

  useEffect(() => {
    rondaId.current += 1;
    const idAlIniciar = rondaId.current;
    setRepartiendo(true);
    setPensando(true);
    setCantidadElegida(0);
    setTimeout(() => setRepartiendo(false), 500);
    pedirComentario(
      "Se acaba de repartir una carta abierta a 5 jugadores, el pozo tiene " + estado.pozo + " fichas.",
      FRASES_RESPALDO.reparto
    ).then((f) => {
      if (rondaId.current === idAlIniciar) {
        setFraseCrupier(f);
        setPensando(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.numRonda]);

  useEffect(() => {
    if (estado.fase !== "resultado") {
      setSegundosParaSiguiente(null);
      return;
    }
    setSegundosParaSiguiente(6);
    const intervalo = setInterval(() => {
      setSegundosParaSiguiente((s) => {
        if (s === null) return s;
        if (s <= 1) {
          clearInterval(intervalo);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [estado.fase, estado.numRonda]);

  useEffect(() => {
    if (estado.fase === "resultado" && segundosParaSiguiente === 0) {
      const saldos = estado.jugadores.map((j) => j.saldo);
      setEstado(nuevaRonda(saldos, estado.numRonda));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosParaSiguiente]);

  function confirmarCantidad() {
    if (estado.fase !== "pidiendo") return;
    const mazo = [...estado.mazo];
    const nuevasCerradas = [];
    for (let k = 0; k < cantidadElegida; k++) nuevasCerradas.push(mazo.pop());

    const jugadores = estado.jugadores.map((j, i) =>
      i === estado.turnoPidiendo ? { ...j, cartasCerradas: nuevasCerradas } : j
    );

    setRepartiendo(true);
    setTimeout(() => setRepartiendo(false), 400);

    const siguienteTurno = estado.turnoPidiendo + 1;
    setCantidadElegida(0);

    if (siguienteTurno >= jugadores.length) {
      setPensando(true);
      pedirComentario("Todos los jugadores ya pidieron sus cartas cerradas. Empieza la revelación.", FRASES_RESPALDO.pidiendo).then((f) => {
        setFraseCrupier(f);
        setPensando(false);
      });
      setEstado({ ...estado, mazo, jugadores, fase: "revelando", turnoPidiendo: null, turnoRevelando: 0 });
    } else {
      setEstado({ ...estado, mazo, jugadores, turnoPidiendo: siguienteTurno });
    }
  }

  function revelarSiguiente() {
    if (estado.fase !== "revelando") return;
    const idx = estado.turnoRevelando;
    const jugadores = estado.jugadores.map((j, i) => {
      if (i !== idx) return j;
      const total = totalMano(manoCompleta(j));
      return { ...j, revelada: true, quebrado: total > 21 };
    });

    const jugadorRevelado = jugadores[idx];
    const total = totalMano(manoCompleta(jugadorRevelado));
    setPensando(true);
    const desc = jugadorRevelado.quebrado
      ? jugadorRevelado.nombre + " se pasó de 21 con " + total + " puntos."
      : jugadorRevelado.nombre + " se destapa con " + total + " puntos.";
    pedirComentario(desc, jugadorRevelado.quebrado ? FRASES_RESPALDO.revelar_pasado : FRASES_RESPALDO.revelar_ok).then((f) => {
      setFraseCrupier(f);
      setPensando(false);
    });

    const siguiente = idx + 1;
    if (siguiente >= jugadores.length) {
      cerrarRonda({ ...estado, jugadores });
    } else {
      setEstado({ ...estado, jugadores, turnoRevelando: siguiente });
    }
  }

  function cerrarRonda(base) {
    const candidatos = base.jugadores
      .map((j, i) => ({ i, total: totalMano(manoCompleta(j)) }))
      .filter((c) => c.total <= 21);

    let ganadorIdx = -1;
    if (candidatos.length > 0) {
      candidatos.sort((a, b) => b.total - a.total);
      ganadorIdx = candidatos[0].i;
    }

    const jugadores = base.jugadores.map((j, i) => {
      if (i === ganadorIdx) {
        return { ...j, saldo: j.saldo - ANTE + base.pozo };
      }
      return { ...j, saldo: j.saldo - ANTE };
    });

    setHistorial((h) => [
      {
        ganador: ganadorIdx === -1 ? "Nadie (todos se pasaron)" : NOMBRES[ganadorIdx],
        pozo: base.pozo,
      },
      ...h,
    ]);

    setPensando(true);
    const descripcion =
      ganadorIdx === -1
        ? "Terminó la mano y todos los jugadores se pasaron de 21, nadie ganó el pozo de " + base.pozo + " fichas."
        : NOMBRES[ganadorIdx] + " ganó la mano y se lleva el pozo de " + base.pozo + " fichas.";
    pedirComentario(descripcion, FRASES_RESPALDO.resultado).then((f) => {
      setFraseCrupier(f);
      setPensando(false);
    });

    setEstado({ ...base, jugadores, fase: "resultado", ganadorIdx, turnoRevelando: null });
  }

  function siguienteRonda() {
    const saldos = estado.jugadores.map((j) => j.saldo);
    setEstado(nuevaRonda(saldos, estado.numRonda));
  }

  function reiniciarTodo() {
    setHistorial([]);
    setEstado(nuevaRonda(saldosIniciales, estado.numRonda));
  }

  const jugadorPidiendo = estado.fase === "pidiendo" ? estado.jugadores[estado.turnoPidiendo] : null;
  const jugadorRevelando = estado.fase === "revelando" ? estado.jugadores[estado.turnoRevelando] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0B3D2E", padding: "12px 10px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <EstilosAnimacion />
      {estado.fase === "resultado" && estado.ganadorIdx !== -1 && <Confeti key={estado.numRonda} />}
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ color: "#F2EAD3", fontSize: "clamp(20px, 6vw, 30px)", letterSpacing: 1, margin: 0 }}>Mesa de 21</h1>
          <p style={{ color: "#C9A227", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 13, marginTop: 4 }}>
            5 jugadores · ante {ANTE} fichas · carta abierta + cartas cerradas a pedido · As vale 11
          </p>
        </div>

        <Crupier
          hablando={pensando}
          frase={fraseCrupier}
          repartiendo={repartiendo}
          celebrando={estado.fase === "resultado" && estado.ganadorIdx !== -1}
        />

        <div style={{ background: "#0E4A38", border: "2px solid #C9A227", borderRadius: 999, padding: "10px 20px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 18 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#C9A227", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, letterSpacing: 2 }}>POZO</div>
            <div style={{ color: "#F2EAD3", fontSize: "clamp(22px, 6vw, 34px)", fontWeight: "bold" }}>{estado.pozo}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 20 }} className="grilla-jugadores">
          <style>{`
            @media (min-width: 640px) {
              .grilla-jugadores { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)) !important; gap: 12px !important; }
              .grilla-jugadores .tarjeta-jugador-5 { grid-column: auto !important; }
            }
          `}</style>
          {estado.jugadores.map((j, i) => {
            const esTurnoPidiendo = estado.fase === "pidiendo" && i === estado.turnoPidiendo;
            const esTurnoRevelando = estado.fase === "revelando" && i === estado.turnoRevelando;
            const esGanador = estado.fase === "resultado" && i === estado.ganadorIdx;
            const totalVisible = j.revelada || estado.fase === "resultado" ? totalMano(manoCompleta(j)) : null;
            return (
              <div
                key={j.nombre}
                className={i === 4 ? "tarjeta-jugador-5" : ""}
                style={{
                  background: "#F7F3E8",
                  borderRadius: 10,
                  padding: "6px 4px",
                  border: esTurnoPidiendo || esTurnoRevelando ? "3px solid #C9A227" : esGanador ? "3px solid #2E7D32" : "3px solid transparent",
                  gridColumn: i === 4 ? "2 / 4" : "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Helvetica, Arial, sans-serif" }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#0E4A38",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {j.avatarId}
                  </span>
                  <span style={{ fontWeight: "bold", fontSize: 9, color: "#0B3D2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.nombre}</span>
                  {esGanador && <span style={{ fontSize: 9, color: "#2E7D32", fontWeight: "bold", marginLeft: "auto" }}>🏆</span>}
                </div>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", margin: "6px 0" }}>
                  <Carta carta={j.cartaAbierta} oculta={false} />
                  {j.cartasCerradas.map((c, ci) => (
                    <Carta key={ci} carta={c} oculta={!j.revelada && estado.fase !== "resultado"} />
                  ))}
                </div>
                <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 9, color: "#555" }}>
                  Total: <strong style={{ color: j.quebrado ? "#B3432B" : "#0B3D2E" }}>
                    {totalVisible === null ? "?" : totalVisible}{j.quebrado && (j.revelada || estado.fase === "resultado") ? " (pasado)" : ""}
                  </strong>
                </div>
                <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 9, color: "#555" }}>
                  Saldo: <strong>{j.saldo}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {estado.fase === "pidiendo" && jugadorPidiendo && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#F2EAD3", fontFamily: "Helvetica, Arial, sans-serif", marginBottom: 12 }}>
              <strong>{jugadorPidiendo.nombre}</strong>, ¿cuántas cartas cerradas quieres?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14 }}>
              {Array.from({ length: MAX_CARTAS_EXTRA + 1 }, (_, n) => n).map((n) => (
                <button
                  key={n}
                  onClick={() => setCantidadElegida(n)}
                  style={botonEstilo(cantidadElegida === n ? "#C9A227" : "transparent", cantidadElegida === n ? "#0B3D2E" : "#F2EAD3", "2px solid #C9A227")}
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={confirmarCantidad} style={botonEstilo("#C9A227", "#0B3D2E")}>Confirmar</button>
          </div>
        )}

        {estado.fase === "revelando" && jugadorRevelando && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#F2EAD3", fontFamily: "Helvetica, Arial, sans-serif", marginBottom: 12 }}>
              Turno de destapar: <strong>{jugadorRevelando.nombre}</strong>
            </p>
            <button onClick={revelarSiguiente} style={botonEstilo("#C9A227", "#0B3D2E")}>Destapar cartas</button>
          </div>
        )}

        {estado.fase === "resultado" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#F2EAD3", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 15, marginBottom: 14 }}>
              {estado.ganadorIdx === -1
                ? "Todos se pasaron de 21. Nadie se lleva el pozo esta mano."
                : `${NOMBRES[estado.ganadorIdx]} se lleva el pozo de ${estado.pozo} fichas.`}
            </p>
            <p style={{ color: "#C9A227", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 13, marginBottom: 12 }}>
              Nueva mano en {segundosParaSiguiente ?? 6} segundos...
            </p>
            <button onClick={siguienteRonda} style={botonEstilo("#C9A227", "#0B3D2E")}>Empezar ya</button>
            <button onClick={reiniciarTodo} style={botonEstilo("transparent", "#F2EAD3", "2px solid #F2EAD3")}>Reiniciar saldos</button>
          </div>
        )}

        {historial.length > 0 && (
          <div style={{ marginTop: 28, fontFamily: "Helvetica, Arial, sans-serif" }}>
            <h3 style={{ color: "#C9A227", fontSize: 14, letterSpacing: 1 }}>Historial de manos</h3>
            <ul style={{ color: "#F2EAD3", fontSize: 13, paddingLeft: 18 }}>
              {historial.map((h, i) => (
                <li key={i}>{h.ganador} ganó {h.pozo} fichas</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function botonEstilo(bg, color, border) {
  return {
    background: bg,
    color,
    border: border || "none",
    borderRadius: 8,
    padding: "10px 20px",
    margin: "0 6px",
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSize: 14,
    fontWeight: "bold",
    cursor: "pointer",
  };
}
