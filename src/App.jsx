import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./Login";
import PerfilForm from "./PerfilForm";
import CrearOUnirse from "./CrearOUnirse";

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
    return (
      <CrearOUnirse
        perfil={perfil}
        uid={usuario.uid}
        onListo={(m) => setMesa(m)}
      />
    );
  }

  return <Juego21 esAdmin={mesa.esAdmin} codigo={mesa.codigo} />;
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
      @keyframes parpadeo {
        0%, 92%, 100% { transform: scaleY(1); }
        96% { transform: scaleY(0.08); }
      }
      @keyframes abanicoCartas {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(5deg); }
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

function CrupierIlustrada({ celebrando, tamano }) {
  const boca = celebrando
    ? "M296 274 Q340 316 384 274 Q368 300 340 302 Q312 300 296 274 Z"
    : "M304 278 Q340 305 376 278 Q365 292 340 294 Q315 292 304 278 Z";
  return (
    <svg width={tamano} height={tamano * (460 / 680)} viewBox="0 0 680 460" style={{ flexShrink: 0, overflow: "visible" }}>
      <defs>
        <clipPath id="marcoCrupier"><circle cx="340" cy="200" r="150" /></clipPath>
      </defs>

      <circle cx="340" cy="200" r="158" fill="#0E4A38" />
      <circle cx="340" cy="200" r="150" fill="#F2EAD3" />

      <g clipPath="url(#marcoCrupier)">
        <rect x="190" y="60" width="300" height="340" fill="#F7E4C9" />
        <path d="M225 250 C225 150 275 90 340 90 C405 90 455 150 455 250 L455 400 L225 400 Z" fill="#3B2A20" />
        <path d="M240 200 C240 130 285 105 340 105 C395 105 440 130 440 200 L440 230 C440 190 400 170 340 170 C280 170 240 190 240 230 Z" fill="#2E2018" />

        <ellipse cx="340" cy="245" rx="78" ry="90" fill="#E8B98C" />

        <g style={{ transformOrigin: "308px 235px", animation: "parpadeo 4.5s ease-in-out infinite" }}>
          <ellipse cx="308" cy="240" rx="9" ry="12" fill="#3B2A20" />
        </g>
        <g style={{ transformOrigin: "372px 235px", animation: "parpadeo 4.5s ease-in-out infinite" }}>
          <ellipse cx="372" cy="240" rx="9" ry="12" fill="#3B2A20" />
        </g>

        <path d="M296 226 Q308 218 320 226" fill="none" stroke="#2E2018" strokeWidth="3" strokeLinecap="round" />
        <path d="M360 226 Q372 218 384 226" fill="none" stroke="#2E2018" strokeWidth="3" strokeLinecap="round" />
        <path d="M330 250 Q340 262 350 250" fill="none" stroke="#C98A5E" strokeWidth="2.5" strokeLinecap="round" />

        <path d={boca} fill="#B3432B" />

        <circle cx="284" cy="270" r="16" fill="#E8956B" opacity={celebrando ? 0.75 : 0.55} />
        <circle cx="396" cy="270" r="16" fill="#E8956B" opacity={celebrando ? 0.75 : 0.55} />

        <rect x="248" y="330" width="184" height="70" fill="#F2EAD3" />
        <path d="M248 330 L340 355 L432 330 L432 400 L248 400 Z" fill="#0B3D2E" />
        <path d="M320 336 L340 358 L360 336 L352 330 L340 344 L328 330 Z" fill="#111" />
        <rect x="332" y="332" width="16" height="30" fill="#111" />

        <rect x="230" y="340" width="220" height="60" fill="#0E4A38" />
        <rect x="230" y="340" width="220" height="10" fill="#C9A227" />
      </g>

      <circle cx="340" cy="200" r="150" fill="none" stroke="#C9A227" strokeWidth="4" />

      <g style={{ transformOrigin: "460px 355px", animation: "abanicoCartas 2.6s ease-in-out infinite" }}>
        <g transform="translate(430,330) rotate(-18)">
          <rect x="0" y="0" width="46" height="64" rx="4" fill="#fff" stroke="#999" strokeWidth="1.5" />
          <text x="8" y="20" fontSize="18" fontFamily="Georgia, serif" fontWeight="bold" fill="#B3432B">A♥</text>
        </g>
        <g transform="translate(452,340) rotate(-6)">
          <rect x="0" y="0" width="46" height="64" rx="4" fill="#fff" stroke="#999" strokeWidth="1.5" />
          <text x="8" y="20" fontSize="18" fontFamily="Georgia, serif" fontWeight="bold" fill="#222">K♠</text>
        </g>
        <g transform="translate(468,352) rotate(8)">
          <rect x="0" y="0" width="46" height="64" rx="4" fill="#fff" stroke="#999" strokeWidth="1.5" />
          <text x="8" y="20" fontSize="18" fontFamily="Georgia, serif" fontWeight="bold" fill="#B3432B">Q♦</text>
        </g>
      </g>
    </svg>
  );
}

