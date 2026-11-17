import { describe, it, expect, vi } from 'vitest';
import { stompFalso } from '../../test/stompFalso';
import { auth0Falso } from '../../test/auth0Falso';
import { socket } from '../socket';

describe('socket (STOMP)', () => {
  it('suscribe al conectar, entrega JSON o texto, y se desuscribe', async () => {
    const recibidos = [];
    const quitar = socket.suscribir('/topic/a', (d) => recibidos.push(d));
    expect(stompFalso.cliente.active).toBe(true);
    expect(stompFalso.suscritos()).toEqual([]);

    await stompFalso.conectar();
    expect(stompFalso.cliente.connectHeaders).toEqual({ Authorization: 'Bearer token-prueba' });
    expect(socket.conectado).toBe(true);
    stompFalso.entregar('/topic/a', { x: 1 });
    stompFalso.entregar('/topic/a', 'texto plano');
    expect(recibidos).toEqual([{ x: 1 }, 'texto plano']);

    quitar();
    stompFalso.entregar('/topic/a', { x: 2 });
    expect(recibidos).toHaveLength(2);
  });

  it('ya conectado suscribe de una y publica al instante', async () => {
    await stompFalso.conectar();
    const cb = vi.fn();
    socket.suscribir('/topic/b', cb);
    expect(stompFalso.suscritos()).toContain('/topic/b');
    socket.enviar('/app/x', { a: 1 });
    expect(stompFalso.publicados.at(-1)).toEqual({ destination: '/app/x', body: '{"a":1}' });
  });

  it('avisa los cambios de conexión y sin token conecta sin cabecera', async () => {
    const estados = [];
    const quitar = socket.onEstado((v) => estados.push(v));
    stompFalso.cerrar();
    auth0Falso.falla = new Error('sin sesión');
    await stompFalso.conectar();
    expect(stompFalso.cliente.connectHeaders).toEqual({});
    quitar();
    stompFalso.cerrar();
    expect(estados).toEqual([true, false, true]);
  });

  it('al reconectar vuelve a suscribir lo que estaba', async () => {
    const cb = vi.fn();
    socket.suscribir('/topic/c', cb);
    stompFalso.cerrar();
    await stompFalso.conectar();
    stompFalso.entregar('/topic/c', { ok: true });
    expect(cb).toHaveBeenCalledWith({ ok: true });
  });

  it('desconectar olvida las suscripciones y apaga el cliente', async () => {
    await socket.desconectar();
    expect(stompFalso.cliente.active).toBe(false);
  });

  it('muestra los errores STOMP en consola', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    stompFalso.cliente.config.onStompError({ headers: { message: 'denegado' } });
    expect(error).toHaveBeenCalledWith('[STOMP]', 'denegado');
  });
});
