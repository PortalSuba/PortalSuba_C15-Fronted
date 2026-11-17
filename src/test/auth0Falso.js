// Auth0 de mentira: las pruebas deciden si hay sesión, el token y el usuario (con sus roles).
const inicial = () => ({ autenticado: false, token: 'token-prueba', usuario: null, falla: null });

export const auth0Falso = {
  ...inicial(),
  llamadas: [],
  reiniciar() { Object.assign(this, inicial(), { llamadas: [] }); },
};

const cliente = {
  async loginWithRedirect(op) { auth0Falso.llamadas.push(['login', op]); },
  async handleRedirectCallback() { auth0Falso.llamadas.push(['callback']); },
  async isAuthenticated() { return auth0Falso.autenticado; },
  async getTokenSilently() {
    if (auth0Falso.falla) throw auth0Falso.falla;
    return auth0Falso.token;
  },
  async getUser() {
    if (auth0Falso.falla) throw auth0Falso.falla;
    return auth0Falso.usuario;
  },
  async logout(op) { auth0Falso.llamadas.push(['logout', op]); },
};

export const modulo = { createAuth0Client: () => Promise.resolve(cliente) };
