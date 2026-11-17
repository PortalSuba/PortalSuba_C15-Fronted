import { describe, it, expect } from 'vitest';
import { respuesta, simularFetch } from '../../test/fetchFalso';
import { cargarNombres, nombreDe } from '../usuariosApi';
import { Sesion } from '../sesion';

describe('usuariosApi', () => {
  it('pide solo los ids nuevos, una vez, y guarda los nombres', async () => {
    const fetch = simularFetch({ 'GET /api/usuarios': [{ userId: 'aaaa1', username: 'ana' }] });
    expect(nombreDe('aaaa1')).toBe('JUGADOR AAAA');
    const [a, b] = [cargarNombres(['aaaa1', 'aaaa1', null]), cargarNombres(['aaaa1'])];
    expect(await a).toBe(true);
    expect(await b).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(nombreDe('aaaa1')).toBe('ana');
    expect(await cargarNombres(['aaaa1'])).toBe(false);
  });

  it('si falla se queda el nombre de respaldo', async () => {
    simularFetch({ 'GET /api/usuarios': respuesta(500, {}) });
    expect(await cargarNombres(['bbbb2'])).toBe(true);
    expect(nombreDe('bbbb2')).toBe('JUGADOR BBBB');
  });

  it('el propio jugador se ve con su nombre de sesión; sin id, vacío', () => {
    Sesion.iniciar({ userId: 'yo', username: 'juan' });
    expect(nombreDe('yo')).toBe('juan');
    expect(nombreDe(null)).toBe('');
  });
});
