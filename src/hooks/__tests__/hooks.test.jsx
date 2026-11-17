import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { simularFetch, respuesta } from '../../test/fetchFalso';
import { stompFalso } from '../../test/stompFalso';
import { auth0Falso } from '../../test/auth0Falso';
import { CLAIM_ROLES } from '../../services/auth';
import { useCronometro } from '../useCronometro';
import { useEsAdmin } from '../useEsAdmin';
import { useNombres } from '../useNombres';
import { useConexion, useSubscription, useTopic } from '../useSocket';
import { useReto, retoActivo, esDemoReto, activarDemoReto } from '../useReto';

describe('useSocket', () => {
  it('useSubscription entrega los mensajes del tópico y sin destino no suscribe', async () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useSubscription('/topic/x', cb));
    renderHook(() => useSubscription(null, cb));
    await act(() => stompFalso.conectar());
    act(() => stompFalso.entregar('/topic/x', { n: 1 }));
    expect(cb).toHaveBeenCalledWith({ n: 1 });
    unmount();
    expect(stompFalso.suscritos()).not.toContain('/topic/x');
  });

  it('useTopic guarda el último valor o llama al callback', async () => {
    const { result } = renderHook(() => useTopic('/topic/v', 0));
    const cb = vi.fn();
    renderHook(() => useTopic('/topic/w', cb));
    await act(() => stompFalso.conectar());
    act(() => stompFalso.entregar('/topic/v', 7));
    act(() => stompFalso.entregar('/topic/w', 8));
    expect(result.current[0]).toBe(7);
    expect(cb).toHaveBeenCalledWith(8);
  });

  it('useConexion sigue el estado del socket', async () => {
    const { result } = renderHook(() => useConexion());
    act(() => stompFalso.cerrar());
    expect(result.current).toBe(false);
    await act(() => stompFalso.conectar());
    expect(result.current).toBe(true);
  });
});

describe('useCronometro', () => {
  it('toma el tiempo del back, cuenta hacia atrás y se actualiza por STOMP', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    simularFetch({ 'GET /api/partidas/m1/cronometro': { segundosRestantes: 65, tiempoAgotado: false } });
    const { result } = renderHook(() => useCronometro('m1'));
    expect(result.current.mmss).toBe('--:--');
    await waitFor(() => expect(result.current.segundos).toBe(65));
    expect(result.current.mmss).toBe('01:05');
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.segundos).toBe(63);
    await act(() => stompFalso.conectar());
    act(() => stompFalso.entregar('/topic/partidas/m1/cronometro', { segundosRestantes: 0, tiempoAgotado: true }));
    expect(result.current.timeUp).toBe(true);
    expect(result.current.mmss).toBe('00:00');
    vi.useRealTimers();
  });

  it('sin partida no pide nada', () => {
    const fetch = simularFetch();
    renderHook(() => useCronometro(null));
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('useEsAdmin', () => {
  it('null mientras pregunta, luego true o false; sin usuario es false', async () => {
    auth0Falso.usuario = { [CLAIM_ROLES]: ['admin'] };
    const { result } = renderHook(() => useEsAdmin('u1'));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(true));
    expect(renderHook(() => useEsAdmin(null)).result.current).toBe(false);
  });
});

describe('useNombres', () => {
  it('repinta cuando llegan los nombres', async () => {
    simularFetch({ 'GET /api/usuarios': [{ userId: 'zzzz9', username: 'zoe' }] });
    const { result } = renderHook(() => useNombres(['zzzz9']));
    expect(result.current('zzzz9')).toBe('JUGADOR ZZZZ');
    await waitFor(() => expect(result.current('zzzz9')).toBe('zoe'));
  });
});

describe('useReto', () => {
  it('retoActivo y el modo demo', () => {
    expect(retoActivo('EN_CURSO')).toBe(true);
    expect(retoActivo('TERMINADO')).toBe(false);
    expect(esDemoReto()).toBe(false);
    activarDemoReto();
    expect(esDemoReto()).toBe(true);
    activarDemoReto(false);
    expect(esDemoReto()).toBe(false);
  });

  it('carga el estado, recibe por STOMP y manda los clics solo con el reto activo', async () => {
    const fetch = simularFetch({
      'GET /api/partidas/m1/reto': { estado: 'EN_CURSO', segundosRestantes: 10, puntajes: { e1: 0 } },
      'POST /api/partidas/m1/reto/clicks': null,
    });
    const { result } = renderHook(() => useReto('m1', { miEquipoId: 'e1', miRol: 'HEROE' }));
    await waitFor(() => expect(result.current.reto.estado).toBe('EN_CURSO'));
    act(() => result.current.presionar());
    expect(result.current.misClics).toBe(1);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    await act(() => stompFalso.conectar());
    act(() => stompFalso.entregar('/topic/partidas/m1/reto', { estado: 'TERMINADO', equipoGanadorId: 'e1' }));
    expect(result.current.reto.equipoGanadorId).toBe('e1');
    act(() => result.current.presionar());
    expect(result.current.misClics).toBe(1);
  });

  it('sin reto en la partida (404) queda SIN_RETO', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({ 'GET /api/partidas/m2/reto': respuesta(404, {}) });
    const { result } = renderHook(() => useReto('m2', { miRol: 'HEROE' }));
    await waitFor(() => expect(result.current.reto.estado).toBe('SIN_RETO'));
  });

  it('en modo demo simula el reto con bots hasta terminar', () => {
    vi.useFakeTimers();
    activarDemoReto();
    const { result, unmount } = renderHook(() => useReto('m3', { miEquipoId: 'a', miRol: 'VERDUGO', equipoIds: ['a', 'b'] }));
    expect(result.current.demo).toBe(true);
    expect(result.current.reto.estado).toBe('INICIADO');
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.reto.estado).toBe('EN_CURSO');
    act(() => result.current.presionar());
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.reto.estado).toBe('TERMINADO');
    act(() => result.current.presionar());
    expect(result.current.misClics).toBe(1);
    unmount();
    vi.useRealTimers();
  });

  it('en modo demo el héroe suma a su equipo', () => {
    vi.useFakeTimers();
    activarDemoReto();
    const { result, unmount } = renderHook(() => useReto('m4', { miRol: 'HEROE' }));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.presionar());
    expect(result.current.misClics).toBe(1);
    unmount();
    vi.useRealTimers();
  });
});
