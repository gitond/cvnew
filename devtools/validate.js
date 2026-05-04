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

function loadSchemas() {
  const schemas = {};
  for (const file of fs.readdirSync(SCHEMA_DIR)) {
    if (!file.endsWith('.schema.json')) continue;
    const typeName = file.replace('.schema.json', '');
    schemas[typeName] = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8'));
  }
  return schemas;
}

function run() {
  const schemas = loadSchemas();
  let errorCount = 0;

  for (const entry of fs.readdirSync(DATA_DIR, { withFileTypes: true })) {
    // ── JSON files at data_storage root ─────────────────────────────────────
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const filePath = path.join(DATA_DIR, entry.name);
      const rel = path.relative(ROOT, filePath);

      // {type}.{lang}.json → array of i18n entries
      // {type}.json        → single non-i18n object (texcv_structure, webcv_structure)
      const i18nMatch  = entry.name.match(/^(.+)\.(fi|en)\.json$/);
      const plainMatch = entry.name.match(/^(.+)\.json$/);
      const typeName = i18nMatch ? i18nMatch[1] : plainMatch ? plainMatch[1] : null;
      const isArray  = !!i18nMatch;

      if (!typeName) continue;
      const schema = schemas[typeName];
      if (!schema) { console.warn(`[warn] no schema for "${typeName}" — skipping ${rel}`); continue; }

      let parsed;
      try {
        parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error(`[fail] ${rel}\n  parse error: ${e.message}`);
        errorCount++;
        continue;
      }

      if (isArray && !Array.isArray(parsed)) {
        console.error(`[fail] ${rel}\n  expected a JSON array`);
        errorCount++;
        continue;
      }

      const validate = ajv.compile(schema);
      const items = isArray ? parsed : [parsed];
      items.forEach((item, i) => {
        if (!validate(item)) {
          const loc = isArray ? `${rel}[${i}]` : rel;
          console.error(`[fail] ${loc}`);
          validate.errors.forEach(e => console.error(`  ${e.instancePath || '(root)'} ${e.message}`));
          errorCount++;
        }
      });
    }

    // ── MD files in type subdirectories ─────────────────────────────────────
    if (entry.isDirectory() && MD_TYPES.has(entry.name)) {
      const typeName = entry.name;
      const schema = schemas[typeName];
      if (!schema) { console.warn(`[warn] no schema for "${typeName}" — skipping`); continue; }

      const validate = ajv.compile(schema);
      const typeDir = path.join(DATA_DIR, typeName);

      for (const filename of fs.readdirSync(typeDir)) {
        if (!filename.endsWith('.md')) continue;
        const filePath = path.join(typeDir, filename);
        const rel = path.relative(ROOT, filePath);

        let data;
        try {
          data = matter(fs.readFileSync(filePath, 'utf8')).data;
        } catch (e) {
          console.error(`[fail] ${rel}\n  parse error: ${e.message}`);
          errorCount++;
          continue;
        }

        if (!validate(data)) {
          console.error(`[fail] ${rel}`);
          validate.errors.forEach(e => console.error(`  ${e.instancePath || '(root)'} ${e.message}`));
          errorCount++;
        }
      }
    }
  }

  if (errorCount > 0) {
    console.error(`\nValidation failed: ${errorCount} error(s).`);
    process.exit(1);
  }
  console.log('All files valid.');
}

run();
