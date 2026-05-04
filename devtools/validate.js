'use strict';

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const matter = require('gray-matter');

const ajv = new Ajv({ allErrors: true });

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data_storage');
const SCHEMA_DIR = path.join(DATA_DIR, 'schemas');

const MD_TYPES = new Set(['intro', 'portfolio', 'blog_post', 'paragraphed_text']);
const SKIP_DIRS = new Set(['schemas', 'image']);

function loadSchemas() {
  const schemas = {};
  for (const file of fs.readdirSync(SCHEMA_DIR)) {
    if (!file.endsWith('.schema.json')) continue;
    const typeName = file.replace('.schema.json', '');
    schemas[typeName] = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8'));
  }
  return schemas;
}

function parseFile(filePath, isMd) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (isMd) return matter(raw).data;
  return JSON.parse(raw);
}

function run() {
  const schemas = loadSchemas();
  let errorCount = 0;

  const typeDirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !SKIP_DIRS.has(d.name))
    .map(d => d.name);

  for (const typeName of typeDirs) {
    const schema = schemas[typeName];
    if (!schema) {
      console.warn(`[warn] no schema for type "${typeName}" — skipping`);
      continue;
    }

    const validate = ajv.compile(schema);
    const isMd = MD_TYPES.has(typeName);
    const ext = isMd ? '.md' : '.json';
    const typeDir = path.join(DATA_DIR, typeName);

    for (const filename of fs.readdirSync(typeDir)) {
      if (!filename.endsWith(ext)) continue;
      const filePath = path.join(typeDir, filename);
      const rel = path.relative(ROOT, filePath);

      let data;
      try {
        data = parseFile(filePath, isMd);
      } catch (e) {
        console.error(`[fail] ${rel}\n  parse error: ${e.message}`);
        errorCount++;
        continue;
      }

      if (!validate(data)) {
        console.error(`[fail] ${rel}`);
        for (const err of validate.errors) {
          console.error(`  ${err.instancePath || '(root)'} ${err.message}`);
        }
        errorCount++;
      }
    }
  }

  if (errorCount > 0) {
    console.error(`\nValidation failed: ${errorCount} file(s) with errors.`);
    process.exit(1);
  }
  console.log('All files valid.');
}

run();
