import { useMemo } from 'react';

export const ISO = { origenX: 50.5, origenY: 44, mediaAncho: 2.55, mediaAlto: 2.25 };

/** Centro de la celda (x, y) en % del mapa. */
export function aPantalla(x, y) {
  return {
    left: ISO.origenX + (x - y) * ISO.mediaAncho,
    top: ISO.origenY + (x + y + 1) * ISO.mediaAlto,
  };
}

const COLORES = ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#c2185b', '#7f8c8d'];
const PIELES = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
export function colorDe(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { ropa: COLORES[h % COLORES.length], piel: PIELES[(h >>> 3) % PIELES.length], variante: (h >>> 8) % 4 };
}
export const numeroDe = (componenteId) => componenteId.split('-')[1];

export default function MapaIso({
  mapa, jugadores, userId, nombreDe, ocultos, resueltos, cercano,
  mostrarGrid, moviendo, onCelda, onInteractuar,
}) {
  const ocupadas = useMemo(() => {
    const s = new Set();
    mapa.componentes.forEach((c) => s.add(`${c.x},${c.y}`));
    return s;
  }, [mapa]);

  const celdas = [];
  for (let x = 0; x < mapa.ancho; x++) {
    for (let y = 0; y < mapa.alto; y++) {
      const { left, top } = aPantalla(x, y);
      const bloqueada = ocupadas.has(`${x},${y}`);
      celdas.push(
        <button
          key={`${x},${y}`}
          className={`pm-celda ${bloqueada ? 'bloqueada' : ''} ${mostrarGrid ? 'visible' : ''}`}
          style={{
            left: `${left - ISO.mediaAncho}%`,
            top: `${top - ISO.mediaAlto}%`,
            width: `${ISO.mediaAncho * 2}%`,
            height: `${ISO.mediaAlto * 2}%`,
          }}
          onClick={() => !bloqueada && onCelda({ x, y })}
          tabIndex={-1}
          aria-label={`Celda ${x},${y}`}
        >
          {mostrarGrid && <span className="pm-celda__txt">{x},{y}</span>}
        </button>
      );
    }
  }

  const objetos = useMemo(() => {
    const sprite = 3.8;
    const separacionX = sprite + 0.35;
    const separacionY = sprite * 30 / 24 * 16 / 9 + 0.35;
    const ubicados = [];
    for (const componente of mapa.componentes) {
      const { left, top } = aPantalla(componente.x, componente.y);
      const vecinos = ubicados.filter((objeto) => Math.abs(objeto.top - top) < separacionY);
      const candidatos = [left, ...vecinos.flatMap((objeto) => [
        objeto.left - separacionX, objeto.left + separacionX,
      ])].sort((a, b) => Math.abs(a - left) - Math.abs(b - left));
      const x = candidatos.find((candidato) => vecinos.every((objeto) =>
        Math.abs(candidato - objeto.left) >= separacionX - 0.001
      ));
      ubicados.push({ componente, left: x ?? left, top, sprite });
    }
    return ubicados;
  }, [mapa]);

  return (
    <>
      <div className={`pm-celdas ${moviendo ? 'moviendo' : ''}`}>{celdas}</div>

      {/* Componentes del mapa */}
      {objetos.map(({ componente: c, left, top, sprite }) => {
        if (ocultos.has(c.id)) return null;
        const esCercano = cercano?.id === c.id;
        const resuelto = resueltos.has(c.id);
        return (
          <div
            key={c.id}
            className={`pm-objeto pm-obj-${c.tipo.toLowerCase()} ${esCercano ? 'cercano' : ''} ${resuelto ? 'resuelto' : ''}`}
            style={{ left: `${left}%`, top: `${top}%`, zIndex: esCercano ? 200 : 10 + 2 * (c.x + c.y),
              '--pm-sprite-ancho': sprite + 'cqw' }}
          >
            <Sprite tipo={c.tipo} resuelto={resuelto} />
            {esCercano && <Burbuja componente={c} resuelto={resuelto} onInteractuar={onInteractuar} />}
          </div>
        );
      })}

      {/* Jugadores del equipo */}
      {jugadores.map((j) => {
        const { left, top } = aPantalla(j.x, j.y);
        const yo = j.userId === userId;
        return (
          <div
            key={j.userId}
            className={`pm-jugador ${yo ? 'yo' : ''}`}
            style={{ left: `${left}%`, top: `${top}%`, zIndex: 11 + 2 * (j.x + j.y) }}
          >
            <span className="pm-jugador__nombre">{nombreDe(j.userId)}</span>
            <Personaje {...colorDe(j.userId)} />
            <span className="pm-jugador__sombra" />
          </div>
        );
      })}
    </>
  );
}

// Botón: además de la tecla E se puede tocar/clickear (celular)
function Burbuja({ componente, resuelto, onInteractuar }) {
  const n = numeroDe(componente.id);
  const textos = {
    ACERTIJO: [`ACERTIJO ${n}`, resuelto ? 'RESUELTO · [E] VER' : '[E] EXAMINAR'],
    LLAVE: [`LLAVE ${n}`, '[E] RECOGER'],
    OBJETO: ['LÁMPARA UV', '[E] RECOGER'],
    PUERTA: ['PUERTA', '[E] REVISAR'],
  }[componente.tipo];
  if (!textos) return null;
  return (
    <button
      type="button"
      className="pm-burbuja"
      onClick={(e) => { e.stopPropagation(); e.currentTarget.blur(); onInteractuar?.(); }}
    >
      <strong>{textos[0]}</strong>
      <span>{textos[1]}</span>
    </button>
  );
}

