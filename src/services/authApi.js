import { http } from './http';
import { Sesion } from './sesion';
import { salir } from './auth';

/** Trae el perfil de la cuenta con la que se entró. null: es nueva y aún no eligió nombre de jugador. */
export async function cargarPerfil() {
  try {
    const perfil = await http.get('/api/perfil');
    Sesion.iniciar(perfil);
    return perfil;
  } catch (e) {
    if (e.esNoEncontrado) return null;
    throw e;
  }
}

export async function registrarNombre(username) {
  const perfil = await http.post('/api/perfil', { username: username.trim() });
  Sesion.iniciar(perfil);
  return perfil;
}

export function sesionActual() {
  return Sesion.userId ? { userId: Sesion.userId, username: Sesion.username } : null;
}

export function logout() {
  Sesion.limpiar();
  return salir();
}

export const authApi = { cargarPerfil, registrarNombre, sesionActual, logout };
