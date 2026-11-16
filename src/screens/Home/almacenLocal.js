import { Sesion } from '../../services/sesion';

export const claveAjustes = (userId) => 'c15.ajustes.' + userId;

export const AJUSTES_INICIALES = { efectos: true, volumen: 60, chatGlobal: true, reducirMovimiento: false };

export function leerLocal(clave, inicial) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? inicial; }
  catch { return inicial; }
}

export function guardarLocal(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export function leerAjustes(userId) {
  return { ...AJUSTES_INICIALES, ...leerLocal(claveAjustes(userId), {}) };
}

let ajustesActivos = leerAjustes(Sesion.userId);

export function obtenerAjustesActivos() {
  return ajustesActivos;
}

export function aplicarAjustes(ajustes) {
  ajustesActivos = ajustes;
  document.documentElement.toggleAttribute('data-c15-movimiento-reducido', ajustes.reducirMovimiento);
}

aplicarAjustes(ajustesActivos);
