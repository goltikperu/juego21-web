import {
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

const ACTION_CODE_SETTINGS = {
  url: window.location.origin,
  handleCodeInApp: true,
};

export async function entrarConGoogle() {
  const resultado = await signInWithPopup(auth, googleProvider);
  await asegurarPerfil(resultado.user);
}

export async function enviarLinkPorCorreo(correo) {
  await sendSignInLinkToEmail(auth, correo, ACTION_CODE_SETTINGS);
  window.localStorage.setItem("correoParaLogin", correo);
}

export async function completarLoginPorLink() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return null;
  let correo = window.localStorage.getItem("correoParaLogin");
  if (!correo) {
    correo = window.prompt("Confirma tu correo para completar el acceso:");
  }
  const resultado = await signInWithEmailLink(auth, correo, window.location.href);
  window.localStorage.removeItem("correoParaLogin");
  await asegurarPerfil(resultado.user);
  return resultado.user;
}

async function asegurarPerfil(usuario) {
  const ref = doc(db, "usuarios", usuario.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      nombre: usuario.displayName || "",
      alias: "",
      avatarId: "",
      fichas: 500,
      estadisticas: { juego21: { partidasGanadas: 0 } },
      creadoEn: serverTimestamp(),
    });
  }
}