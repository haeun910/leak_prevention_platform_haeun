const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "datasets", "generated_entities");
const COUNT = 5000;
const LABEL = "NON_ENTITY";

let seed = 914202605;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
}

function pick(items) {
  return items[Math.floor(rand() * items.length)];
}

function int(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function chance(rate) {
  return rand() < rate;
}

function pad(num, width) {
  return String(num).padStart(width, "0");
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function render(template, values) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

function hasBatchim(text) {
  const ch = text[text.length - 1];
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function particle(text, pair) {
  const batchim = hasBatchim(text);
  if (pair === "이/가") return batchim ? "이" : "가";
  if (pair === "은/는") return batchim ? "은" : "는";
  if (pair === "을/를") return batchim ? "을" : "를";
  if (pair === "와/과") return batchim ? "과" : "와";
  if (pair === "으로/로") {
    const code = text.charCodeAt(text.length - 1);
    const jong = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
    return jong !== 0 && jong !== 8 ? "으로" : "로";
  }
  throw new Error(`unknown particle pair: ${pair}`);
}

function withParticle(text, pair) {
  return `${text}${particle(text, pair)}`;
}

function asciiToken(length, chars) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(rand() * chars.length)];
  return out;
}

function makeRow(type, index, text, entityText) {
  const start = text.indexOf(entityText);
  if (start < 0) throw new Error(`${type}: span not found: ${entityText} / ${text}`);
  if (text.indexOf(entityText, start + entityText.length) !== -1) {
    throw new Error(`${type}: ambiguous span: ${entityText} / ${text}`);
  }
  const end = start + entityText.length;
  if (text.slice(start, end) !== entityText) throw new Error(`${type}: span mismatch`);
  return {
    id: `${type.toLowerCase()}_non_entity_${pad(index, 6)}`,
    text,
    entity_type: type,
    entity_text: entityText,
    start,
    end,
    label: LABEL,
  };
}

function looksLowQuality(text) {
  return (
    text.includes("{") ||
    text.includes("}") ||
    /요청 요청|처리 처리|메모 메모|확인 확인|까지까지|입니다입니다/.test(text) ||
    /팀은은|부서는|부서은|층로|층를|건는|시간가|시간로|차는|차로|정기-\d+은|오후-\d+를|사번는/.test(text)
  );
}

function polishText(text) {
  return text
    .replace(/PMO은/g, "PMO는")
    .replace(/([0-9])를/g, "$1을")
    .replace(/([0-9])가/g, "$1이")
    .replace(/([0-9])는/g, "$1은");
}

function readExistingTexts() {
  const texts = new Set();
  if (!fs.existsSync(OUT_DIR)) return texts;
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (!file.endsWith(".csv")) continue;
    const full = path.join(OUT_DIR, file);
    const rows = fs.readFileSync(full, "utf8").split(/\r?\n/).slice(1);
    for (const line of rows) {
      if (!line.trim()) continue;
      const match = line.match(/^([^,]+),("(?:(?:"")|[^"])*"|[^,]*),/);
      if (match) texts.add(match[2].replace(/^"|"$/g, "").replace(/""/g, '"'));
    }
  }
  return texts;
}

function generateType(type, generator, globalTexts) {
  const rows = [];
  const texts = new Set();
  const entities = new Set();
  let attempts = 0;

  while (rows.length < COUNT) {
    attempts += 1;
    if (attempts > COUNT * 700) throw new Error(`${type}: too many attempts`);
    const generated = generator(rows.length + 1);
    const entity = generated.entity;
    const text = polishText(generated.text);
    if (!text || !entity) continue;
    if (looksLowQuality(text)) continue;
    if (text === entity || text.length < 16 || text.length > 130) continue;
    if (texts.has(text) || globalTexts.has(text)) continue;
    if (entities.has(entity)) continue;
    const row = makeRow(type, rows.length + 1, text, entity);
    rows.push(row);
    texts.add(text);
    entities.add(entity);
    globalTexts.add(text);
  }

  return rows;
}

