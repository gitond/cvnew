'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawnSync } = require('child_process');
const Ajv = require('ajv');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data_storage');
const SCHEMA_DIR = path.join(DATA_DIR, 'schemas');

const MD_TYPES = new Set(['intro', 'portfolio', 'blog_post', 'paragraphed_text']);
const EXCLUDED = new Set(['texcv_structure', 'webcv_structure']);

function loadSchemas() {
  const schemas = {};
  for (const f of fs.readdirSync(SCHEMA_DIR)) {
    if (!f.endsWith('.schema.json')) continue;
    const name = f.replace('.schema.json', '');
    if (EXCLUDED.has(name)) continue;
    schemas[name] = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8'));
  }
  return schemas;
}

function defaultFor(prop) {
  if (!prop) return null;
  if (Array.isArray(prop.type)) return null;   // nullable — default to null
  if (prop.enum) return prop.enum[0];
  switch (prop.type) {
    case 'string':  return '';
    case 'integer': return 0;
    case 'boolean': return false;
    case 'array':   return [];
    case 'object':  return {};
    default:        return null;
  }
}

function buildTemplate(schema, isMd) {
  const required = new Set(schema.required || []);
  const props = schema.properties || {};
  // Required fields first, then optional
  const ordered = [
    ...(schema.required || []),
    ...Object.keys(props).filter(k => !required.has(k)),
  ];
  const obj = {};
  for (const key of ordered) obj[key] = defaultFor(props[key]);

  if (isMd) return matter.stringify('\nWrite content here.\n', obj);
  return JSON.stringify(obj, null, 2);
}

function openEditor(content, ext) {
  const tmp = path.join(os.tmpdir(), `cvnew-${Date.now()}${ext}`);
  fs.writeFileSync(tmp, content, 'utf8');

  const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
  const result = spawnSync(editor, [tmp], { stdio: 'inherit' });
  if (result.error) throw result.error;

  const edited = fs.readFileSync(tmp, 'utf8');
  fs.unlinkSync(tmp);
  return edited;
}

function validateData(data, schema) {
  const ajv = new Ajv({ allErrors: true });
  const check = ajv.compile(schema);
  if (check(data)) return [];
  return check.errors.map(e => `  ${e.instancePath || '(root)'} ${e.message}`);
}

function saveJson(typeName, data) {
  const { lang, id } = data;
  if (!lang) throw new Error('Missing lang field');

  const filePath = path.join(DATA_DIR, `${typeName}.${lang}.json`);
  let arr = [];
  if (fs.existsSync(filePath)) {
    arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(arr)) throw new Error(`${path.relative(ROOT, filePath)} is not a JSON array`);
    if (id && arr.some(e => e.id === id)) {
      throw new Error(`id "${id}" already exists in ${path.relative(ROOT, filePath)}`);
    }
  }
  arr.push(data);
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2) + '\n', 'utf8');
  return filePath;
}

function saveMd(typeName, raw) {
  const fm = matter(raw).data;
  if (!fm.id)   throw new Error('Missing id in front matter');
  if (!fm.lang) throw new Error('Missing lang in front matter');

  const dir = path.join(DATA_DIR, typeName);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${fm.id}.${fm.lang}.md`);
  if (fs.existsSync(filePath)) throw new Error(`File already exists: ${path.relative(ROOT, filePath)}`);

  fs.writeFileSync(filePath, raw, 'utf8');
  return filePath;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

async function pickType(schemas) {
  const types = Object.keys(schemas).sort();
  console.log('\nSelect type:');
  types.forEach((t, i) => console.log(`  ${i + 1}. ${t} (${MD_TYPES.has(t) ? 'YAML+MD' : 'JSON'})`));
  const ans = await ask('\n> ');
  const idx = parseInt(ans, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= types.length) {
    console.error('Invalid selection.');
    process.exit(1);
  }
  return types[idx];
}

async function main() {
  const schemas = loadSchemas();
  const typeName = await pickType(schemas);
  const schema = schemas[typeName];
  const isMd = MD_TYPES.has(typeName);
  const ext = isMd ? '.md' : '.json';

  console.log(`\nOpening ${typeName} template in $EDITOR...`);
  let raw = openEditor(buildTemplate(schema, isMd), ext);

  for (;;) {
    let data;
    try {
      data = isMd ? matter(raw).data : JSON.parse(raw);
    } catch (e) {
      console.error(`\nParse error: ${e.message}`);
      const again = await ask('Re-open editor? (y/n) ');
      if (again.toLowerCase() === 'y') { raw = openEditor(raw, ext); continue; }
      process.exit(1);
    }

    const errors = validateData(data, schema);
    if (errors.length) {
      console.error('\nValidation errors:');
      errors.forEach(e => console.error(e));
      const again = await ask('Re-open editor? (y/n) ');
      if (again.toLowerCase() === 'y') { raw = openEditor(raw, ext); continue; }
      process.exit(1);
    }

    try {
      const saved = isMd ? saveMd(typeName, raw) : saveJson(typeName, JSON.parse(raw));
      console.log(`\nSaved: ${path.relative(ROOT, saved)}`);
    } catch (e) {
      console.error(`\nSave error: ${e.message}`);
      process.exit(1);
    }
    break;
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
