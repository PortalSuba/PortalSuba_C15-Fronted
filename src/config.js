const wsDefault = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '',
  wsUrl: import.meta.env.VITE_WS_URL || wsDefault,
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
};

// Proveedor de identidad: no son secretos, van en el código del navegador en cualquier caso
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'escaperoomc15.us.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '1wAeS9u3tHLXqnn6L3MJvvU788R9HOIc',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.escaperoomc15',
};

export const topics = {
  salas: () => '/topic/salas',                                   // catálogo
  sala: (salaId) => `/topic/salas/${salaId}`,                     // detalle: equipos y listos
  inicio: (salaId) => `/topic/salas/${salaId}/inicio`,            // cuenta regresiva y arranque
  timer: (m) => `/topic/partidas/${m}/cronometro`,
  reto: (m) => `/topic/partidas/${m}/reto`,
  resultado: (m) => `/topic/partidas/${m}/resultado`,
  progreso: (m) => `/topic/partidas/${m}/progreso`,
  posiciones: (m, e) => `/topic/partidas/${m}/equipos/${e}/posiciones`,
  inventario: (m, e) => `/topic/partidas/${m}/equipos/${e}/inventario`,
  roles: (m, e) => `/topic/partidas/${m}/equipos/${e}/roles`,
  chatGlobal: () => '/topic/chat/global',
  chatSala: (salaId) => `/topic/chat/salas/${salaId}`,
  chatPartida: (m) => `/topic/chat/partidas/${m}`,
  chatEquipo: (m, e) => `/topic/chat/partidas/${m}/equipos/${e}`,
  ranking: () => '/topic/estadisticas/ranking',                  // aviso: terminó una partida
};

export const destinos = {
  registrarSesion: (m) => `/app/partidas/${m}/sesion`,
  // lobby: si se cierra la página el back saca al jugador (y si es el anfitrión, cierra la sala)
  registrarSesionSala: (salaId) => `/app/salas/${salaId}/sesion`,
};