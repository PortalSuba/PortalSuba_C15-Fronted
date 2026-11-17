import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// STOMP falso: nada sale a la red. Las pruebas usan stompFalso para simular el servidor.
vi.mock('@stomp/stompjs', async () => (await import('./stompFalso.js')).modulo);

// Auth0 falso: las pruebas cambian auth0Falso (token, usuario, autenticado) a su gusto.
vi.mock('@auth0/auth0-spa-js', async () => (await import('./auth0Falso.js')).modulo);

// jsdom no trae <dialog>
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
}

afterEach(async () => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  const { auth0Falso } = await import('./auth0Falso.js');
  auth0Falso.reiniciar();
});
