# texcv pipeline config reference

Config files live in `texcv/configs/*.json`. Pass one with:

```bash
make cv CV_CONFIG=texcv/configs/myconfig.json
# or directly:
node texcv/build.js --config texcv/configs/myconfig.json
```

Default config: `texcv/configs/default.json`

---

## Top-level

| Key | Type | Description |
|-----|------|-------------|
| `lang` | string | Language code for data files (`en`, `fi`). Reads `skill.{lang}.json` etc. |

---

## `page`

Controls geometry package settings.

| Key | Default | Description |
|-----|---------|-------------|
| `margin_top` | `"2.5cm"` | Top margin |
| `margin_bottom` | `"2cm"` | Bottom margin |
| `margin_left` | `"2cm"` | Left margin |
| `margin_right` | `"2cm"` | Right margin |
| `paper` | `"a4paper"` | Paper size (`a4paper`, `letterpaper`, etc.) |

---

## `font`

| Key | Default | Description |
|-----|---------|-------------|
| `family` | `"lmodern"` | Font family (currently only `lmodern` supported) |
| `size` | `11` | Base font size in pt |

---

## `contact`

| Key | Default | Description |
|-----|---------|-------------|
| `separator` | `"|"` | String between contact items in the header line |

---

## `sections`

Each section has at minimum an `enabled` boolean and a `heading` string.
Disabled sections are completely omitted from the output.

### `intro`

Renders the body of a single intro MD file.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Profile"` | Section heading |
| `id` | `"myIntro"` | ID of the intro file to use (`data_storage/intro/{id}.{lang}.md`) |

---

### `education`

Two-column table (years | content), newest institution first.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Education"` | Section heading |
| `show_courses` | `true` | Whether to list relevant courses under each institution |
| `min_course_grade` | `null` | Minimum numeric grade to include a course (as a string, compared numerically). `null` = include all. |
| `course_grading_systems` | `["1-5"]` | Only include courses whose `grading_system` matches one of these values. Use `[]` for all. |
| `course_include_tags` | `[]` | If non-empty, only courses with at least one matching tag are shown |
| `course_exclude_tags` | `[]` | Courses with any of these tags are excluded |

---

### `publications`

Bullet list of publications/theses.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Publications & Theses"` | Section heading |
| `published_only` | `false` | If `true`, only entries with `status: "published"` are shown |
| `include_tags` | `[]` | If non-empty, only items that have at least one of these tags are included |
| `exclude_tags` | `[]` | Items with any of these tags are excluded |

---

### `work`

Two-column table (years | content), sorted by priority then recency.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Work Experience"` | Section heading |
| `include_tags` | `[]` | If non-empty, only items with at least one matching tag |
| `exclude_tags` | `["TET"]` | Items with any of these tags are excluded |
| `prioritize_tags` | `[]` | Items matching more of these tags sort higher |
| `max` | `null` | Maximum number of entries to show (`null` = all) |

---

### `projects`

Bullet list of portfolio projects, sorted by priority then recency.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Selected Projects"` | Section heading |
| `include_tags` | `[]` | If non-empty, only items with at least one matching tag |
| `exclude_tags` | `[]` | Items with any of these tags are excluded |
| `prioritize_tags` | `[]` | Items matching more of these tags sort higher |
| `max` | `6` | Maximum number of entries to show (`null` = all) |

---

### `languages`

Two-column table. Non-matriculation languages first (sorted by proficiency level), then Finnish matriculation exam results (sorted by level, then grade).

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Languages"` | Section heading |

---

### `programming_languages`

Bullet list from skills with `category: "programming_language"`, sorted by proficiency.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Programming Languages"` | Section heading |
| `exclude_ids` | `[]` | Skill IDs to omit (e.g. `["langJs"]`) |

---

### `databases`

Bullet list from skills with `category: "database"`, sorted by proficiency.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Databases"` | Section heading |
| `exclude_ids` | `[]` | Skill IDs to omit |

---

### `other_tools`

Bullet list from skills with `category: "tool"`, `"platform"`, or `"framework"`, sorted by proficiency.

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Include this section |
| `heading` | `"Tools & Platforms"` | Section heading |
| `exclude_ids` | `[]` | Skill IDs to omit |

---

## Proficiency levels (for sorting reference)

`professional` > `proficient` > `familiar` > `beginner`

## Matriculation grade levels (for sorting reference)

Level: `native` > `advanced` > `intermediate`
Grade: `L` > `E` > `M` > `C` > `B` > `A` > `I`
