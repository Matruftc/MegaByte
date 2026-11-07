const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist-netlify');
const blockedDirs = new Set(['.git', '.netlify', '.vercel', 'node_modules', 'api', 'lib', 'netlify', 'scripts', 'tests', 'android', 'portfolio-app', 'dist-netlify', 'public', '__pycache__']);
const blockedNames = new Set(['server.js', 'package.json', 'package-lock.json', 'capacitor.config.json', 'vercel.json', 'netlify.toml', 'readme.md', 'backend_design.md', 'email_setup.md']);
const extensions = new Set(['.html','.css','.js','.mjs','.json','.svg','.png','.jpg','.jpeg','.webp','.gif','.ico','.woff','.woff2','.ttf','.otf','.mp3','.mp4','.wav','.webm','.pdf','.txt','.xml','.wasm']);
async function copy(source, destination, relative = '') {
  for (const entry of await fs.readdir(source, {withFileTypes:true})) {
    const name = entry.name, lower = name.toLowerCase();
    if (name.startsWith('.') || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (blockedDirs.has(lower)) continue;
      const next = path.join(destination, name);
      await fs.mkdir(next, {recursive:true});
      await copy(path.join(source, name), next, path.join(relative,name));
    } else if (entry.isFile() && !blockedNames.has(lower) && !lower.endsWith('.test.js') && !lower.endsWith('-qa.mjs') && extensions.has(path.extname(lower))) {
      await fs.copyFile(path.join(source,name), path.join(destination,name));
    }
  }
}
async function main() {
  // Output is fixed inside the checkout; this never removes source files.
  await fs.rm(output, {recursive:true, force:true});
  await fs.mkdir(output, {recursive:true});
  await copy(root, output);
  console.log('Netlify static files prepared in dist-netlify; server code and credentials excluded.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
