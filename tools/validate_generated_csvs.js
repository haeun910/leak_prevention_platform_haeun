const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "datasets", "generated_entities");
const badPattern = /층로|층를|그룹와|그룹로|원가 포함|사용료은|처리 처리|요청 요청|전환 전환|운영 운영전환|메모 메모|까지까지|[{}]|건는|시간가|시간로|사번는|PMO은/;

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

const files = fs.readdirSync(DIR)
  .filter((name) => /^(address|api_key|document|financial|org|password|person|project)_(non_)?entity_5000\.csv$/.test(name))
  .sort();

const globalTexts = new Set();
const globalIds = new Set();
const summary = [];
let total = 0;
let badSpans = 0;
let badPatterns = 0;
let duplicateTexts = 0;
let duplicateIds = 0;
const badPatternExamples = [];

for (const file of files) {
  const full = path.join(DIR, file);
  const lines = fs.readFileSync(full, "utf8").trimEnd().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((key, i) => [key, i]));
  const texts = new Set();
  const entities = new Set();
  let fileBadSpans = 0;
  let fileBadPatterns = 0;

  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    const id = row[idx.id];
    const text = row[idx.text];
    const entity = row[idx.entity_text];
    const start = Number(row[idx.start]);
    const end = Number(row[idx.end]);

    total += 1;
    if (globalIds.has(id)) duplicateIds += 1;
    globalIds.add(id);
    if (globalTexts.has(text)) duplicateTexts += 1;
    globalTexts.add(text);
    texts.add(text);
    entities.add(entity);
    if (text.slice(start, end) !== entity) {
      badSpans += 1;
      fileBadSpans += 1;
    }
    if (badPattern.test(text)) {
      badPatterns += 1;
      fileBadPatterns += 1;
      if (badPatternExamples.length < 30) badPatternExamples.push({ file, id, text });
    }
  }

  summary.push({
    file,
    rows: lines.length - 1,
    unique_texts: texts.size,
    unique_entities: entities.size,
    bad_spans: fileBadSpans,
    bad_patterns: fileBadPatterns,
  });
}

console.log(JSON.stringify({
  files: files.length,
  total,
  global_unique_texts: globalTexts.size,
  global_duplicate_texts: duplicateTexts,
  global_duplicate_ids: duplicateIds,
  bad_spans: badSpans,
  bad_patterns: badPatterns,
  bad_pattern_examples: badPatternExamples,
  summary,
}, null, 2));