export function Personaje({ ropa, piel, variante = 0 }) {
  const cabello = ['#49312b', '#251c20', '#a05d37', '#36293b'][variante];
  return (
    <svg className="pm-personaje" viewBox="0 0 20 26" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="#211619" d="M6 0h8v1h2v2h2v8h-2v2h2v2h2v7h-4v4h-5v-3H9v3H4v-4H0v-7h2v-2h2v-2H2V3h2V1h2z" />
      <path fill={cabello} d="M6 1h8v1h2v2h1v4h-3V5H9v1H5v3H3V4h2V2h1z" />
      <path fill={piel} d="M5 7h4V6h5v3h2v2h-2v2H6v-2H4V9h1zM1 19h3v2H1zM16 19h3v2h-3z" />
      <path fill="#352320" d="M6 9h1v1H6zM12 9h1v1h-1zM9 11h2v1H9z" />
      <path fill={ropa} d="M4 13h4v1h4v-1h4v1h2v2h1v3h-3v-2h-1v5H5v-5H4v2H1v-3h1v-2h2z" />
      <path fill="#26202a" opacity=".45" d="M14 15h2v6h-2zM2 16h2v3H2zM5 20h10v2H5z" />
      <path fill="#dbc28a" d="M6 14h1v5H6zM12 14h1v5h-1zM9 20h2v1H9z" />
      <path fill="#77564c" d="M5 22h4v2H5zM11 22h4v2h-4z" />
      <path fill="#b1835d" d="M4 24h5v1H4zM11 24h5v1h-5z" />
      {variante === 1 && <path fill="#ae855d" d="M4 3h12v2h2v2H2V5h2z" />}
      {variante === 2 && <path fill="#cc6652" d="M5 12h10v2H5zM13 14h2v3h-2z" />}
      {variante === 3 && <path fill="#ecd690" d="M5 8h4v2H5zM11 8h4v2h-4z" />}
    </svg>
  );
}

function Sprite({ tipo, resuelto }) {
  return (
    <svg className="pm-sprite" viewBox="0 0 24 30" shapeRendering="crispEdges" aria-hidden="true">
      {tipo === 'PUERTA' ? (
        <>
          <path fill="#291913" d="M2 30V8h2V5h3V2h10v3h3v3h2v22z" />
          <path fill="#96704a" d="M4 29V9h2V6h3V4h6v2h3v3h2v20z" />
          <path fill="#553426" d="M6 28V10h2V7h8v3h2v18z" />
          <path fill="#795038" d="M7 11h3v16H7zM12 8h3v19h-3z" />
          <path fill="#36231d" d="M6 13h12v2H6zM6 24h12v2H6zM0 28h24v2H0z" />
          <path fill="#e5b068" d="M15 18h2v3h-2z" />
        </>
      ) : tipo === 'ACERTIJO' ? (
        <>
          <path fill="#301e14" d="M4 18h3V9h2V7h8v2h3v9h2v10h-3v2H3v-2H1V20h3z" />
          <path fill="#886047" d="M4 20h16v6H4zM3 27h18v2H3z" />
          <path fill="#b88b62" d="M9 9h8v2h2v8H7v-8h2z" />
          {resuelto
            ? <path fill="#c7ff9e" d="M8 14h2v2h2v-2h2v-2h3v2h-2v2h-2v2h-3v-2H8z" />
            : <path fill="#f2c263" d="M10 10h5v1h2v2h-2v2h-2v2h-2v-3h3v-2h-4zM11 18h2v2h-2z" />}
          <path fill="#5f3b2c" d="M7 22h10v3H7z" />
        </>
      ) : tipo === 'OBJETO' ? (
        <>
          <path fill="#2a1d2e" d="M8 4h8v2h2v8h-2v4h2v6h3v6H3v-6h3v-6h2v-4H6V6h2z" />
          <path fill="#7d2cff" d="M8 6h8v8H8z" />
          <path fill="#c99bff" d="M10 7h3v3h-3z" />
          <path fill="#6b5a4a" d="M9 15h6v3H9zM7 19h10v5H7zM4 25h16v3H4z" />
          <path fill="#b14cff" opacity=".35" d="M2 2h20v14H2z" />
        </>
      ) : tipo === 'LLAVE' ? (
        <>
          <path fill="#372419" d="M2 23h3v-3h14v3h3v7H2z" />
          <path fill="#8b6040" d="M5 21h14v3H5zM4 25h16v3H4z" />
          <path fill="#744918" d="M4 13h8v2h10v6h-3v2h-3v-3h-4v2H4z" />
          <path fill="#f3c46b" d="M5 14h6v2h10v3h-2v2h-2v-3h-6v3H5z" />
          <path fill="#744918" d="M7 16h2v3H7z" />
        </>
      ) : (
        <>
          <path fill="#39271e" d="M3 9h18v6h-3v10h3v5H3v-5h3V15H3z" />
          <path fill="#9d7758" d="M5 10h14v3H5zM7 15h10v10H7zM5 26h14v2H5z" />
          <path fill="#6a4b38" d="M10 15h2v10h-2zM14 15h3v10h-3z" />
        </>
      )}
    </svg>
  );
}
