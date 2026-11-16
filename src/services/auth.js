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

/** Claim donde Auth0 pone los roles (una Action los agrega al token). Debe ser igual al del back. */
export const CLAIM_ROLES = 'https://api.escaperoomc15/roles';

/**
 * Roles del usuario según su token (['admin'] o []). Solo sirve para mostrar u ocultar cosas en pantalla:
 * quien decide es el back, que rechaza con 403 lo que no le corresponde aunque el front lo muestre.
 */
export async function rolesDelUsuario() {
  try {
    const c = await auth0();
    const usuario = await c.getUser();
    return usuario?.[CLAIM_ROLES] ?? [];
  } catch {
    return [];
  }
}

export async function esAdmin() {
  return (await rolesDelUsuario()).includes('admin');
}
