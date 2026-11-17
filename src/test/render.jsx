import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

/** Muestra la ruta actual para comprobar a dónde navegó la pantalla. */
function RutaActual() {
  const { pathname, search } = useLocation();
  return <div data-testid="ruta">{pathname + search}</div>;
}

/** Renderiza una pantalla dentro de un router en `ruta` (con `patron` si usa parámetros). */
export function renderEnRuta(ui, { ruta = '/', patron, state } = {}) {
  patron ??= ruta.split('?')[0];
  return render(
    <MemoryRouter initialEntries={[{ pathname: ruta.split('?')[0], search: ruta.includes('?') ? '?' + ruta.split('?')[1] : '', state }]}>
      <Routes>
        <Route path={patron} element={<>{ui}<RutaActual /></>} />
        <Route path="*" element={<RutaActual />} />
      </Routes>
    </MemoryRouter>,
  );
}
