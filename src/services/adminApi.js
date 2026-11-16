import { http } from './http';

export const adminApi = {
  negocio: (minutos) => http.get('/api/admin/tablero/negocio', { minutos }),
  tecnico: (minutos) => http.get('/api/admin/tablero/tecnico', { minutos }),
  errores: (codigo, dias = 1) => http.get('/api/admin/errores/' + encodeURIComponent(codigo), { dias }),
};

export const codigoValido = (codigo) => /^[a-f0-9]{8,32}$/i.test(codigo);
