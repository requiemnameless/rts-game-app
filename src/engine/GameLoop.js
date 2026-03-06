/**
 * Core game loop with fixed timestep for deterministic updates
 */
export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.running = false;
    this.animFrameId = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDt = 1000 / 30; // 30 updates per second
    this.speed = 1;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  tick = () => {
    if (!this.running) return;

    const now = performance.now();
    let frameTime = now - this.lastTime;
    this.lastTime = now;

    // Cap frame time to prevent spiral of death
    if (frameTime > 250) frameTime = 250;

    this.accumulator += frameTime * this.speed;

    while (this.accumulator >= this.fixedDt) {
      this.updateFn(this.fixedDt / 1000);
      this.accumulator -= this.fixedDt;
    }

    this.renderFn();
    this.animFrameId = requestAnimationFrame(this.tick);
  };
}
