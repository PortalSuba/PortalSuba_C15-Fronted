// Estado del formulario y respuesta de cada tipo de acertijo (ver TiposAcertijo.jsx).

/** Valor inicial del formulario según el tipo. */
export function valorInicial(dto) {
  switch (dto.tipo) {
    case 'estante': return (dto.datos?.libros || []).map((l) => l.titulo);
    case 'reloj': return { h: 12, m: 0 };
    case 'globo': case 'cifrado': case 'uv': return '';
    default: return {};
  }
}

/** Lo que se envía al back: una lista de pasos (ver ComparadorRespuestas). */
export function respuestaDe(dto, valor) {
  switch (dto.tipo) {
    case 'estante': return valor;
    case 'reloj': return [`${valor.h}:${String(valor.m).padStart(2, '0')}`];
    case 'globo': case 'cifrado': case 'uv': return valor.trim() ? [valor.trim()] : [];
    default:
      return dto.elementos.flatMap((el) => {
        const v = (valor[el.id] || '').trim();
        if (el.tipo === 'lista-ordenable') return v.split(',').map((p) => p.trim()).filter(Boolean);
        return v ? [v] : [];
      });
  }
}

/** Si el acertijo reparte pistas entre los compañeros (el otro puede verlas sin abrirlo). */
export const tienePistas = (dto) => Boolean(dto?.datos?.pistas?.length || dto?.datos?.paginas?.length);
