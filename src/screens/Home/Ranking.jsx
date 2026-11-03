import { useEffect, useState } from 'react';
import { rankingJugadores, estadisticasDe } from '../../services/estadisticasApi';
import { useNombres } from '../../hooks/useNombres';
import { useSubscription } from '../../hooks/useSocket';
import { topics } from '../../config';
import './Ranking.css';

const TEXTO_RESULTADO = { VICTORIA: 'VICTORIA', EMPATE: 'EMPATE', DERROTA: 'DERROTA' };

const fechaDe = (instante) =>
  new Date(instante).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export default function Ranking({ userId }) {
  const [ranking, setRanking] = useState(null);
  const [mias, setMias] = useState(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const nombreDe = useNombres(ranking?.map((j) => j.userId));

  // El back solo avisa que terminó una partida; se vuelve a pedir todo sin borrar lo que ya se ve
  useSubscription(topics.ranking(), () => setVersion((v) => v + 1));

  useEffect(() => {
    let vivo = true;
    Promise.all([rankingJugadores(10), estadisticasDe(userId)])
      .then(([r, e]) => { if (vivo) { setRanking(r); setMias(e); setError(false); } })
      .catch(() => { if (vivo && version === 0) setError(true); });
    return () => { vivo = false; };
  }, [userId, version]);

  if (error) return <p className="mensaje-grid">NO SE PUDO CARGAR EL RANKING</p>;
  if (!ranking || !mias) return <p className="mensaje-grid">CARGANDO RANKING...</p>;

  return (
    <div className="rk">
      <section className="placa rk-tabla">
        <p className="rk-rotulo">MEJORES JUGADORES</p>
        {ranking.length === 0 ? (
          <p className="rk-vacio">TODAVÍA NO HAY PARTIDAS TERMINADAS. ¡SÉ EL PRIMERO!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th className="rk-nombre">JUGADOR</th>
                <th title="Partidas">PJ</th>
                <th title="Victorias">V</th>
                <th title="Empates">E</th>
                <th title="Derrotas">D</th>
                <th title="Puntos: victoria 3, empate 1">PTS</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((j) => (
                <tr key={j.userId} className={`${j.userId === userId ? 'rk-yo' : ''} rk-pos-${j.posicion}`}>
                  <td>{j.posicion}</td>
                  <td className="rk-nombre">{nombreDe(j.userId).toUpperCase()}</td>
                  <td>{j.partidas}</td>
                  <td>{j.victorias}</td>
                  <td>{j.empates}</td>
                  <td>{j.derrotas}</td>
                  <td className="rk-puntos">{j.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="rk-nota">VICTORIA 3 PUNTOS · EMPATE 1 · DERROTA 0</p>
      </section>

      <section className="placa rk-mias">
        <p className="rk-rotulo">TUS ESTADÍSTICAS</p>
        <div className="rk-cifras">
          <Cifra valor={mias.puntos} texto="PUNTOS" />
          <Cifra valor={mias.partidas} texto="PARTIDAS" />
          <Cifra valor={mias.victorias} texto="VICTORIAS" />
          <Cifra valor={`${mias.porcentajeVictorias}%`} texto="EFECTIVIDAD" />
        </div>

        <p className="rk-rotulo">ÚLTIMAS PARTIDAS</p>
        {mias.ultimasPartidas.length === 0 && <p className="rk-vacio">AÚN NO HAS TERMINADO NINGUNA</p>}
        <ul className="rk-ultimas">
          {mias.ultimasPartidas.map((p) => (
            <li key={p.matchId}>
              <span className={`rk-resultado rk-resultado--${p.resultado.toLowerCase()}`}>{TEXTO_RESULTADO[p.resultado]}</span>
              <span>{p.puntajeEquipo} PTS</span>
              <time dateTime={p.jugadaEn}>{fechaDe(p.jugadaEn).toUpperCase()}</time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Cifra({ valor, texto }) {
  return (
    <div className="rk-cifra">
      <strong>{valor}</strong>
      <small>{texto}</small>
    </div>
  );
}
