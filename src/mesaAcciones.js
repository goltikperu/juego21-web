import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

function valorCarta(v) {
  if (v === "A") return 11;
  if (["J", "Q", "K", "10"].includes(v)) return 10;
  return Number(v);
}

function totalManoCartas(cartas) {
  return cartas.reduce((s, c) => s + valorCarta(c.valor), 0);
}

// El admin le da "Iniciar partida": limpia las manos y deja la mesa
// esperando que el dealer físico escanee la primera carta de cada jugador.
export async function iniciarRepartoFisico({ codigo }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("La mesa ya no existe.");
    const datos = snap.data();
    const jugadores = datos.jugadores.map((j) => ({
      ...j,
      nombre: j.alias,
      cartaAbierta: null,
      cartasCerradas: [],
      revelada: false,
      quebrado: false,
    }));
    tx.update(ref, {
      jugadores,
      fase: "repartiendo_inicial",
      turnoReparto: 0,
      turnoPidiendo: null,
      turnoRevelando: null,
      repartoPendiente: null,
      pozo: datos.ante * jugadores.length,
      numRonda: (datos.numRonda || 0) + 1,
      ganadorIdx: null,
    });
  });
}

// Llamado por el programa puente cada vez que el RC522 lee una carta,
// mientras la mesa está en fase "repartiendo_inicial".
export async function asignarCartaAbierta({ codigo, carta }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data();
    if (datos.fase !== "repartiendo_inicial") {
      throw new Error("La mesa no está esperando una carta abierta ahora mismo.");
    }
    const idx = datos.turnoReparto;
    const jugadores = datos.jugadores.map((j, i) => (i === idx ? { ...j, cartaAbierta: carta } : j));
    const siguiente = idx + 1;

    if (siguiente >= jugadores.length) {
      tx.update(ref, { jugadores, fase: "pidiendo", turnoReparto: null, turnoPidiendo: 0 });
    } else {
      tx.update(ref, { jugadores, turnoReparto: siguiente });
    }
  });
}

// El jugador elige cuántas cartas cerradas quiere y confirma. Ya no las
// reparte el sistema solo: deja la mesa "pidiendo" cartas físicas al dealer.
export async function pedirCartasCerradas({ codigo, cantidad }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data();
    if (datos.fase !== "pidiendo") return;

    if (cantidad === 0) {
      // no pidió cartas cerradas: pasa directo al siguiente jugador
      avanzarTurnoPidiendo(tx, ref, datos);
      return;
    }

    tx.update(ref, {
      repartoPendiente: { jugadorIdx: datos.turnoPidiendo, cantidadPedida: cantidad, cantidadRecibida: 0 },
    });
  });
}

function avanzarTurnoPidiendo(tx, ref, datos) {
  const siguienteTurno = datos.turnoPidiendo + 1;
  if (siguienteTurno >= datos.jugadores.length) {
    tx.update(ref, { fase: "revelando", turnoPidiendo: null, turnoRevelando: 0, repartoPendiente: null });
  } else {
    tx.update(ref, { turnoPidiendo: siguienteTurno, repartoPendiente: null });
  }
}

// Llamado por el programa puente cada vez que el RC522 lee una carta,
// mientras hay un "repartoPendiente" (alguien pidió cartas cerradas).
export async function asignarCartaCerrada({ codigo, carta }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data();
    if (!datos.repartoPendiente) {
      throw new Error("Nadie está esperando una carta cerrada ahora mismo.");
    }
    const { jugadorIdx, cantidadPedida, cantidadRecibida } = datos.repartoPendiente;
    const jugadores = datos.jugadores.map((j, i) => (i === jugadorIdx ? { ...j, cartasCerradas: [...j.cartasCerradas, carta] } : j));
    const nuevaCantidad = cantidadRecibida + 1;

    if (nuevaCantidad >= cantidadPedida) {
      const siguienteTurno = jugadorIdx + 1;
      if (siguienteTurno >= jugadores.length) {
        tx.update(ref, { jugadores, fase: "revelando", turnoPidiendo: null, turnoRevelando: 0, repartoPendiente: null });
      } else {
        tx.update(ref, { jugadores, turnoPidiendo: siguienteTurno, repartoPendiente: null });
      }
    } else {
      tx.update(ref, { jugadores, repartoPendiente: { jugadorIdx, cantidadPedida, cantidadRecibida: nuevaCantidad } });
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
  await iniciarRepartoFisico({ codigo });
}
