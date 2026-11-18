import { useState } from 'react';
import Icono from '../Home/Iconos';
import { gameplayApi } from '../../services/gameplayApi';
import { numeroDe } from './MapaIso';
import CuerpoAcertijo from './TiposAcertijo';
import { respuestaDe, valorInicial } from './respuestasAcertijo';
import './Acertijos.css';

// soloPistas: el compañero mira SUS pistas mientras el otro tiene el acertijo abierto (no puede responder)
export default function ModalAcertijo({ dto, matchId, onCerrar, onResuelto, soloPistas = false }) {
  const [valor, setValor] = useState(() => valorInicial(dto));
  const [resultado, setResultado] = useState(dto.resuelto ? { correcto: true, mensaje: 'TU EQUIPO YA RESOLVIÓ ESTE ACERTIJO' } : null);
  const [enviando, setEnviando] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  const resuelto = dto.resuelto || resultado?.correcto;

  function cambiar(v) {
    setValor(v);
    setResultado(null);
  }

  async function enviar() {
    if (enviando || resuelto || soloPistas) return;
    const r = respuestaDe(dto, valor);
    if (!r.length) return setResultado({ correcto: false, mensaje: 'ESCRIBE UNA RESPUESTA' });
    setEnviando(true);
    try {
      const res = await gameplayApi.enviarSolucion(matchId, dto.componenteMapaId, r);
      setResultado({ correcto: res.correcto, mensaje: res.mensaje.toUpperCase() });
      if (res.correcto) onResuelto(dto.componenteMapaId);
      else { setSacudir(true); setTimeout(() => setSacudir(false), 400); }
    } catch (e) {
      setResultado({
        correcto: false,
        mensaje: e.esConflicto ? 'OTRO COMPAÑERO TOMÓ ESTE ACERTIJO' : e.message.toUpperCase(),
      });
    } finally {
      setEnviando(false);
    }
  }

  let estado = 'BLOQUEADO PARA TI';
  if (soloPistas) estado = 'TUS PISTAS';
  else if (resuelto) estado = 'RESUELTO';
  let nota = null;
  if (soloPistas) nota = 'TU COMPAÑERO TIENE ESTE ACERTIJO ABIERTO · DÍCTALE TUS PISTAS POR EL CHAT DE EQUIPO.';
  else if (!resuelto) nota = 'MIENTRAS LO TENGAS ABIERTO, TUS COMPAÑEROS NO PUEDEN ABRIRLO NI PUEDES MOVERTE.';

  return (
    <div className="pm-modal-fondo" onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <div className={`pm-acertijo pm-acertijo--${dto.tipo || 'pregunta'} ${sacudir ? 'sacudir' : ''}`} role="dialog" aria-modal="true">
        <header className="pm-acertijo__cabeza">
          <Icono nombre="llave" /> ACERTIJO {numeroDe(dto.componenteMapaId)}
          <span className={`pm-acertijo__estado ${resuelto && !soloPistas ? 'ok' : ''}`}>{estado}</span>
        </header>

        <p className="pm-acertijo__enunciado">{dto.enunciado}</p>

        {(!resuelto || soloPistas) && (
          <CuerpoAcertijo dto={dto} valor={valor} setValor={cambiar} onEnviar={enviar} soloPistas={soloPistas} />
        )}

        {resultado && !soloPistas && (
          <p role="status" className={`pm-acertijo__resultado ${resultado.correcto ? 'ok' : 'mal'}`}>{resultado.mensaje}</p>
        )}

        <div className="pm-acertijo__botones">
          <button type="button" className="pm-btn pm-btn-marron" onClick={onCerrar}>{resuelto || soloPistas ? 'CERRAR' : 'SALIR'}</button>
          {!resuelto && !soloPistas && (
            <button type="button" className="pm-btn pm-btn-verde" onClick={enviar} disabled={enviando}>
              {enviando ? 'VALIDANDO...' : 'ENVIAR'}
            </button>
          )}
        </div>
        {nota && <p className="pm-acertijo__nota">{nota}</p>}
      </div>
    </div>
  );
}
