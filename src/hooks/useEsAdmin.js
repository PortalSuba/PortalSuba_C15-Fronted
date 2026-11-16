import { useEffect, useState } from 'react';
import { esAdmin } from '../services/auth';

export function useEsAdmin(userId) {
  const [rol, setRol] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let activo = true;
    esAdmin().then(
      (admin) => { if (activo) setRol({ userId, admin }); },
      () => { if (activo) setRol({ userId, admin: false }); },
    );
    return () => { activo = false; };
  }, [userId]);

  if (!userId) return false;
  return rol?.userId === userId ? rol.admin : null;
}