function writeCsv(type, rows) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${type.toLowerCase()}_non_entity_5000.csv`);
  const header = ["id", "text", "entity_type", "entity_text", "start", "end", "label"];
  const lines = [header.join(",")];
  for (const row of rows) lines.push(header.map((key) => csvEscape(row[key])).join(","));
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return file;
}

const teams = ["보안팀", "인프라팀", "플랫폼팀", "클라우드운영팀", "데이터팀", "개발팀", "QA팀", "서비스기획팀", "PMO", "고객성공팀", "CS팀", "영업팀", "재무팀", "법무팀", "구매팀", "계약관리팀", "감사실", "마케팅팀", "SRE팀", "DBA그룹", "교육지원팀", "파트너운영팀"];
const channels = ["메일", "슬랙", "팀즈", "결재함", "운영 로그", "Jira 티켓", "회의록", "감사 대응표", "보안 점검표", "구매 요청서", "정산 메모", "배포 노트", "온보딩 체크리스트"];
const systems = ["ERP", "CRM", "SSO", "VPN", "GitLab", "Jenkins", "Datadog", "Zendesk", "Confluence", "SAP", "Tableau", "Snowflake", "Kubernetes", "Okta", "ServiceNow", "Redmine"];

const roles = ["담당자", "관리자", "승인자", "검토자", "운영자", "배포 담당", "계약 담당", "현장 담당", "헬프데스크", "온콜 담당", "품질 책임", "보안 책임", "정산 담당", "고객 응대 담당"];
const personNegativeTemplates = [
  "{E} 역할은 아직 개인 이름으로 배정되지 않았습니다.",
  "{CHANNEL}에는 {E}만 표시되고 실제 담당자 이름은 비공개 처리되었습니다.",
  "{TEAM}의 {E_SUBJ} 티켓을 확인할 예정입니다.",
  "{E} 계정으로 접수된 요청은 개인 실명 정보가 아닙니다.",
  "{SYSTEM} 알림 수신자는 {E} 그룹으로 설정되어 있습니다.",
  "고객 회신란에는 {E_QUOTE}만 적혀 있어 실명 확인이 필요합니다.",
  "{CHANNEL} 코멘트에 {E} 직무명이 남아 있습니다.",
  "{TEAM}은 {E} 직책 기준으로 결재선을 구성했습니다.",
];

function genPersonNon(index) {
  const entity = chance(0.45)
    ? `${pick(teams)} ${pick(roles)} ${pick(["A", "B", "C", "1조", "2조", "3조", "공용"])}-${pad(index, 4)}`
    : `${pick(["공용", "야간", "주간", "임시", "대체", "온콜", "백업"])} ${pick(roles)} ${pick(["큐", "그룹", "계정", "슬롯"])}-${pad(index, 4)}`;
  const text = render(pick(personNegativeTemplates), { E: entity, E_SUBJ: withParticle(entity, "이/가"), E_QUOTE: `${entity}${hasBatchim(entity) ? "이라고" : "라고"}`, TEAM: pick(teams), CHANNEL: pick(channels), SYSTEM: pick(systems) });
  return { text, entity };
}

const regions = ["강남", "판교", "상암", "송도", "여의도", "성수", "구로", "잠실", "분당", "마곡", "해운대", "센텀", "대덕", "세종", "제주", "광교", "동탄", "수원", "대전", "부산"];
const placeNames = ["회의실 A", "대회의실", "서버실", "옥상 테라스", "지하 주차장", "1층 로비", "고객 라운지", "교육장", "공용 창고", "물류센터", "A동 출입구", "B1 보관소", "3층 탕비실", "현장 사무소"];
const addressNegativeTemplates = [
  "{E} 근처에서 고객 미팅이 예정되어 있습니다.",
  "방문자는 {E}에서 대기하라는 안내를 받았습니다.",
  "{CHANNEL}에는 {E}까지만 적혀 있어 정확한 주소가 아닙니다.",
  "{TEAM}은 {E} 지역 담당 영업 현황을 공유했습니다.",
  "행사 장소는 {E}로 표시되었지만 상세 주소는 별도 공지 예정입니다.",
  "{E} 이용 예약은 총무팀에서 관리합니다.",
  "{SYSTEM} 위치 태그가 {E}로 저장되었습니다.",
  "배송지는 아직 확정되지 않았고 {E}만 후보로 남아 있습니다.",
];

function genAddressNon(index) {
  const entity = chance(0.55)
    ? `${pick(regions)} ${pick(["권역", "상권", "담당 구역", "배송 권역"])}-${pad(index, 4)}`
    : `${pick(placeNames)} ${pick(["예약", "대기", "점검", "교육"])}-${pad(index, 4)}`;
  return { text: render(pick(addressNegativeTemplates), { E: entity, TEAM: pick(teams), CHANNEL: pick(channels), SYSTEM: pick(systems) }), entity };
}

const pwNegativeKinds = ["주문번호", "운송장 번호", "장비 시리얼", "사번", "쿠폰 코드", "좌석 번호", "접수 번호", "문의 번호", "전화번호 끝자리", "보증 등록 번호", "자산 태그", "예약 번호"];
const serialPrefixes = ["OD", "SO", "PO", "TRK", "AS", "EQ", "EMP", "CPN", "RMA", "TKT", "SN", "RSV"];
const pwNegativeTemplates = [
  "{E}는 {K}라서 비밀번호로 사용하면 안 됩니다.",
  "{CHANNEL}에 공유된 {K} {E}는 로그인 암호가 아닙니다.",
  "{TEAM}은 {K} {E} 기준으로 처리 이력을 조회했습니다.",
  "고객 확인용 {K_TOPIC} {E}이며 계정 비밀번호와 무관합니다.",
  "{SYSTEM} 화면의 {E} 값은 {K} 필드에 저장됩니다.",
  "{K} {E_SUBJ} 접수되었지만 패스워드 변경 대상은 아닙니다.",
];

function genPasswordNon() {
  const kind = pick(pwNegativeKinds);
  let entity;
  if (kind.includes("끝자리")) entity = String(int(1000, 9999));
  else if (kind === "사번") entity = `${pick(["A", "B", "C", "D", "HR", "IT"])}${int(100000, 999999)}`;
  else entity = `${pick(serialPrefixes)}-${int(100000, 999999)}-${asciiToken(3, "ABCDEFGHJKLMNPQRSTUVWXYZ")}`;
  return { text: render(pick(pwNegativeTemplates), { E: entity, E_SUBJ: withParticle(entity, "이/가"), K: kind, K_TOPIC: withParticle(kind, "은/는"), TEAM: pick(teams), CHANNEL: pick(channels), SYSTEM: pick(systems) }), entity };
}

const tokenKinds = ["추적 ID", "요청 ID", "상관관계 ID", "세션 로그 ID", "쿠폰 번호", "빌드 해시", "배포 태그", "테스트 케이스 ID", "파일 체크섬", "샘플 토큰", "마스킹 예시값"];
const apiNegativeTemplates = [
  "{E}는 {K}이며 인증용 API 키가 아닙니다.",
  "{CHANNEL}에 남은 {K} {E}는 호출 권한을 부여하지 않습니다.",
  "{TEAM}은 {K} {E}로 로그를 추적했습니다.",
  "문서 예시에 포함된 {E}는 실제 토큰이 아닌 더미 값입니다.",
  "{SYSTEM} 대시보드의 {K} 값은 {E}로 표시됩니다.",
  "테스트 안내서에는 {E}를 예시 문자열로 사용했습니다.",
];

function genApiKeyNon() {
  const kind = pick(tokenKinds);
  let entity;
  if (kind.includes("해시") || kind.includes("체크섬")) entity = asciiToken(int(12, 24), "abcdef0123456789");
  else if (kind.includes("쿠폰")) entity = `CP-${asciiToken(4, "ABCDEFGHJKLMNPQRSTUVWXYZ")}-${int(1000, 9999)}`;
  else if (kind.includes("태그")) entity = `release-${int(2024, 2027)}.${int(1, 12)}.${int(0, 99)}`;
  else entity = `${pick(["REQ", "TRACE", "LOG", "CASE", "SAMPLE"])}-${asciiToken(8, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")}-${int(10, 99)}`;
  return { text: render(pick(apiNegativeTemplates), { E: entity, K: kind, TEAM: pick(teams), CHANNEL: pick(channels), SYSTEM: pick(systems) }), entity };
}

const publicFiles = ["README", "LICENSE", "CONTRIBUTING", "CHANGELOG", "CODEOWNERS", "NOTICE", "SECURITY", "SUPPORT", "sample", "template", "example", "placeholder", "demo", "mock_data", "styleguide"];
const publicExts = ["md", "txt", "pdf", "docx", "xlsx", "pptx", "json", "yaml", "yml"];
const documentNegativeTemplates = [
  "{E_TOPIC} 공개 템플릿 파일이라 계약 문서로 분류하지 않습니다.",
  "교육 자료에는 {E}를 예시 파일로 첨부했습니다.",
  "{CHANNEL}에 올라온 {E}는 샘플 문서입니다.",
  "{TEAM}은 {E}를 참고 양식으로만 사용했습니다.",
  "레포지토리의 {E} 파일은 업무 계약서가 아닙니다.",
  "{E_TOPIC} 빈 양식이라 외부 문서명 마스킹 대상에서 제외했습니다.",
  "사용자는 {E}를 내려받아 작성 양식만 확인했습니다.",
];

function genDocumentNon() {
  const entity = `${pick(publicFiles)}_${pick(["v1", "v2", "draft", "blank", "sample", "public", "guide"])}_${int(1, 999)}.${pick(publicExts)}`;
  return { text: render(pick(documentNegativeTemplates), { E: entity, E_TOPIC: withParticle(entity, "은/는"), TEAM: pick(teams), CHANNEL: pick(channels) }), entity };
}

const internalGroups = ["보안정책팀", "클라우드운영팀", "플랫폼개발팀", "고객지원센터", "품질관리그룹", "데이터분석실", "서비스기획파트", "PMO", "SRE셀", "DBA그룹", "정산운영팀", "교육지원팀", "감사대응TF", "릴리즈위원회"];
const productNames = ["Slack", "Teams", "Jira", "Confluence", "GitLab", "Figma", "Notion", "Tableau", "Snowflake", "Kubernetes", "Grafana", "Postman", "Linear", "Redmine"];
const orgNegativeTemplates = [
  "{E_TOPIC} 내부 부서명이라 외부 조직명으로 보지 않습니다.",
  "{CHANNEL}에는 {E} 담당으로만 표시되어 고객사명이 아닙니다.",
  "{E} 회의는 사내 운영 조직 기준으로 잡혔습니다.",
  "{SYSTEM} 알림 수신 그룹은 {E}입니다.",
  "{E} 사용 현황은 제품 또는 도구명 기준으로 집계했습니다.",
  "{TEAM}은 {E} 항목을 내부 협업 채널로 분류했습니다.",
  "계약 상대방이 아니라 {E}에서 접수한 내부 요청입니다.",
];

function genOrgNon(index) {
  const entity = chance(0.6)
    ? `${pick(internalGroups)} ${pick(["공용", "운영", "검토", "승인", "임시"])}-${pad(index, 4)}`
    : `${pick(productNames)} ${pick(["워크스페이스", "채널", "보드", "대시보드"])}-${pad(index, 4)}`;
  return { text: render(pick(orgNegativeTemplates), { E: entity, E_TOPIC: withParticle(entity, "은/는"), TEAM: pick(teams), CHANNEL: pick(channels), SYSTEM: pick(systems) }), entity };
}

const routineTasks = ["정기 점검", "업무 인수인계", "권한 검토", "운영 이관", "최종 검토", "회의 준비", "자료 취합", "로그 확인", "백업 점검", "월간 보고", "교육 신청", "좌석 배치", "휴가 일정", "장비 대여", "공지 발송"];
const projectNegativeTemplates = [
  "{E_TOPIC} 반복 업무명이라 공식 프로젝트명으로 분류하지 않습니다.",
  "{CHANNEL}에 등록된 {E} 일정은 프로젝트 코드가 아닙니다.",
  "{TEAM_TOPIC} {E_OBJ} 일반 운영 태스크로 처리했습니다.",
  "{E} 관련 자료는 정기 업무 문서함에 저장됩니다.",
  "이번 회의의 안건은 {E}이며 별도 프로젝트로 개설하지 않았습니다.",
  "{SYSTEM} 티켓의 {E} 항목은 워크플로 단계명입니다.",
  "{E_TOPIC} 담당자 업무 상태라 프로젝트명 마스킹 대상이 아닙니다.",
];

function genProjectNon(index) {
  const entity = `${pick(routineTasks)} ${pick(["1차", "2차", "오전", "오후", "월간", "분기", "임시", "정기"])}-${pad(index, 4)}`;
  const team = pick(teams);
  return { text: render(pick(projectNegativeTemplates), { E: entity, E_TOPIC: withParticle(entity, "은/는"), E_OBJ: withParticle(entity, "을/를"), TEAM: team, TEAM_TOPIC: withParticle(team, "은/는"), CHANNEL: pick(channels), SYSTEM: pick(systems) }), entity };
}

const countContexts = ["대기 건수", "로그 라인 수", "참석 인원", "알림 횟수", "대여 수량", "검토 페이지", "교육 시간", "회의 차수", "재시도 횟수", "좌석 번호", "버전 번호", "테스트 케이스 수", "메일 발송 횟수"];
const financialNegativeTemplates = [
  "{C_TOPIC} {E_AS} 집계되었지만 금액 정보는 아닙니다.",
  "{CHANNEL}에 기록된 {E_TOPIC} {C} 값입니다.",
  "{TEAM}은 {C} {E} 기준으로 업무량을 확인했습니다.",
  "보고서의 {E_TOPIC} 단순 수량이라 재무 수치로 보지 않습니다.",
  "{SYSTEM} 화면에는 {C_SUBJ} {E_AS} 표시됩니다.",
  "{E} 항목은 버전 또는 개수 정보라 금액 마스킹 대상이 아닙니다.",
];

function genFinancialNon(index) {
  const context = pick(countContexts);
  let entity;
  if (context.includes("버전")) entity = `v${int(1, 9)}.${int(0, 20)}.${index}`;
  else if (context.includes("좌석")) entity = `${pick(["A", "B", "C", "D"])}-${index}`;
  else if (context.includes("시간")) entity = `${index}시간`;
  else if (context.includes("차수")) entity = `${index}차`;
  else entity = `${index.toLocaleString("en-US")}건`;
  return {
    text: render(pick(financialNegativeTemplates), {
      E: entity,
      E_TOPIC: withParticle(entity, "은/는"),
      E_AS: withParticle(entity, "으로/로"),
      C: context,
      C_TOPIC: withParticle(context, "은/는"),
      C_SUBJ: withParticle(context, "이/가"),
      TEAM: pick(teams),
      CHANNEL: pick(channels),
      SYSTEM: pick(systems),
    }),
    entity,
  };
}

function validateRows(type, rows) {
  const ids = new Set();
  const texts = new Set();
  const entities = new Set();
  const bad = [];
  for (const row of rows) {
    if (ids.has(row.id)) bad.push(`duplicate id ${row.id}`);
    if (texts.has(row.text)) bad.push(`duplicate text ${row.id}`);
    if (entities.has(row.entity_text)) bad.push(`duplicate entity ${row.id}`);
    ids.add(row.id);
    texts.add(row.text);
    entities.add(row.entity_text);
    if (row.label !== LABEL || row.entity_type !== type) bad.push(`bad label/type ${row.id}`);
    if (row.text.slice(Number(row.start), Number(row.end)) !== row.entity_text) bad.push(`bad span ${row.id}`);
    if (looksLowQuality(row.text)) bad.push(`low quality ${row.id}`);
  }
  return {
    rows: rows.length,
    unique_ids: ids.size,
    unique_texts: texts.size,
    unique_entities: entities.size,
    bad_count: bad.length,
    bad_examples: bad.slice(0, 10),
    min_length: Math.min(...rows.map((r) => r.text.length)),
    max_length: Math.max(...rows.map((r) => r.text.length)),
    avg_length: Number((rows.reduce((sum, r) => sum + r.text.length, 0) / rows.length).toFixed(2)),
  };
}

const generators = {
  PERSON: genPersonNon,
  ADDRESS: genAddressNon,
  PASSWORD: genPasswordNon,
  API_KEY: genApiKeyNon,
  DOCUMENT: genDocumentNon,
  ORG: genOrgNon,
  PROJECT: genProjectNon,
  FINANCIAL: genFinancialNon,
};

const globalTexts = readExistingTexts();
const summary = [];
for (const [type, generator] of Object.entries(generators)) {
  const rows = generateType(type, generator, globalTexts);
  const validation = validateRows(type, rows);
  if (validation.bad_count) {
    console.error(type, validation);
    process.exit(1);
  }
  const file = writeCsv(type, rows);
  summary.push({ type, file, ...validation });
}

fs.writeFileSync(path.join(OUT_DIR, "non_entity_generation_summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.table(summary.map(({ type, rows, unique_entities, unique_texts, bad_count, min_length, max_length, avg_length }) => ({
  type,
  rows,
  unique_entities,
  unique_texts,
  bad_count,
  min_length,
  max_length,
  avg_length,
})));
