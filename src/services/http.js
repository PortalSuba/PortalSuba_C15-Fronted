import { config } from '../config';
import { obtenerToken } from './auth';
import { Sesion } from './sesion';

const CARACTERES_CODIGO = 8; // suficientes para buscar en los logs: trace_id=~"abcd1234.*"

export class ApiError extends Error {
  constructor(status, mensaje, traceId = null) {
    // En un fallo del servidor el jugador ve un código para reportarlo
    super(status >= 500 && traceId ? `${mensaje} (código ${traceId.slice(0, CARACTERES_CODIGO)})` : mensaje);
    this.status = status;
    this.traceId = traceId;
  }
  get esConflicto() { return this.status === 409; }
  get esProhibido() { return this.status === 403; }
  get esNoEncontrado() { return this.status === 404; }
  get sinConexion() { return this.status === 0; }
}

async function request(method, path, { body, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const token = await obtenerToken();
  const headers = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let res;
  try {
    res = await fetch(`${config.apiUrl}${path}${qs}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }
  if (res.status === 401 && Sesion.userId) {
    // La sesión ya no sirve: de vuelta al inicio a entrar de nuevo
    Sesion.limpiar();
    window.location.assign('/');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const traceId = res.headers.get('X-Trace-Id');
    console.warn(`[API] ${method} ${path} -> ${res.status} (traceId ${traceId ?? 'desconocido'})`);
    throw new ApiError(res.status, data?.error || `Error ${res.status}`, traceId);
  }
  return data;
}

export const http = {
  get: (p, query) => request('GET', p, { query }),
  post: (p, body, query) => request('POST', p, { body, query }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p, query) => request('DELETE', p, { query }),
};