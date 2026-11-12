import { useEffect, useState } from 'react';
import { esAdmin } from '../services/auth';

/**
 * true si el usuario tiene el rol admin en su token. Para mostrar u ocultar funciones de administración en
 * cualquier pantalla; el back igual rechaza con 403 lo que no le corresponde.
 */
export function useEsAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let vivo = true;
    esAdmin().then((a) => { if (vivo) setAdmin(a); });
    return () => { vivo = false; };
  }, []);
  return admin;
}
