import { useEffect, useState } from 'react';
import { rankingJugadores } from '../../services/estadisticasApi';
import { http } from '../../services/http';
import { guardarLocal, leerLocal } from './almacenLocal';

const normalizar = (texto) => texto.toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu, '');

export default function Amigos({ userId }) {
  const clave = 'c15.contactos.' + userId;
  const [amigos, setAmigos] = useState(() => leerLocal(clave, []));
  const [consulta, setConsulta] = useState('');
  const [jugadores, setJugadores] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let activo = true;
    rankingJugadores(50)
      .then((ranking) => {
        const ids = ranking.map((j) => j.userId).filter((id) => id !== userId);
        return ids.length ? http.get('/api/usuarios', { ids: ids.join(',') }) : [];
      })
      .then((usuarios) => {
        if (!activo) return;
        setJugadores(usuarios);
        setEstado('listo');
      })
      .catch(() => { if (activo) setEstado('error'); });
    return () => { activo = false; };
  }, [userId, intento]);

  function actualizar(nuevaLista, mensaje) {
    if (!guardarLocal(clave, nuevaLista)) {
      setAviso('No se pudo guardar la lista en este navegador.');
      return;
    }
    setAmigos(nuevaLista);
    setAviso(mensaje);
  }

  const busqueda = normalizar(consulta.trim());
  const resultados = busqueda ? jugadores.filter((j) => normalizar(j.username).includes(busqueda)) : [];

  return (
    <div className="home-paneles">
      <section className="placa home-panel">
        <h2>BUSCAR JUGADORES</h2>
        <p className="home-ayuda">Busca por nombre entre los jugadores del ranking.</p>
        <label htmlFor="home-buscar">Nombre del jugador</label>
        <input id="home-buscar" className="home-campo" type="search" value={consulta} maxLength={50}
          onChange={(e) => setConsulta(e.target.value)} />
        {estado === 'cargando' && <p role="status">Cargando jugadores…</p>}
        {estado === 'error' && <>
          <p role="status">No se pudo consultar el ranking.</p>
          <button className="btn btn-marron" onClick={() => { setEstado('cargando'); setIntento(intento + 1); }}>REINTENTAR</button>
        </>}
        {estado === 'listo' && busqueda && resultados.length === 0 && <p role="status">No encontramos jugadores con ese nombre.</p>}
        <ul className="home-lista">
          {resultados.map((j) => {
            const agregado = amigos.some((a) => a.userId === j.userId);
            return <li key={j.userId}>
              <span>{j.username}</span>
              <button className="btn btn-verde" disabled={agregado} aria-label={(agregado ? 'Agregado: ' : 'Agregar a ') + j.username}
                onClick={() => actualizar([...amigos, j], j.username + ' se agregó a tus contactos.')}>
                {agregado ? 'AGREGADO' : 'AGREGAR'}
              </button>
            </li>;
          })}
        </ul>
      </section>
      <section className="placa home-panel">
        <h2>MIS AMIGOS ({amigos.length})</h2>
        <p className="home-ayuda">Tu lista de contactos se guarda en este navegador.</p>
        {amigos.length === 0 && <p>Todavía no has agregado jugadores.</p>}
        <ul className="home-lista">
          {amigos.map((a) => <li key={a.userId}>
            <span>{jugadores.find((j) => j.userId === a.userId)?.username ?? a.username}</span>
            <button className="btn btn-marron" aria-label={'Quitar a ' + a.username}
              onClick={() => actualizar(amigos.filter((j) => j.userId !== a.userId), a.username + ' se quitó de tus contactos.')}>
              QUITAR
            </button>
          </li>)}
        </ul>
        {aviso && <p role="status">{aviso}</p>}
      </section>
    </div>
  );
}
