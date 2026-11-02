import { createAuth0Client } from '@auth0/auth0-spa-js';
import { auth0Config } from '../config';

// El proveedor de identidad (Auth0) pide la contraseña en SU página: aquí solo llegan tokens.
// Refresh tokens en localStorage porque el login silencioso con iframe depende de cookies de terceros,
// que los navegadores bloquean. La sesión se comparte entre pestañas del mismo navegador.

let cliente;
const auth0 = () => {
  cliente ??= createAuth0Client({
    domain: auth0Config.domain,
    clientId: auth0Config.clientId,
    useRefreshTokens: true,
    cacheLocation: 'localstorage',
    authorizationParams: {
      audience: auth0Config.audience,
      redirect_uri: window.location.origin,
    },
  });
  return cliente;
};

/** Lleva a la página del proveedor; con `registro` abre directo la de crear cuenta. */
export async function entrar({ registro = false } = {}) {
  const c = await auth0();
  await c.loginWithRedirect(registro ? { authorizationParams: { screen_hint: 'signup' } } : undefined);
}

/** Si venimos de vuelta del proveedor, termina el login y limpia la URL. */
export async function completarEntrada() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('error')) {
    window.history.replaceState(null, '', window.location.pathname);
    throw new Error(params.get('error_description') || 'NO SE PUDO INICIAR SESIÓN');
  }
  if (!params.has('code') || !params.has('state')) return;
  const c = await auth0();
  await c.handleRedirectCallback();
  window.history.replaceState(null, '', window.location.pathname);
}

export async function hayCuenta() {
  const c = await auth0();
  return c.isAuthenticated();
}

/** Token para el back, o null si no hay sesión válida. El SDK lo renueva cuando vence. */
export async function obtenerToken() {
  try {
    const c = await auth0();
    return await c.getTokenSilently();
  } catch {
    return null;
  }
}

export async function salir() {
  const c = await auth0();
  await c.logout({ logoutParams: { returnTo: window.location.origin } });
}
