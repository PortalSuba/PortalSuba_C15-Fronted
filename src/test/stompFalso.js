// Cliente STOMP de mentira: guarda lo publicado y deja entregar mensajes a las suscripciones.
export const stompFalso = {
  cliente: null,
  publicados: [],
  conectar() { return this.cliente.conectar(); },
  cerrar() { this.cliente.config.onWebSocketClose?.(); },
  entregar(destino, cuerpo) {
    const body = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
    this.cliente.subs.filter((s) => s.destino === destino && s.activa).forEach((s) => s.cb({ body }));
  },
  suscritos() { return this.cliente.subs.filter((s) => s.activa).map((s) => s.destino); },
};

class ClienteFalso {
  constructor(config) {
    this.config = config;
    this.active = false;
    this.subs = [];
    this.connectHeaders = {};
    stompFalso.cliente = this;
  }
  activate() { this.active = true; }
  async conectar() {
    await this.config.beforeConnect?.();
    this.config.onConnect?.();
  }
  async deactivate() { this.active = false; }
  subscribe(destino, cb) {
    const s = { destino, cb, activa: true, unsubscribe: () => { s.activa = false; } };
    this.subs.push(s);
    return s;
  }
  publish(frame) { stompFalso.publicados.push(frame); }
}

export const modulo = { Client: ClienteFalso };
