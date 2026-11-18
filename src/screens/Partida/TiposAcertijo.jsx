import { useState } from 'react';

// Cada tipo de acertijo: cómo se dibuja y qué respuesta manda. Los datos vienen del back (sin la solución).
// Con soloPistas se muestran solo las pistas del jugador (su compañero tiene el acertijo abierto).

export default function CuerpoAcertijo({ dto, valor, setValor, onEnviar, soloPistas }) {
  const props = { dto, datos: dto.datos || {}, valor, setValor, onEnviar, soloPistas };
  switch (dto.tipo) {
    case 'globo': return <Globo {...props} />;
    case 'estante': return <Estante {...props} />;
    case 'cifrado': return <Cifrado {...props} />;
    case 'reloj': return <Reloj {...props} />;
    case 'uv': return <Cuadro {...props} />;
    default: return <Pregunta {...props} />;
  }
}

function CampoTexto({ etiqueta, valor, setValor, onEnviar }) {
  return (
    <label className="pm-acertijo__campo">
      <span>{etiqueta.toUpperCase()}</span>
      <input type="text" value={valor} autoFocus placeholder="TU RESPUESTA"
             onChange={(e) => setValor(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && onEnviar()} />
    </label>
  );
}

function Pregunta({ dto, valor, setValor, onEnviar }) {
  return dto.elementos.map((el) => (
    <label key={el.id} className="pm-acertijo__campo">
      <span>{el.descripcion.toUpperCase()}</span>
      <input
        type={el.tipo === 'campo-numero' ? 'number' : 'text'}
        value={valor[el.id] || ''}
        autoFocus
        placeholder={el.tipo === 'lista-ordenable' ? 'SEPARA CON COMAS: rojo, naranja, ...' : 'TU RESPUESTA'}
        onChange={(e) => setValor({ ...valor, [el.id]: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && onEnviar()}
      />
    </label>
  ));
}

// ---------- Globo terráqueo ----------
function Globo({ datos, valor, setValor, onEnviar }) {
  // El punto marca la latitud (el globo gira hasta la longitud): ayuda visual, no da la respuesta
  const y = 50 - (datos.latitud / 90) * 40;
  return (
    <div className="ac-globo">
      <svg viewBox="0 0 100 100" className="ac-globo__esfera" aria-hidden="true">
        <circle cx="50" cy="50" r="40" className="ac-globo__agua" />
        {[-60, -30, 0, 30, 60].map((lat) => (
          <ellipse key={lat} cx="50" cy={50 - (lat / 90) * 40} rx={40 * Math.cos((lat * Math.PI) / 180)} ry="3" className="ac-globo__linea" />
        ))}
        {[10, 22, 32].map((rx) => <ellipse key={rx} cx="50" cy="50" rx={rx} ry="40" className="ac-globo__linea" />)}
        <line x1="50" y1="10" x2="50" y2="90" className="ac-globo__linea" />
        <circle cx="50" cy={y} r="3" className="ac-globo__punto" />
      </svg>
      <div className="ac-globo__telegrama">
        <p>{datos.telegrama}</p>
        <p className="ac-globo__coord">{datos.coordenadas}</p>
      </div>
      <CampoTexto etiqueta="Ciudad" valor={valor} setValor={setValor} onEnviar={onEnviar} />
    </div>
  );
}

// ---------- Libros en orden ----------
function Estante({ datos, valor, setValor }) {
  const [elegido, setElegido] = useState(null);
  const [arrastrado, setArrastrado] = useState(null);
  const libros = Object.fromEntries((datos.libros || []).map((l) => [l.titulo, l]));

  function mover(desde, hasta) {
    if (desde === hasta || desde == null) return;
    const nuevo = [...valor];
    const [libro] = nuevo.splice(desde, 1);
    nuevo.splice(hasta, 0, libro);
    setValor(nuevo);
  }

  function tocar(i) {
    // En celular: tocar un libro y luego otro los intercambia
    if (elegido == null) return setElegido(i);
    const nuevo = [...valor];
    [nuevo[elegido], nuevo[i]] = [nuevo[i], nuevo[elegido]];
    setValor(nuevo);
    setElegido(null);
  }

  return (
    <div className="ac-estante">
      <p className="ac-nota">{datos.nota}</p>
      <ol className="ac-estante__fila" aria-label="Estante">
        {valor.map((titulo, i) => {
          const l = libros[titulo] || {};
          return (
            <li key={titulo}
                className={`ac-libro ${elegido === i ? 'elegido' : ''}`}
                style={{ '--lomo': l.color }}
                draggable
                onDragStart={() => setArrastrado(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { mover(arrastrado, i); setArrastrado(null); }}>
              <button type="button" onClick={() => tocar(i)} aria-label={`${titulo}, ${l.nombreColor}, ${l.anio}`}>
                <span className="ac-libro__titulo">{titulo.toUpperCase()}</span>
                <span className="ac-libro__anio">{l.anio}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="ac-ayuda">ARRASTRA LOS LIBROS O TOCA DOS PARA INTERCAMBIARLOS · SE LEEN DE IZQUIERDA A DERECHA</p>
    </div>
  );
}

// ---------- Cifrado de libro ----------
function Cifrado({ datos, valor, setValor, onEnviar, soloPistas }) {
  return (
    <div className="ac-cifrado">
      <p className="ac-nota">NOTA: {datos.nota}</p>
      <div className="ac-paginas">
        {(datos.paginas || []).map((p) => (
          <article key={p.numero} className="ac-pagina">
            <h4>PÁGINA {p.numero}</h4>
            <ol>{p.lineas.map((l) => <li key={l}>{l}</li>)}</ol>
          </article>
        ))}
      </div>
      {!soloPistas && <CampoTexto etiqueta="Mensaje descifrado" valor={valor} setValor={setValor} onEnviar={onEnviar} />}
    </div>
  );
}

// ---------- Reloj de péndulo ----------
function Reloj({ datos, valor, setValor, soloPistas }) {
  const angulo = (n, total) => (n / total) * 360;
  const cambiar = (campo, paso, max, min) => {
    let v = valor[campo] + paso;
    if (v > max) v = min;
    if (v < min) v = max;
    setValor({ ...valor, [campo]: v });
  };
  return (
    <div className="ac-reloj">
      <ul className="ac-pistas">
        {(datos.pistas || []).map((p) => <li key={p}>{p}</li>)}
      </ul>
      {!soloPistas && (
        <div className="ac-reloj__control">
          <svg viewBox="0 0 100 100" className="ac-reloj__cara" aria-hidden="true">
            <circle cx="50" cy="50" r="44" className="ac-reloj__borde" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x="49" y="9" width="2" height="6" transform={`rotate(${i * 30} 50 50)`} className="ac-reloj__marca" />
            ))}
            <line x1="50" y1="50" x2="50" y2="28" className="ac-reloj__hora"
                  transform={`rotate(${angulo(valor.h % 12, 12) + valor.m / 2} 50 50)`} />
            <line x1="50" y1="50" x2="50" y2="16" className="ac-reloj__minuto"
                  transform={`rotate(${angulo(valor.m, 60)} 50 50)`} />
          </svg>
          <div className="ac-reloj__botones">
            <Ajuste etiqueta="HORA" valor={valor.h} onMenos={() => cambiar('h', -1, 12, 1)} onMas={() => cambiar('h', 1, 12, 1)} />
            <Ajuste etiqueta="MIN" valor={String(valor.m).padStart(2, '0')}
                    onMenos={() => cambiar('m', -5, 55, 0)} onMas={() => cambiar('m', 5, 55, 0)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Ajuste({ etiqueta, valor, onMenos, onMas }) {
  return (
    <div className="ac-ajuste">
      <span>{etiqueta}</span>
      <button type="button" className="pm-btn" onClick={onMenos} aria-label={`${etiqueta} menos`}>◀</button>
      <strong aria-label={etiqueta}>{valor}</strong>
      <button type="button" className="pm-btn" onClick={onMas} aria-label={`${etiqueta} más`}>▶</button>
    </div>
  );
}

// ---------- Lámpara UV ----------
function Cuadro({ dto, datos, valor, setValor, onEnviar }) {
  return (
    <div className="ac-uv">
      <figure className={`ac-cuadro ${dto.tieneObjeto ? 'iluminado' : ''}`}>
        <figcaption>{(datos.cuadro || '').toUpperCase()}</figcaption>
        {dto.tieneObjeto
          ? <p className="ac-cuadro__oculto">{datos.oculto}</p>
          : <p className="ac-cuadro__sin">{datos.sinObjeto}</p>}
      </figure>
      <CampoTexto etiqueta="Palabra secreta" valor={valor} setValor={setValor} onEnviar={onEnviar} />
    </div>
  );
}