function Crupier({ hablando, frase, repartiendo, celebrando }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div
        style={{
          transform: repartiendo ? "scale(1.05)" : "scale(1)",
          transition: "transform 220ms ease",
          animation: celebrando ? "aplaudir 550ms ease-in-out 3" : "none",
        }}
      >
        <CrupierIlustrada celebrando={celebrando} tamano={72} />
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
    height: "clamp(30px, 10vw, 51px)",
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

function TarjetaJugador({ j, ancho, esResaltada, esGanador, totalVisible, faseResultado }) {
  return (
    <div
      style={{
        width: ancho,
        flexShrink: 0,
        background: "#F7F3E8",
        borderRadius: 10,
        padding: "4px 4px",
        border: esResaltada ? "3px solid #C9A227" : esGanador ? "3px solid #2E7D32" : "3px solid transparent",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "Helvetica, Arial, sans-serif" }}>
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
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap", margin: "4px 0" }}>
        <Carta carta={j.cartaAbierta} oculta={false} />
        {j.cartasCerradas.map((c, ci) => (
          <Carta key={ci} carta={c} oculta={!j.revelada && !faseResultado} />
        ))}
      </div>
      <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, color: "#0B3D2E", fontWeight: "bold" }}>
        Total: {totalVisible === null ? "?" : totalVisible}{j.quebrado && (j.revelada || faseResultado) ? " (pasado)" : ""}
      </div>
      <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 12, color: "#0B3D2E", fontWeight: "bold" }}>
        Saldo: {j.saldo}
      </div>
    </div>
  );
}

const GAP_JUGADORES = 6;

function FilaJugadores({ jugadores, estado }) {
  const primeraFila = jugadores.slice(0, 4);
  const quinto = jugadores[4];
  const anchoTarjeta = `calc((100% - ${GAP_JUGADORES * 3}px) / 4)`;

  function props(j, i) {
    const totalVisible = j.revelada || estado.fase === "resultado" ? totalMano(manoCompleta(j)) : null;
    return {
      j,
      ancho: anchoTarjeta,
      esResaltada: (estado.fase === "pidiendo" && i === estado.turnoPidiendo) || (estado.fase === "revelando" && i === estado.turnoRevelando),
      esGanador: estado.fase === "resultado" && i === estado.ganadorIdx,
      totalVisible,
      faseResultado: estado.fase === "resultado",
    };
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: GAP_JUGADORES }}>
        {primeraFila.map((j, i) => (
          <TarjetaJugador key={j.nombre} {...props(j, i)} />
        ))}
      </div>
      {quinto && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: GAP_JUGADORES }}>
          <TarjetaJugador {...props(quinto, 4)} />
        </div>
      )}
    </div>
  );
}

function Juego21({ esAdmin, codigo }) {

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

        <FilaJugadores
          jugadores={estado.jugadores}
          estado={estado}
        />

        <div style={{ textAlign: "center", marginBottom: 10, fontFamily: "Helvetica, Arial, sans-serif" }}>
          <span style={{ color: "#C9A227", fontSize: 12 }}>Mesa {codigo} · </span>
          <span style={{ color: "#F2EAD3", fontSize: 12, fontWeight: "bold" }}>{esAdmin ? "Eres el administrador" : "Jugador"}</span>
        </div>

        {estado.fase === "pidiendo" && jugadorPidiendo && (
          esAdmin ? (
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
          ) : (
            <p style={{ color: "#C9A227", fontFamily: "Helvetica, Arial, sans-serif", textAlign: "center", fontSize: 13 }}>
              Esperando a que el administrador reparta las cartas de {jugadorPidiendo.nombre}...
            </p>
          )
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
