/*
 * purchase-bot.js
 * ---------------
 * A reusable "limited-time product" purchase bot.
 *
 * The bot watches a store for a limited-time / flash-sale product and, the
 * moment it becomes available and within budget, races to reserve it and
 * complete checkout. It handles the drop-time wait, polling, stock/price
 * gating, a single-flight guard so it never double-buys, and bounded retries
 * with backoff.
 *
 * The bot talks to the store only through a small StoreClient interface, so
 * the same bot works against a real HTTP API or against the SimulatedStore
 * shipped here for the demo. To target a real store, implement:
 *
 *   getProduct(id)        -> { id, name, price, available, stock, dropAt }
 *   reserve(id, qty)      -> { reservationId }            (throws if sold out)
 *   checkout(reservationId, payment) -> { orderId }       (throws on failure)
 *
 * Nothing here contacts a real service; SimulatedStore is entirely in-memory.
 */

(function (global) {
  'use strict';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => Date.now();

  /**
   * A single limited-time purchase bot run.
   *
   * @param {object} opts
   * @param {StoreClient} opts.store    - store client (see interface above)
   * @param {string}   opts.productId   - product to buy
   * @param {number}   opts.maxPrice    - don't buy above this price
   * @param {number}   opts.quantity    - units to buy (default 1)
   * @param {object}   opts.payment     - opaque payment token passed to checkout
   * @param {number}   opts.pollMs      - poll interval while waiting (default 250ms)
   * @param {number}   opts.maxAttempts - max reserve/checkout attempts (default 40)
   * @param {number}   opts.deadlineMs  - give up this long after start (default 5min)
   * @param {function} opts.onLog       - (level, message) => void
   */
  class PurchaseBot {
    constructor(opts) {
      if (!opts || !opts.store) throw new Error('store is required');
      if (!opts.productId) throw new Error('productId is required');

      this.store = opts.store;
      this.productId = opts.productId;
      this.maxPrice = opts.maxPrice != null ? opts.maxPrice : Infinity;
      this.quantity = opts.quantity || 1;
      this.payment = opts.payment || { token: 'demo-card' };
      this.pollMs = opts.pollMs || 250;
      this.maxAttempts = opts.maxAttempts || 40;
      this.deadlineMs = opts.deadlineMs || 5 * 60 * 1000;
      this.onLog = opts.onLog || (() => {});

      this._running = false;
      this._buying = false; // single-flight guard: never attempt two buys at once
    }

    log(level, message) {
      this.onLog(level, message);
    }

    stop() {
      this._running = false;
    }

    /**
     * Run the bot to completion. Resolves with { ok, orderId } on a successful
     * purchase, or { ok: false, reason } if it gives up.
     */
    async run() {
      this._running = true;
      const startedAt = now();
      const deadline = startedAt + this.deadlineMs;
      let attempts = 0;

      this.log('info', `Watching "${this.productId}" (max $${this.maxPrice}, qty ${this.quantity}).`);

      while (this._running && now() < deadline) {
        let product;
        try {
          product = await this.store.getProduct(this.productId);
        } catch (err) {
          this.log('warn', `Poll failed: ${err.message}. Retrying…`);
          await sleep(this.pollMs);
          continue;
        }

        if (!product) {
          this.log('warn', 'Product not found. Retrying…');
          await sleep(this.pollMs);
          continue;
        }

        // Wait out the announced drop time without hammering the store.
        if (product.dropAt && now() < product.dropAt) {
          const remaining = product.dropAt - now();
          if (remaining > 2000) {
            this.log('info', `Drop in ${(remaining / 1000).toFixed(1)}s. Standing by…`);
            await sleep(Math.min(remaining - 1000, 2000));
            continue;
          }
          // Final second: poll tightly so we're first in line.
          await sleep(50);
          continue;
        }

        if (product.price > this.maxPrice) {
          this.log('warn', `Price $${product.price} exceeds max $${this.maxPrice}. Won't buy.`);
          await sleep(this.pollMs);
          continue;
        }

        if (!product.available || product.stock <= 0) {
          await sleep(this.pollMs);
          continue;
        }

        // In stock and within budget — attempt the purchase.
        if (this._buying) {
          await sleep(20);
          continue;
        }

        attempts++;
        if (attempts > this.maxAttempts) {
          this.log('error', `Gave up after ${this.maxAttempts} attempts.`);
          this._running = false;
          return { ok: false, reason: 'max-attempts' };
        }

        const result = await this._attemptPurchase(product, attempts);
        if (result) {
          this._running = false;
          return { ok: true, orderId: result.orderId };
        }
        // Purchase attempt failed (lost the race); loop and try again.
        await sleep(this.pollMs);
      }

      const reason = this._running ? 'deadline' : 'stopped';
      this.log('error', reason === 'deadline' ? 'Deadline reached without buying.' : 'Bot stopped.');
      this._running = false;
      return { ok: false, reason };
    }

    async _attemptPurchase(product, attempt) {
      this._buying = true;
      try {
        this.log('info', `In stock! Reserving ${this.quantity}× "${product.name}" (attempt ${attempt})…`);
        const { reservationId } = await this.store.reserve(this.productId, this.quantity);
        this.log('info', `Reserved (${reservationId}). Checking out…`);

        const { orderId } = await this.store.checkout(reservationId, this.payment);
        this.log('success', `✅ Purchased "${product.name}" for $${product.price}. Order ${orderId}.`);
        return { orderId };
      } catch (err) {
        this.log('warn', `Attempt ${attempt} failed: ${err.message}`);
        return null;
      } finally {
        this._buying = false;
      }
    }
  }

  /**
   * SimulatedStore — an in-memory flash-sale store for the demo.
   *
   * Models a limited-time product with a scheduled drop, limited stock, and
   * competing "other shoppers" who also grab units, so the bot has to actually
   * race. Reservations expire if not checked out promptly.
   */
  class SimulatedStore {
    constructor(cfg = {}) {
      const startIn = cfg.dropInMs != null ? cfg.dropInMs : 5000;
      this.product = {
        id: cfg.id || 'golden-paddle',
        name: cfg.name || 'Golden Paddle Skin (Limited)',
        price: cfg.price != null ? cfg.price : 25,
        stock: cfg.stock != null ? cfg.stock : 5,
        dropAt: now() + startIn,
      };
      this._reservations = new Map(); // id -> { qty, expiresAt }
      this._reservationSeq = 0;
      this._orderSeq = 0;
      this.reservationTtlMs = cfg.reservationTtlMs || 3000;
      this.latencyMs = cfg.latencyMs != null ? cfg.latencyMs : 40;

      // Rival shoppers periodically snap up stock once the drop is live.
      this.rivalIntervalMs = cfg.rivalIntervalMs || 0; // 0 = disabled
      if (this.rivalIntervalMs > 0) {
        this._rivalTimer = setInterval(() => this._rivalGrab(), this.rivalIntervalMs);
      }
    }

    dispose() {
      if (this._rivalTimer) clearInterval(this._rivalTimer);
    }

    _live() {
      return now() >= this.product.dropAt;
    }

    _reclaimExpired() {
      const t = now();
      for (const [id, r] of this._reservations) {
        if (r.expiresAt <= t) {
          this.product.stock += r.qty;
          this._reservations.delete(id);
        }
      }
    }

    _rivalGrab() {
      if (!this._live() || this.product.stock <= 0) return;
      // A rival buys 1 unit outright.
      this.product.stock -= 1;
    }

    async getProduct(id) {
      await sleep(this.latencyMs);
      this._reclaimExpired();
      if (id !== this.product.id) return null;
      const live = this._live();
      return {
        id: this.product.id,
        name: this.product.name,
        price: this.product.price,
        stock: live ? this.product.stock : 0,
        available: live && this.product.stock > 0,
        dropAt: this.product.dropAt,
      };
    }

    async reserve(id, qty) {
      await sleep(this.latencyMs);
      this._reclaimExpired();
      if (id !== this.product.id) throw new Error('unknown product');
      if (!this._live()) throw new Error('not on sale yet');
      if (this.product.stock < qty) throw new Error('sold out');
      this.product.stock -= qty;
      const reservationId = `r-${++this._reservationSeq}`;
      this._reservations.set(reservationId, { qty, expiresAt: now() + this.reservationTtlMs });
      return { reservationId };
    }

    async checkout(reservationId, _payment) {
      await sleep(this.latencyMs);
      const r = this._reservations.get(reservationId);
      if (!r) throw new Error('reservation expired');
      if (r.expiresAt <= now()) {
        this._reservations.delete(reservationId);
        this.product.stock += r.qty;
        throw new Error('reservation expired');
      }
      this._reservations.delete(reservationId);
      return { orderId: `order-${++this._orderSeq}` };
    }
  }

  const api = { PurchaseBot, SimulatedStore };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PurchaseBotLib = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
