import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistDir = path.resolve(__dirname, '../../client/dist');
const serverPublicDir = path.resolve(__dirname, '../public');

async function syncClientBuild() {
  await fs.rm(serverPublicDir, { recursive: true, force: true });
  await fs.mkdir(serverPublicDir, { recursive: true });
  await fs.cp(clientDistDir, serverPublicDir, { recursive: true });
  console.log(`✅ Copied frontend build: ${clientDistDir} -> ${serverPublicDir}`);
}

syncClientBuild().catch((err) => {
  console.error('❌ Failed to copy frontend build:', err.message);
  process.exit(1);
});
