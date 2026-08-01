import { doc, getDoc, setDoc, updateDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

const MAX_JUGADORES = 5;

function generarCodigo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1 para evitar confusiones
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }
  return codigo;
}

export async function crearMesa({ uid, alias, avatarId, celular, telefono, ante }) {
  let codigo = generarCodigo();
  let ref = doc(db, "mesas", codigo);

  for (let intento = 0; intento < 5; intento++) {
    const snap = await getDoc(ref);
    if (!snap.exists()) break;
    codigo = generarCodigo();
    ref = doc(db, "mesas", codigo);
  }

  await setDoc(ref, {
    codigo,
    creadorUid: uid,
    ante,
    fase: "esperando",
    jugadores: [{ uid, alias, avatarId, celular: celular || "", telefono: telefono || "", asiento: 0, saldo: 500 }],
    solicitudes: [],
    creadaEn: Date.now(),
  });

  return codigo;
}

export async function solicitarUnirse({ codigo, uid, alias, avatarId, celular, telefono }) {
  const ref = doc(db, "mesas", codigo.toUpperCase());

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("No existe una mesa con ese código.");
    }
    const datos = snap.data();

    const yaEsJugador = datos.jugadores.some((j) => j.uid === uid);
    if (yaEsJugador) return { estado: "aceptado" };

    const solicitudes = datos.solicitudes || [];
    const yaSolicito = solicitudes.some((s) => s.uid === uid);
    if (yaSolicito) return { estado: "pendiente" };

    if (datos.jugadores.length >= MAX_JUGADORES) {
      throw new Error("Esa mesa ya está completa (5 jugadores).");
    }

    const nuevaSolicitud = { uid, alias, avatarId, celular: celular || "", telefono: telefono || "", pedidaEn: Date.now() };
    tx.update(ref, { solicitudes: [...solicitudes, nuevaSolicitud] });
    return { estado: "pendiente" };
  });
}

export async function aceptarSolicitud({ codigo, uid, adminUid }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("La mesa ya no existe.");
    const datos = snap.data();
    if (datos.creadorUid !== adminUid) {
      throw new Error("Solo el administrador puede aceptar jugadores.");
    }
    const solicitud = (datos.solicitudes || []).find((s) => s.uid === uid);
    if (!solicitud) return;
    if (datos.jugadores.length >= MAX_JUGADORES) {
      throw new Error("La mesa ya está completa.");
    }
    const nuevoJugador = {
      uid: solicitud.uid,
      alias: solicitud.alias,
      avatarId: solicitud.avatarId,
      celular: solicitud.celular,
      telefono: solicitud.telefono,
      asiento: datos.jugadores.length,
      saldo: 500,
    };
    tx.update(ref, {
      jugadores: [...datos.jugadores, nuevoJugador],
      solicitudes: (datos.solicitudes || []).filter((s) => s.uid !== uid),
    });
  });
}

export async function rechazarSolicitud({ codigo, uid, adminUid }) {
  const ref = doc(db, "mesas", codigo);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const datos = snap.data();
    if (datos.creadorUid !== adminUid) {
      throw new Error("Solo el administrador puede rechazar solicitudes.");
    }
    tx.update(ref, {
      solicitudes: (datos.solicitudes || []).filter((s) => s.uid !== uid),
    });
  });
}

export async function cambiarAnte({ codigo, uid, nuevoAnte }) {
  const ref = doc(db, "mesas", codigo);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("La mesa ya no existe.");
  if (snap.data().creadorUid !== uid) {
    throw new Error("Solo el administrador de la mesa puede cambiar el ante.");
  }
  await updateDoc(ref, { ante: nuevoAnte });
}

export async function cerrarMesa({ codigo, uid }) {
  const ref = doc(db, "mesas", codigo);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().creadorUid !== uid) {
    throw new Error("Solo el administrador puede cerrar la sala.");
  }
  await updateDoc(ref, { cerrada: true });
}
