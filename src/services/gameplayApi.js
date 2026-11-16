import { http } from './http';
import { socket } from './socket';
import { destinos } from '../config';

const p = (m) => `/api/partidas/${m}`;

export const gameplayApi = {
  // --- sesión en tiempo real (necesaria para detectar desconexión) ---
  registrarSesion: (m) => socket.enviar(destinos.registrarSesion(m)),
  salir: (m, userId) => http.del(`${p(m)}/jugadores/${encodeURIComponent(userId)}`),

  // --- mapa y movimiento ---
  mapa: (m) => http.get(`${p(m)}/mapa`),
  mover: (m, userId, x, y) => http.post(`${p(m)}/jugadores/${encodeURIComponent(userId)}/movimiento`, { x, y }),
  posiciones: (m, equipoId) => http.get(`${p(m)}/equipos/${equipoId}/posiciones`),

  // --- roles ---
  miRol: (m, userId) => http.get(`${p(m)}/jugadores/${encodeURIComponent(userId)}/rol`),
  rolesEquipo: (m, equipoId) => http.get(`${p(m)}/equipos/${equipoId}/roles`),

  // --- inventario ---
  inventario: (m, equipoId) => http.get(`${p(m)}/equipos/${equipoId}/inventario`),
  recolectar: (m, componenteId) => http.post(`${p(m)}/objetos/${componenteId}/recoleccion`),

  // --- acertijos ---
  abrirAcertijo: (m, c) => http.post(`${p(m)}/acertijos/${c}/bloqueo`),
  cerrarAcertijo: (m, c) => http.del(`${p(m)}/acertijos/${c}/bloqueo`),
  clickAcertijo: (m, c, elementoId, valor) =>
    http.post(`${p(m)}/acertijos/${c}/clicks`, { elementoId, valor }),
  entradaAcertijo: (m, c) => http.get(`${p(m)}/acertijos/${c}/clicks`),
  reiniciarAcertijo: (m, c) => http.del(`${p(m)}/acertijos/${c}/clicks`),
  enviarSolucion: (m, c, respuesta) =>
    http.post(`${p(m)}/acertijos/${c}/solucion`, { respuesta }),

  // --- progreso, cronómetro y resultado ---
  progreso: (m) => http.get(`${p(m)}/progreso`),
  timer: (m) => http.get(`${p(m)}/cronometro`),
  resultado: (m) => http.get(`${p(m)}/resultado`),

  // --- reto Héroe vs Verdugo ---
  estadoReto: (m) => http.get(`${p(m)}/reto`),
  clickReto: (m) => http.post(`${p(m)}/reto/clicks`),

  // --- solo desarrollo ---
  devIniciarTimer: (m, segundos = 60) => http.post(`/dev/partidas/${m}/inicio`, undefined, { segundos }),
  devIniciarReto: (m) => http.post(`/dev/partidas/${m}/reto/inicio`),
};