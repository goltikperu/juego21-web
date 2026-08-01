import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

const PALO_KEYS = ["p", "c", "d", "t"];

function crearMazo() {
  const mazo = [];
  for (const palo of PALO_KEYS) {
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

function totalManoCartas(cartas) {
  return cartas.reduce((s, c) => s + valorCarta(c.v), 0);
}

export async function iniciarPartida({ codigo }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("La mesa ya no existe.");
    const datos = snap.data();
    const mazo = crearMazo();
    const jugadores = datos.jugadores.map((j) => ({
      ...j,
      nombre: j.alias,
      cartaAbierta: mazo.pop(),
      cartasCerradas: [],
      revelada: false,
      quebrado: false,
    }));
    tx.update(ref, {
      mazo,
      jugadores,
      fase: "pidiendo",
      turnoPidiendo: 0,
      turnoRevelando: null,
      pozo: datos.ante * jugadores.length,
      numRonda: (datos.numRonda || 0) + 1,
      ganadorIdx: null,
    });
  });
}

export async function pedirCartasCerradas({ codigo, cantidad }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data();
    if (datos.fase !== "pidiendo") return;
    const mazo = [...datos.mazo];
    const nuevasCerradas = [];
    for (let k = 0; k < cantidad; k++) nuevasCerradas.push(mazo.pop());
    const jugadores = datos.jugadores.map((j, i) =>
      i === datos.turnoPidiendo ? { ...j, cartasCerradas: nuevasCerradas } : j
    );
    const siguienteTurno = datos.turnoPidiendo + 1;
    if (siguienteTurno >= jugadores.length) {
      tx.update(ref, { mazo, jugadores, fase: "revelando", turnoPidiendo: null, turnoRevelando: 0 });
    } else {
      tx.update(ref, { mazo, jugadores, turnoPidiendo: siguienteTurno });
    }
  });
}

export async function revelarSiguiente({ codigo }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data();
    if (datos.fase !== "revelando") return;
    const idx = datos.turnoRevelando;
    const jugadores = datos.jugadores.map((j, i) => {
      if (i !== idx) return j;
      const total = totalManoCartas([j.cartaAbierta, ...j.cartasCerradas]);
      return { ...j, revelada: true, quebrado: total > 21 };
    });

    const siguiente = idx + 1;
    if (siguiente < jugadores.length) {
      tx.update(ref, { jugadores, turnoRevelando: siguiente });
      return;
    }

    const candidatos = jugadores
      .map((j, i) => ({ i, total: totalManoCartas([j.cartaAbierta, ...j.cartasCerradas]) }))
      .filter((c) => c.total <= 21);
    let ganadorIdx = -1;
    if (candidatos.length > 0) {
      candidatos.sort((a, b) => b.total - a.total);
      ganadorIdx = candidatos[0].i;
    }
    const jugadoresFinal = jugadores.map((j, i) => ({
      ...j,
      saldo: i === ganadorIdx ? j.saldo - datos.ante + datos.pozo : j.saldo - datos.ante,
    }));
    tx.update(ref, { jugadores: jugadoresFinal, fase: "resultado", ganadorIdx, turnoRevelando: null });
  });
}

export async function siguienteRonda({ codigo }) {
  await iniciarPartida({ codigo });
}
