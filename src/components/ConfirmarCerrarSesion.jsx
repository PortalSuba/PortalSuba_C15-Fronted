import { useId, useRef } from 'react';
import './ConfirmarCerrarSesion.css';

export default function ConfirmarCerrarSesion({ className, children, onConfirmar }) {
  const dialogo = useRef(null);
  const tituloId = useId();
  const mensajeId = useId();

  function confirmar() {
    dialogo.current.close();
    onConfirmar();
  }

  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => dialogo.current.showModal()}>
        {children}
      </button>
      <dialog ref={dialogo} className="confirmar-sesion" aria-labelledby={tituloId} aria-describedby={mensajeId}>
        <h2 id={tituloId}>¿Cerrar sesión?</h2>
        <p id={mensajeId}>Tendrás que volver a iniciar sesión para jugar.</p>
        <div className="confirmar-sesion__acciones">
          <button type="button" onClick={() => dialogo.current.close()}>Cancelar</button>
          <button type="button" onClick={confirmar}>Cerrar sesión</button>
        </div>
      </dialog>
    </>
  );
}
