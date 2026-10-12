import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

export class Store {
  constructor(directory) { this.directory = directory; this.tail = Promise.resolve(); }
  async read(name, fallback) {
    try { return JSON.parse(await readFile(join(this.directory, `${name}.json`), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return structuredClone(fallback); throw error; }
  }
  write(name, value) {
    const body = JSON.stringify(value, null, 2);
    const job = this.tail.then(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const path = join(this.directory, `${name}.json`);
      await writeFile(`${path}.tmp`, body, { mode: 0o600 });
      await rename(`${path}.tmp`, path);
    });
    this.tail = job.catch(() => {});
    return job;
  }
}
