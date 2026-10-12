export class ActionGate {
  epoch = 0;
  allowed = false;
  tail = Promise.resolve();
  pause() { this.allowed = false; this.epoch++; }
  enable() { this.allowed = true; this.epoch++; }
  async idle() { await this.tail; }
  run(action, expectedEpoch = this.epoch) {
    const job = this.tail.then(async () => {
      if (!this.allowed || expectedEpoch !== this.epoch) throw new Error('Desktop action cancelled or not authorized by this ping');
      return action();
    });
    this.tail = job.catch(() => {});
    return job;
  }
}
