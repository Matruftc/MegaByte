import {readFileSync,writeFileSync,cpSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
let built=readFileSync(root+'assets/portfolio/index.html','utf8');
built=built.replaceAll('src="./assets/','src="assets/portfolio/assets/').replaceAll('href="./assets/','href="assets/portfolio/assets/');
built=built.replace('<title>Founder portfolios · MegaByte</title>','<title>Founder portfolios · MegaByte</title><meta name="description" content="Meet Matru and Bisal, the founders of MegaByte. Explore their background, interactive learning tools, and selected projects."><link rel="icon" href="assets/emblem-byte.svg">');
built=built.replace('<div id="root"></div>','<div id="root"></div><noscript><p>Meet Matru and Bisal, founders of MegaByte. Enable JavaScript to explore their portfolios, or <a href="index.html#founders">visit our founders section</a>.</p></noscript>');
// Shared data must load before the generated application module.
built=built.replace('<head>','<head><script src="assets/megabyte-data.js"></script>');
writeFileSync(root+'portfolio.html',built);
writeFileSync(root+'public/portfolio.html',built);
mkdirSync(root+'public/assets/portfolio',{recursive:true});
cpSync(root+'assets/portfolio',root+'public/assets/portfolio',{recursive:true});
console.log('Portfolio entry points and static assets updated in both site copies.');
