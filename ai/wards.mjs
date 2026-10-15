import { randomUUID } from 'node:crypto';

export class Wards {
  constructor(store, { now = Date.now, visit, available = async () => true, notify = () => {} }) { Object.assign(this, { store, now, visit, available, notify }); this.items = []; this.running = false; }
  async init() {
    this.items = await this.store.read('wards', []);
    for (const item of this.items) if (item.status === 'visiting') { item.status = 'uncertain'; this.notify('一次回访被中断，请检查后再重试。'); }
    await this.save();
  }
  save() { return this.store.write('wards', this.items); }
  async add(target, hours, harness) {
    const item = { id: randomUUID(), target, harness, dueAt: this.now() + hours * 3600000, status: 'pending' };
    this.items.push(item); await this.save(); return item;
  }
  async cancel(windowId) {
    let count = 0;
    for (const item of this.items) if (item.target.id === windowId && item.status === 'pending') { item.status = 'cancelled'; count++; }
    await this.save(); return count;
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      if (!await this.available()) return;
      for (const item of this.items) {
        if (item.status !== 'pending' || item.dueAt > this.now()) continue;
        item.status = 'visiting'; await this.save();
        try { await this.visit(item); item.status = 'completed'; }
        catch (error) { item.status = 'failed'; item.error = error.message; this.notify(`回访失败：${error.message}`); }
        await this.save();
      }
    } finally { this.running = false; }
  }
}
