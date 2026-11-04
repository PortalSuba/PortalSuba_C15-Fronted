import { http } from './http';
import { socket } from './socket';
import { destinos } from '../config';


export const listarSalas = () => http.get('/api/salas');
export const detalleSala = (salaId) => http.get(`/api/salas/${salaId}`);

/** Quien la crea es el anfitrión: el back lo saca del token. */
/** Acepta el nombre o { nombre, minutos } (5, 10 o 15; sin minutos el back usa 5). */
export const crearSala = (nombreOData) =>
  http.post('/api/salas', typeof nombreOData === 'object'
    ? { nombre: nombreOData.nombre, minutos: nombreOData.minutos }
    : { nombre: nombreOData });

/** Solo el anfitrión.*/
export const configurarSala = (salaId, numEquipos, jugadoresPorEquipo) =>
  http.patch(`/api/salas/${salaId}/configuracion`, { numEquipos, jugadoresPorEquipo });

export const unirseASala = (salaId) => http.post(`/api/salas/${salaId}/jugadores`);

export const listarEquipos = (salaId) => http.get(`/api/salas/${salaId}/equipos`);

export const unirseAEquipo = (equipoId) => http.post(`/api/equipos/${equipoId}/miembros`);

export const marcarListo = (salaId) => http.post(`/api/salas/${salaId}/listo`);
export const desmarcarListo = (salaId) => http.del(`/api/salas/${salaId}/listo`);

// Alias por si alguna pantalla usa los otros nombres
export const unirseSala = unirseASala;
export const unirseEquipo = unirseAEquipo;

export const salasApi = {
  listar: listarSalas,
  detalle: detalleSala,
  crear: crearSala,
  configurar: configurarSala,
  unirse: unirseASala,
  equipos: listarEquipos,
  unirseEquipo: unirseAEquipo,
  marcarListo,
  desmarcarListo,
};

/** Salir del lobby (VOLVER): si es el anfitrión, el back cierra la sala y avisa a los demás. */
export const salirDeSala = (salaId, userId) => http.del(`/api/salas/${salaId}/jugadores/${encodeURIComponent(userId)}`);

/** Avisa al back que este jugador está en el lobby con esta conexión (se usa para detectar que cerró la página). */
export const registrarSesionSala = (salaId) => socket.enviar(destinos.registrarSesionSala(salaId));
