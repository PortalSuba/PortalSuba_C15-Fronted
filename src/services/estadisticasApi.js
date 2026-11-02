import { http } from './http';

/** GET -> [{ posicion, userId, partidas, victorias, empates, derrotas, puntos }] */
export const rankingJugadores = (limite = 10) => http.get('/api/estadisticas/ranking', { limite });

/** GET -> { userId, partidas, victorias, empates, derrotas, puntos, porcentajeVictorias, ultimasPartidas } */
export const estadisticasDe = (userId) => http.get(`/api/estadisticas/jugadores/${userId}`);
