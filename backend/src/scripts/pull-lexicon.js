import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync(new URL('../../../mobile/lib/lexicon.dart', import.meta.url), 'utf8');
const re = /^\s+'((?:\\'|[^'])*)':\s+Phrase\('((?:\\'|[^'])*)',\s+'((?:\\'|[^'])*)'\)/gm;
const out = {};
const un = (value) => value.replace(/\\'/g, "'").replace(/\\n/g, '\n');
let match = re.exec(src);
while (match) {
  out[un(match[1])] = { en: un(match[2]), ar: un(match[3]) };
  match = re.exec(src);
}
writeFileSync(new URL('../../../frontend/src/phrases.json', import.meta.url), JSON.stringify(out));
console.log(Object.keys(out).length);
