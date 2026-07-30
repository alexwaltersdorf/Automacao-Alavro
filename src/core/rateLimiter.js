/**
 * Token bucket para controlar o ritmo de envio.
 *
 * A Cloud API entrega 80 mensagens/segundo por padrão (até 1000/s mediante
 * solicitação), mas números novos devem ser "aquecidos" devagar: disparar no
 * limite logo de início derruba a nota de qualidade e leva a bloqueio.
 *
 * Suporta recuo dinâmico: ao receber erro de throttle da Meta, o dispatcher
 * chama `backoff()` e o ritmo cai pela metade, recuperando gradualmente.
 */
export class RateLimiter {
  /**
   * @param {number} ratePerSecond capacidade nominal (tokens/segundo)
   * @param {object} [options]
   * @param {() => number} [options.now] injetável para testes
   * @param {(ms: number) => Promise<void>} [options.sleep] injetável para testes
   */
  constructor(ratePerSecond, options = {}) {
    this.nominalRate = Math.max(0.1, ratePerSecond);
    this.currentRate = this.nominalRate;
    this.capacity = Math.max(1, Math.ceil(this.nominalRate));
    this.tokens = this.capacity;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.lastRefill = this.now();
    this.minRate = options.minRate ?? 1;
  }

  refill() {
    const timestamp = this.now();
    const elapsedSeconds = (timestamp - this.lastRefill) / 1000;
    if (elapsedSeconds <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.currentRate);
    this.lastRefill = timestamp;
  }

  /** Aguarda até haver um token disponível e o consome. */
  async acquire() {
    for (;;) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const deficit = 1 - this.tokens;
      const waitMs = Math.max(5, Math.ceil((deficit / this.currentRate) * 1000));
      await this.sleep(waitMs);
    }
  }

  /** Tenta consumir um token sem esperar. */
  tryAcquire() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** A Meta sinalizou excesso de requisições: corta o ritmo pela metade. */
  backoff() {
    this.currentRate = Math.max(this.minRate, this.currentRate / 2);
    this.tokens = 0;
    return this.currentRate;
  }

  /** Envio bem-sucedido: recupera 10% em direção ao ritmo nominal. */
  recover() {
    if (this.currentRate >= this.nominalRate) return this.currentRate;
    this.currentRate = Math.min(this.nominalRate, this.currentRate * 1.1);
    return this.currentRate;
  }

  setRate(ratePerSecond) {
    this.nominalRate = Math.max(0.1, ratePerSecond);
    this.currentRate = Math.min(this.currentRate, this.nominalRate);
    this.capacity = Math.max(1, Math.ceil(this.nominalRate));
  }

  stats() {
    return {
      nominalRate: Number(this.nominalRate.toFixed(2)),
      currentRate: Number(this.currentRate.toFixed(2)),
      tokens: Number(this.tokens.toFixed(2)),
    };
  }
}

export default RateLimiter;
