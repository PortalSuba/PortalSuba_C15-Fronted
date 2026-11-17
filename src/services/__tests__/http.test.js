import { describe, it, expect, vi } from 'vitest';
import { http, ApiError, EVENTO_ERROR_SERVIDOR } from '../http';
import { Sesion } from '../sesion';
import { auth0Falso } from '../../test/auth0Falso';
import { respuesta, simularFetch } from '../../test/fetchFalso';

describe('http', () => {
  it('manda el token, el cuerpo en JSON y los parámetros de la consulta', async () => {
    const fetch = simularFetch({ 'POST /api/salas': { id: 's1' } });
    const r = await http.post('/api/salas', { nombre: 'A' }, { x: 1 });
    expect(r).toEqual({ id: 's1' });
    const [url, op] = fetch.mock.calls[0];
    expect(url).toBe('/api/salas?x=1');
    expect(op.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer token-prueba' });
    expect(op.body).toBe('{"nombre":"A"}');
  });

  it('sin token no manda la cabecera Authorization', async () => {
    auth0Falso.falla = new Error('sin sesión');
    const fetch = simularFetch({ 'GET /api/salas': [] });
    await http.get('/api/salas');
    expect(fetch.mock.calls[0][1].headers).toEqual({});
  });

  it('204 devuelve null', async () => {
    simularFetch({ 'DELETE /api/salas/1/listo': null });
    expect(await http.del('/api/salas/1/listo')).toBeNull();
  });

  it('un error 4xx lleva el mensaje del back y el estado', async () => {
    simularFetch({ 'PATCH /api/salas/1/configuracion': respuesta(409, { error: 'Sala llena' }) });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const e = await http.patch('/api/salas/1/configuracion', {}).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.message).toBe('Sala llena');
    expect(e.esConflicto).toBe(true);
    expect(e.esProhibido).toBe(false);
  });

  it('un 4xx sin cuerpo usa "Error <estado>"', async () => {
    simularFetch({ 'GET /x': respuesta(403, undefined) });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const e = await http.get('/x').catch((x) => x);
    expect(e.message).toBe('Error 403');
    expect(e.esProhibido).toBe(true);
  });

  it('un 5xx muestra el código del traceId y avisa a la app', async () => {
    simularFetch({ 'GET /x': respuesta(500, {}, { 'X-Trace-Id': 'abcdef0123456789' }) });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const avisos = [];
    const oir = (e) => avisos.push(e.detail);
    window.addEventListener(EVENTO_ERROR_SERVIDOR, oir);
    const e = await http.get('/x').catch((x) => x);
    window.removeEventListener(EVENTO_ERROR_SERVIDOR, oir);
    expect(e.message).toBe('Algo falló (código abcdef01)');
    expect(e.traceId).toBe('abcdef0123456789');
    expect(avisos).toEqual([e]);
  });

  it('sin red lanza un error con estado 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const e = await http.get('/x').catch((x) => x);
    expect(e.sinConexion).toBe(true);
    expect(e.message).toBe('No se pudo conectar con el servidor');
  });

  it('un 401 con sesión abierta la limpia y vuelve al inicio', async () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    simularFetch({ 'GET /x': respuesta(401, {}) });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const e = await http.get('/x').catch((x) => x);
    expect(e.status).toBe(401);
    expect(Sesion.userId).toBeNull();
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('ApiError de un 404 sabe que no se encontró', () => {
    const e = new ApiError(404, 'no');
    expect(e.esNoEncontrado).toBe(true);
    expect(e.sinConexion).toBe(false);
  });
});
