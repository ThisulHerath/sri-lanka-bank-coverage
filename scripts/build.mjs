import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
// Private local planning files must never be copied into a deployment artifact.
try {
  await stat(path.join(output, 'private'));
  throw new Error('Refusing to build: dist/private exists. Remove confidential data from the deployment output first.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const entry of ['index.html', 'directory.html', 'planner.html', 'src', 'vendor', 'assets']) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
console.log('Built static frontend in dist/');
