import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const webDir = join('dist', 'etecfy', 'browser');
const csrIndex = join(webDir, 'index.csr.html');
const htmlIndex = join(webDir, 'index.html');

if (existsSync(htmlIndex)) process.exit(0);

if (!existsSync(csrIndex)) {
  console.error('Missing index.csr.html in', webDir);
  process.exit(1);
}

copyFileSync(csrIndex, htmlIndex);
console.log('Copied index.csr.html -> index.html');
