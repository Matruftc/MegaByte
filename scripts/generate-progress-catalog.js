// Run only against trusted repository data at build/test time, never user input.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sources = [
  ['snowflake', 'SF_PRJ/website/data.js', 'SF_DATA', 'questions'],
  ['python', 'PY_PRJ/website/data.js', 'PY_DATA', 'questions'],
  ['database', 'DB_PRJ/website/data.js', 'DB_DATA', 'questions'],
  ['java', 'JAVA_PRJ/data.js', 'JAVA_DATA', 'questions'],
  ['genz-prep', 'GenZ Prep Master _PRJ/data.js', 'JAVA_DATA', 'questions'],
  ['aws', 'AWS_PRJ/data.js', 'AWS_ACADEMY', 'lessons'],
  ['etl-elt', 'ETL_ELT_PRJ/data.js', 'ETL_ACADEMY_DATA', 'modules']
];
function generateCatalog() {
  const catalog = {};
  for (const [academy, file, global, kind] of sources) {
    const context = {window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{timeout:1000});
    const data = context.window[global];
    const items = kind === 'questions' ? data.sections.flatMap(s=>s.questions)
      : kind === 'lessons' ? data.modules.flatMap(m=>m.lessons) : data.modules;
    const ids = items.map(i=>String(i.id));
    if (!ids.length || ids.some(id=>!id || id==='undefined') || new Set(ids).size!==ids.length) throw new Error('Invalid academy IDs: '+academy);
    catalog[academy] = ids;
  }
  return catalog;
}
if (require.main === module) {
  const catalog = generateCatalog();
  fs.writeFileSync(path.join(root,'lib/progress-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  console.log('Progress catalog generated for '+Object.keys(catalog).length+' academies.');
}
module.exports = {generateCatalog};
