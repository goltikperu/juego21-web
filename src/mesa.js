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

export async function crearMesa({ uid, alias, avatarId, ante }) {
  let codigo = generarCodigo();
  let ref = doc(db, "mesas", codigo);

  // por si el código ya existiera (muy poco probable), intenta unas veces más
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
    jugadores: [{ uid, alias, avatarId, asiento: 0, saldo: 500 }],
    creadaEn: Date.now(),
  });

  return codigo;
}

export async function unirseAMesa({ codigo, uid, alias, avatarId }) {
  const ref = doc(db, "mesas", codigo.toUpperCase());

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("No existe una mesa con ese código.");
    }
    const datos = snap.data();
    const yaEsta = datos.jugadores.some((j) => j.uid === uid);
    if (yaEsta) {
      return datos;
    }
    if (datos.jugadores.length >= MAX_JUGADORES) {
      throw new Error("Esa mesa ya está completa (5 jugadores).");
    }
    const nuevoJugador = { uid, alias, avatarId, asiento: datos.jugadores.length, saldo: 500 };
    const jugadoresActualizados = [...datos.jugadores, nuevoJugador];
    tx.update(ref, { jugadores: jugadoresActualizados });
    return { ...datos, jugadores: jugadoresActualizados };
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
