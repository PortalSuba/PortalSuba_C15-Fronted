import { describe, it, expect, vi } from 'vitest';
import { auth0Falso } from '../../test/auth0Falso';
import { respuesta, simularFetch } from '../../test/fetchFalso';
import { entrar, completarEntrada, hayCuenta, obtenerToken, salir, rolesDelUsuario, esAdmin, CLAIM_ROLES } from '../auth';
import { authApi } from '../authApi';
import { Sesion } from '../sesion';

function irA(busqueda) {
  window.history.replaceState(null, '', '/' + busqueda);
}

describe('auth (Auth0)', () => {
  it('entrar lleva al proveedor; con registro abre la página de crear cuenta', async () => {
    await entrar();
    await entrar({ registro: true });
    expect(auth0Falso.llamadas).toEqual([
      ['login', undefined],
      ['login', { authorizationParams: { screen_hint: 'signup' } }],
    ]);
  });

  it('completarEntrada termina el login si vuelve con code y state, y limpia la URL', async () => {
    irA('?code=1&state=2');
    await completarEntrada();
    expect(auth0Falso.llamadas).toEqual([['callback']]);
    expect(window.location.search).toBe('');
  });

  it('completarEntrada no hace nada si no viene del proveedor', async () => {
    irA('');
    await completarEntrada();
    expect(auth0Falso.llamadas).toEqual([]);
  });

  it('completarEntrada lanza el error que manda el proveedor', async () => {
    irA('?error=access_denied&error_description=Cuenta%20bloqueada');
    await expect(completarEntrada()).rejects.toThrow('Cuenta bloqueada');
    irA('?error=x');
    await expect(completarEntrada()).rejects.toThrow('NO SE PUDO INICIAR SESIÓN');
  });

  it('hayCuenta, obtenerToken y salir', async () => {
    auth0Falso.autenticado = true;
    expect(await hayCuenta()).toBe(true);
    expect(await obtenerToken()).toBe('token-prueba');
    auth0Falso.falla = new Error('login_required');
    expect(await obtenerToken()).toBeNull();
    await salir();
    expect(auth0Falso.llamadas.at(-1)[0]).toBe('logout');
  });

  it('roles: salen del claim del token; si falla, ninguno', async () => {
    expect(await rolesDelUsuario()).toEqual([]);
    auth0Falso.usuario = { [CLAIM_ROLES]: ['admin'] };
    expect(await esAdmin()).toBe(true);
    auth0Falso.usuario = { [CLAIM_ROLES]: [] };
    expect(await esAdmin()).toBe(false);
    auth0Falso.falla = new Error('x');
    expect(await rolesDelUsuario()).toEqual([]);
  });
});

describe('authApi', () => {
  it('cargarPerfil guarda la sesión', async () => {
    simularFetch({ 'GET /api/perfil': { userId: 'u1', username: 'ana' } });
    expect(await authApi.cargarPerfil()).toEqual({ userId: 'u1', username: 'ana' });
    expect(authApi.sesionActual()).toEqual({ userId: 'u1', username: 'ana' });
  });

  it('cargarPerfil devuelve null si la cuenta es nueva (404) y relanza otros errores', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    simularFetch({});
    expect(await authApi.cargarPerfil()).toBeNull();
    simularFetch({ 'GET /api/perfil': respuesta(500, {}) });
    await expect(authApi.cargarPerfil()).rejects.toThrow('Algo falló');
  });

  it('registrarNombre manda el nombre sin espacios', async () => {
    const fetch = simularFetch({ 'POST /api/perfil': { userId: 'u1', username: 'ana' } });
    await authApi.registrarNombre('  ana ');
    expect(fetch.mock.calls[0][1].body).toBe('{"username":"ana"}');
    expect(Sesion.username).toBe('ana');
  });

  it('logout limpia la sesión y sale del proveedor', async () => {
    Sesion.iniciar({ userId: 'u1', username: 'ana' });
    await authApi.logout();
    expect(authApi.sesionActual()).toBeNull();
    expect(auth0Falso.llamadas.at(-1)[0]).toBe('logout');
  });
});
