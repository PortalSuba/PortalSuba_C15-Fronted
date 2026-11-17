import { useState } from 'react';
import Icono from './Iconos';
import { reproducirEfecto } from './sonido';

function Opcion({ titulo, detalle, activa, onCambiar }) {
  return (
    <label className="home-opcion">
      <span><strong>{titulo}</strong><small>{detalle}</small></span>
      <input type="checkbox" checked={activa} onChange={(e) => onCambiar(e.target.checked)} />
    </label>
  );
}

export function Ajustes({ ajustes, onCambiar }) {
  return (
    <section className="placa home-panel home-ajustes" aria-label="Preferencias del juego">
      <div className="home-ajustes__grupo">
        <h2><Icono nombre="sonido" /> SONIDO</h2>
        <Opcion titulo="Efectos de sonido" detalle="Al recoger llaves y resolver acertijos."
          activa={ajustes.efectos} onCambiar={(valor) => onCambiar('efectos', valor)} />
        <div className="home-opcion home-ajustes__volumen">
          <label htmlFor="home-volumen">Volumen de efectos <strong>{ajustes.volumen}%</strong></label>
          <input id="home-volumen" type="range" min="0" max="100" value={ajustes.volumen}
            disabled={!ajustes.efectos} onChange={(e) => onCambiar('volumen', e.target.valueAsNumber)} />
          <button type="button" className="tab home-ajustes__prueba" disabled={!ajustes.efectos || ajustes.volumen === 0}
            onClick={() => reproducirEfecto('acertijo')}>PROBAR SONIDO</button>
        </div>
      </div>
      <div className="home-ajustes__grupo">
        <h2><Icono nombre="candado" /> PRIVACIDAD</h2>
        <Opcion titulo="Mostrar chat global" detalle="Permite ver y usar el chat público desde el menú."
          activa={ajustes.chatGlobal} onCambiar={(valor) => onCambiar('chatGlobal', valor)} />
      </div>
      <div className="home-ajustes__grupo">
        <h2><Icono nombre="ajustes" /> ACCESIBILIDAD</h2>
        <Opcion titulo="Reducir movimiento" detalle="Acorta las animaciones y transiciones de la interfaz."
          activa={ajustes.reducirMovimiento} onCambiar={(valor) => onCambiar('reducirMovimiento', valor)} />
      </div>
      <p className="home-ayuda">Los ajustes se guardan en este navegador.</p>
    </section>
  );
}

export function Perfil({ username, alias, puntos, onGuardar }) {
  const [nombre, setNombre] = useState(alias);
  const [mensaje, setMensaje] = useState('');

  function guardar(e) {
    e.preventDefault();
    const nuevo = nombre.trim();
    const guardado = onGuardar(nuevo);
    setNombre(nuevo);
    setMensaje(guardado ? 'Credencial actualizada.' : 'No se pudo guardar el alias en este navegador.');
  }

  return (
    <section className="placa home-panel home-panel--estrecho">
      <h2><Icono nombre="tarjeta" /> CREDENCIAL DE JUGADOR</h2>
      <dl className="home-perfil-datos">
        <div><dt>Nombre de cuenta</dt><dd>{username}</dd></div>
        <div><dt>Puntos</dt><dd>{puntos}</dd></div>
      </dl>
      <form className="home-form" onSubmit={guardar}>
        <label htmlFor="home-alias">Alias de la credencial</label>
        <input id="home-alias" value={nombre} maxLength={24} autoComplete="off"
          onChange={(e) => { setNombre(e.target.value); setMensaje(''); }} />
        <p className="home-ayuda">Solo aparece en tu credencial de este navegador. Déjalo vacío para mostrar el nombre de tu cuenta.</p>
        <button type="submit" className="btn btn-verde" disabled={nombre.trim() === alias}>GUARDAR ALIAS</button>
        {mensaje && <p role="status">{mensaje}</p>}
      </form>
    </section>
  );
}
