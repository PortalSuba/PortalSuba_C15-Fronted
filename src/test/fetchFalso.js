import { vi } from 'vitest';

/** Respuesta HTTP mínima para fetch. */
export function respuesta(status, cuerpo, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (h) => headers[h] ?? null },
    json: () => (cuerpo === undefined ? Promise.reject(new Error('sin cuerpo')) : Promise.resolve(cuerpo)),
  };
}

/**
 * Reemplaza fetch con rutas: { 'GET /api/salas': [..] } o una función (url, opciones) => respuesta.
 * Una ruta sin entrada responde 404.
 */
export function simularFetch(rutas = {}) {
  const fn = vi.fn(async (url, opciones = {}) => {
    const ruta = `${opciones.method ?? 'GET'} ${String(url).split('?')[0]}`;
    const r = typeof rutas === "function" ? rutas(url, opciones) : rutas[ruta];
    if (r === undefined) return respuesta(404, { error: 'no existe' });
    if (typeof r === 'function') return r(url, opciones);
    if (r?.status && 'ok' in r) return r;
    return respuesta(r === null ? 204 : 200, r);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
