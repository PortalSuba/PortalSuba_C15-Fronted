const cifras = new Intl.NumberFormat('es-CO');
const formato = (valor) => valor == null ? '—' : cifras.format(valor);
const hora = (valor) => valor
  ? new Date(valor).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  : '—';

const INDICADORES = [
  ['jugadoresActivos', 'Jugadores activos'], ['partidasTerminadas', 'Partidas jugadas'],
  ['acertijosResueltos', 'Acertijos resueltos'], ['retosJugados', 'Retos jugados'],
  ['jugadoresNuevos', 'Jugadores nuevos'],
];

function CuadroIndicador({ titulo, valor }) {
  return <div className="adm-indicador"><span>{titulo}</span><strong>{formato(valor)}</strong></div>;
}

function BarrasMasUsadas({ funciones }) {
  const maximo = Math.max(1, ...funciones.map((f) => f.usos));
  return <section className="adm-panel">
    <h2>Lo más usado</h2>
    {funciones.length === 0 && <p>Sin actividad en este periodo.</p>}
    <ul className="adm-barras">
      {funciones.map(({ funcion, usos }) => <li key={funcion}>
        <span>{funcion}</span><strong>{formato(usos)}</strong>
        <div className="adm-pista" aria-hidden="true"><i style={{ width: (usos / maximo) * 100 + '%' }} /></div>
      </li>)}
    </ul>
  </section>;
}

export function Negocio({ datos }) {
  const { totales = {}, masUsadas = [], jugadoresEnElTiempo = [] } = datos;
  const maximo = Math.max(1, ...jugadoresEnElTiempo.map((p) => p.jugadores));
  const hayJugadores = jugadoresEnElTiempo.some((p) => p.jugadores > 0);
  return <>
    <div className="adm-indicadores">
      {INDICADORES.map(([clave, titulo]) => <CuadroIndicador key={clave} titulo={titulo} valor={totales[clave] ?? 0} />)}
    </div>
    <div className="adm-graficas">
      <BarrasMasUsadas funciones={masUsadas} />
      <section className="adm-panel">
        <h2>Jugadores en el tiempo</h2>
        {hayJugadores ? <>
          <ul className="adm-tiempo">
            {jugadoresEnElTiempo.map(({ momento, jugadores }) => <li key={momento}
              style={{ height: Math.max(2, (jugadores / maximo) * 100) + '%' }}
              title={hora(momento) + ' · ' + formato(jugadores) + ' jugadores'}>
              <span className="adm-lectura">{hora(momento)} · {formato(jugadores)} jugadores</span>
            </li>)}
          </ul>
          <p className="adm-secundario">Una barra por cada 5 min.</p>
        </> : <p>Sin actividad en este periodo.</p>}
      </section>
    </div>
  </>;
}

const prioridad = (r) => r.sinSenal ? 0 : r.degradada ? 1 : 2;
const ESTADOS = ['Sin señal', 'Degradada', 'OK'];

function TablaReplicas({ replicas }) {
  if (!replicas.length) return <p>Sin actividad en este periodo.</p>;
  return <div className="adm-tabla-contenedor" tabIndex={0} aria-label="Tabla de réplicas">
    <table className="adm-tabla">
      <thead><tr>{['Estado', 'Servicio', 'Réplica', 'Peticiones', 'P95', 'Errores', 'Excepciones'].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead>
      <tbody>{[...replicas].sort((a, b) => prioridad(a) - prioridad(b)).map((r) => <tr key={r.servicio + '/' + r.replica}>
        <td className={'adm-estado adm-estado--' + prioridad(r)}>{ESTADOS[prioridad(r)]}</td>
        <td>{r.servicio}</td><td title={r.replica}>…{r.replica?.slice(-5)}</td>
        <td>{formato(r.peticiones)}</td><td>{r.sinSenal || r.p95 == null ? '—' : formato(r.p95) + ' ms'}</td>
        <td>{r.sinSenal || r.porcentajeErrores == null ? '—' : formato(r.porcentajeErrores) + ' %'}</td><td>{formato(r.excepciones)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function Tecnico({ datos }) {
  const replicas = datos.replicas ?? [];
  return <section className="adm-panel">
    <h2>Estado de los servicios</h2>
    <div className="adm-indicadores">
      <CuadroIndicador titulo="Usuarios concurrentes" valor={datos.usuariosConcurrentes} />
      {ESTADOS.map((estado, i) => <CuadroIndicador key={estado} titulo={'Réplicas · ' + estado} valor={replicas.filter((r) => prioridad(r) === i).length} />)}
    </div>
    <TablaReplicas replicas={replicas} />
  </section>;
}

export function ResultadoError({ registro }) {
  return <li className="adm-registro">
    <div className="adm-registro__cabecera">
      <time dateTime={registro.hora}>{hora(registro.hora)}</time><strong>{registro.servicio}</strong>
      <span title={registro.replica}>…{registro.replica?.slice(-5)}</span>
      <span className="adm-estado--0">{registro.nivel} {registro.estado}</span><code>{registro.ruta}</code>
    </div>
    <p>{[registro.excepcion, registro.mensaje].filter(Boolean).join(' · ')}</p>
    {registro.detalle && registro.detalle !== registro.mensaje && <p className="adm-secundario">{registro.detalle}</p>}
    {registro.pila && <details><summary>Ver pila</summary><pre>{registro.pila}</pre></details>}
  </li>;
}
