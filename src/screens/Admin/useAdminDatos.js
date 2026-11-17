import { useEffect, useState } from 'react';
import { adminApi, codigoValido } from '../../services/adminApi';

function useConsulta(consultar, parametro, refresco = 0) {
  const [estado, setEstado] = useState({});
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (parametro == null) return;
    let activo = true;
    let temporizador;

    async function cargar() {
      try {
        const datos = await consultar(parametro);
        if (activo) setEstado({ datos, actualizado: Date.now(), parametro, intento });
      } catch (error) {
        if (activo) setEstado({ error, parametro, intento });
      } finally {
        if (activo && refresco) temporizador = setTimeout(cargar, refresco);
      }
    }

    void cargar();
    return () => { activo = false; clearTimeout(temporizador); };
  }, [consultar, parametro, refresco, intento]);

  const actual = estado.parametro === parametro && estado.intento === intento;
  return { ...(actual ? estado : {}), cargando: parametro != null && !actual, reintentar: () => setIntento((n) => n + 1) };
}

export const useTableroNegocio = (minutos) => useConsulta(adminApi.negocio, minutos);
export const useTableroTecnico = (minutos) => useConsulta(adminApi.tecnico, minutos, 30000);
export const useBuscarError = (codigo) => useConsulta(adminApi.errores, codigoValido(codigo) ? codigo : null);
