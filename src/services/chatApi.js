import { http } from './http';
import { topics } from '../config';

// Canales de chat: mensajes { id, canal, userId, texto, enviadoEn }, del más viejo al más nuevo.
// Los nuevos llegan por STOMP en `topico`. Todo es efímero: lo guarda el back en memoria.

function canal(ruta, topico, userId, query) {
  return {
    topico,
    historial: () => http.get(ruta, query),
    enviar: (texto) => http.post(ruta, { userId, texto }),
  };
}

export const canales = {
  /** Menú: todos los conectados. */
  global: (userId) => canal('/api/chat/global', topics.chatGlobal(), userId),
  /** Sala de espera: se cierra cuando arranca la partida (409). */
  sala: (salaId, userId) => canal(`/api/chat/salas/${salaId}`, topics.chatSala(salaId), userId, { userId }),
  /** Partida: los dos equipos. */
  partida: (matchId, userId) => canal(`/api/chat/partidas/${matchId}`, topics.chatPartida(matchId), userId, { userId }),
  /** Partida: solo el equipo del jugador, que lo decide el back a partir del userId. */
  equipo: (matchId, equipoId, userId) =>
    canal(`/api/chat/partidas/${matchId}/equipo`, topics.chatEquipo(matchId, equipoId), userId, { userId }),
};

export const MAX_LONGITUD_MENSAJE = 200;
