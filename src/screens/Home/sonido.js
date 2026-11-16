import { obtenerAjustesActivos } from './almacenLocal';

const NOTAS = {
  llave: [523.25, 783.99],
  acertijo: [523.25, 659.25, 783.99],
};

let contexto;

export function prepararSonido() {
  const { efectos, volumen } = obtenerAjustesActivos();
  if (!efectos || !volumen || !window.AudioContext) return;
  try {
    contexto ??= new window.AudioContext();
    return contexto.resume().catch(() => {});
  } catch {
    return;
  }
}

export async function reproducirEfecto(tipo) {
  await prepararSonido();
  const { efectos, volumen } = obtenerAjustesActivos();
  if (!efectos || !volumen || contexto?.state !== 'running') return;

  NOTAS[tipo].forEach((frecuencia, indice) => {
    const inicio = contexto.currentTime + indice * 0.08;
    const tono = contexto.createOscillator();
    const ganancia = contexto.createGain();
    tono.type = 'triangle';
    tono.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0, inicio);
    ganancia.gain.linearRampToValueAtTime(volumen / 1000, inicio + 0.01);
    ganancia.gain.linearRampToValueAtTime(0, inicio + 0.15);
    tono.connect(ganancia);
    ganancia.connect(contexto.destination);
    tono.start(inicio);
    tono.stop(inicio + 0.15);
    tono.onended = () => { tono.disconnect(); ganancia.disconnect(); };
  });
}
