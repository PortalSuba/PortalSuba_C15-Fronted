import { http } from './http';
import { topics } from '../config';

// Canales de chat: mensajes { id, canal, userId, texto, enviadoEn }, del más viejo al más nuevo.
// Los nuevos llegan por STOMP en `topico`. Todo es efímero: lo guarda el back en memoria.

function canal(ruta, topico) {
  return {
    topico,
    historial: () => http.get(ruta),
    enviar: (texto) => http.post(ruta, { texto }),
  };
}

export const canales = {
  /** Menú: todos los conectados. */
  global: () => canal('/api/chat/global', topics.chatGlobal()),
  /** Sala de espera: se cierra cuando arranca la partida (409). */
  sala: (salaId) => canal(`/api/chat/salas/${salaId}`, topics.chatSala(salaId)),
  /** Partida: los dos equipos. */
  partida: (matchId) => canal(`/api/chat/partidas/${matchId}`, topics.chatPartida(matchId)),
  /** Partida: solo el equipo del jugador, que lo decide el back a partir del token. */
  equipo: (matchId, equipoId) => canal(`/api/chat/partidas/${matchId}/equipo`, topics.chatEquipo(matchId, equipoId)),
};

export const MAX_LONGITUD_MENSAJE = 200;
