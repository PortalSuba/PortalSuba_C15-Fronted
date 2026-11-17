import { describe, it, expect, vi } from 'vitest';
import { Sesion } from '../sesion';

describe('Sesion', () => {
  it('empieza vacía', () => {
    expect(Sesion.userId).toBeNull();
    expect(Sesion.username).toBeNull();
    expect(Sesion.obtener('salaId')).toBeNull();
  });

  it('iniciar, guardar y leer cada campo', () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    Sesion.guardar('salaId', 's1');
    Sesion.guardar('equipoId', 'e1');
    Sesion.guardar('matchId', 'm1');
    expect([Sesion.userId, Sesion.username, Sesion.salaId, Sesion.equipoId, Sesion.matchId])
      .toEqual(['u1', 'ana', 's1', 'e1', 'm1']);
    Sesion.limpiar();
    expect(Sesion.userId).toBeNull();
  });

  it('un valor dañado en el almacenamiento cuenta como vacío', () => {
    sessionStorage.setItem('c15.sesion', '{no es json');
    expect(Sesion.userId).toBeNull();
  });

  it('si el navegador no deja guardar no falla', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('modo privado'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('modo privado'); });
    expect(() => Sesion.guardar('a', 1)).not.toThrow();
    expect(() => Sesion.limpiar()).not.toThrow();
  });
});
