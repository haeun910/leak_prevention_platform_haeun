const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "datasets", "generated_entities");
const COUNT = 5000;
const LABEL = "ENTITY";

let seed = 78140514;
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

function render(template, values) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
  throw new Error(`unknown particle: ${pair}`);
}

function withParticle(text, pair) {
  return `${text}${particle(text, pair)}`;
}

function addressDir(text) {
  return `${text}${/[0-9]$/.test(text) ? "으로" : particle(text, "으로/로")}`;
}

function addressObj(text) {
  return `${text}${/[0-9]$/.test(text) ? "을" : particle(text, "을/를")}`;
}

function asciiToken(length, chars) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(rand() * chars.length)];
  return out;
}

function makeRow(type, index, text, entityText) {
  const start = text.indexOf(entityText);
  if (start < 0) throw new Error(`${type}: entity not found: ${entityText} / ${text}`);
  if (text.indexOf(entityText, start + entityText.length) !== -1) {
    throw new Error(`${type}: ambiguous entity: ${entityText} / ${text}`);
  }
  const end = start + entityText.length;
  if (text.slice(start, end) !== entityText) throw new Error(`${type}: bad span`);
  return {
    id: `${type.toLowerCase()}_${pad(index, 6)}`,
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
    /메모 메모/.test(text) ||
    /처리 처리/.test(text) ||
    /요청 요청/.test(text) ||
    /전환 전환/.test(text) ||
    /운영 운영전환/.test(text) ||
    /층로/.test(text) ||
    /그룹와|그룹로|회사와|회사로|컴퍼니와|컴퍼니로|코리아와|코리아로/.test(text) ||
    /원가 포함|만원가 포함|억원가 포함|천만원가 포함|사용료은|비용은|금액은|입찰가은|매출은/.test(text) ||
    /%로 보고|%로 다시 산정|%이며 변경/.test(text) ||
    /개선 개선/.test(text) ||
    /고도화 고도화/.test(text) ||
    /마이그레이션 마이그레이션/.test(text) ||
    /까지까지/.test(text) ||
    /입니다입니다/.test(text) ||
    /검토 검토/.test(text)
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
  const file = path.join(OUT_DIR, "person_entity_5000.csv");
  if (!fs.existsSync(file)) return texts;
  const data = fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1);
  for (const line of data) {
    if (!line.trim()) continue;
    const match = line.match(/^([^,]+),("(?:(?:"")|[^"])*"|[^,]*),/);
    if (match) texts.add(match[2].replace(/^"|"$/g, "").replace(/""/g, '"'));
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
    if (attempts > COUNT * 500) throw new Error(`${type}: too many attempts`);
    const generated = generator(rows.length + 1);
    const entity = generated.entity;
    const text = polishText(generated.text);
    if (!text || !entity) continue;
    if (looksLowQuality(text)) continue;
    if (text === entity || text.length < 18 || text.length > 140) continue;
    if (entities.has(entity)) continue;
    if (texts.has(text) || globalTexts.has(text)) continue;
    texts.add(text);
    globalTexts.add(text);
    entities.add(entity);
    rows.push(makeRow(type, rows.length + 1, text, entity));
  }
  return { rows, uniqueEntities: entities.size };
}

function writeCsv(type, rows) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${type.toLowerCase()}_entity_5000.csv`);
  const header = ["id", "text", "entity_type", "entity_text", "start", "end", "label"];
  const lines = [header.join(",")];
  for (const row of rows) lines.push(header.map((key) => csvEscape(row[key])).join(","));
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return file;
}

const channels = ["메일", "슬랙", "팀즈", "결재함", "운영 로그", "Jira 티켓", "회의록", "감사 대응표", "보안 점검표", "구매 요청서", "계약 검토 메모", "정산 메모", "배포 노트", "온보딩 체크리스트"];
const teams = ["보안팀", "인프라팀", "플랫폼팀", "클라우드운영팀", "데이터팀", "개발팀", "QA팀", "서비스기획팀", "PMO", "고객성공팀", "CS팀", "영업팀", "재무팀", "법무팀", "구매팀", "계약관리팀", "감사실", "마케팅팀", "SRE팀", "DBA그룹"];
const timeWords = ["오늘 오전", "오늘 오후", "금일 중", "내일 오전", "이번 주", "다음 주", "월말까지", "분기 마감 전", "배포 전", "계약 체결 전", "정산 마감 전", "감사 대응 중", "회의 전", "외부 발송 전"];

const areas = [
  ["서울시", ["강남구", "서초구", "마포구", "영등포구", "성동구", "송파구", "종로구", "중구", "노원구", "동작구"]],
  ["부산시", ["해운대구", "동래구", "수영구", "부산진구", "남구", "북구", "사상구", "연제구"]],
  ["대구시", ["수성구", "달서구", "중구", "동구", "북구", "서구", "남구"]],
  ["인천시", ["연수구", "남동구", "부평구", "서구", "중구", "미추홀구", "계양구"]],
  ["대전시", ["유성구", "서구", "중구", "동구", "대덕구"]],
  ["광주시", ["서구", "북구", "동구", "남구", "광산구"]],
  ["울산시", ["남구", "중구", "북구", "동구", "울주군"]],
  ["세종시", ["보람동", "아름동", "나성동", "어진동", "도담동", "새롬동"]],
  ["경기도", ["성남시 분당구", "수원시 영통구", "고양시 일산동구", "용인시 수지구", "화성시 동탄구", "안양시 동안구"]],
  ["강원도", ["춘천시", "원주시", "강릉시", "속초시"]],
  ["충청북도", ["청주시 흥덕구", "충주시", "제천시"]],
  ["충청남도", ["천안시 서북구", "아산시", "공주시", "서산시"]],
  ["전라북도", ["전주시 덕진구", "군산시", "익산시"]],
  ["전라남도", ["순천시", "여수시", "목포시", "나주시"]],
  ["경상북도", ["포항시 남구", "구미시", "경산시", "안동시"]],
  ["경상남도", ["창원시 성산구", "김해시", "진주시", "양산시"]],
  ["제주도", ["제주시", "서귀포시"]],
];
const roads = ["테헤란로", "판교역로", "센텀중앙로", "디지털로", "공단로", "중앙대로", "한강대로", "송도과학로", "충무로", "서부산로", "대덕대로", "월드컵북로", "가산디지털로", "분당내곡로", "국제금융로", "첨단과기로", "새만금로", "혁신대로"];
const dongs = ["역삼동", "서초동", "상암동", "문래동", "성수동", "잠실동", "중동", "범어동", "송도동", "구암동", "정자동", "마두동", "인후동", "팔용동", "삼평동", "청담동", "논현동", "도화동", "연희동"];
const buildings = ["센터필드", "파크타워", "스마트허브", "테크노밸리", "비즈니스센터", "그린빌딩", "메트로타워", "드림스퀘어", "한빛프라자", "시그니처몰", "파이낸스센터", "이노베이션타워", "클라우드캠퍼스"];
const addressTemplates = [
  "{TEAM} 현장 방문지는 {E_DIR} 등록되어 있습니다.",
  "{TIME} 장비 설치 장소를 {E_DIR} 확정했습니다.",
  "계약서상 사업장 소재지는 {E}입니다.",
  "반품 수거지는 {E}이며 오전 방문으로 예약했습니다.",
  "{CHANNEL}에 올라온 배송지 변경 주소는 {E}입니다.",
  "보안 점검 대상 사이트를 {E_DIR} 지정했습니다.",
  "고객사 청구지 주소가 {E_DIR} 변경되었습니다.",
  "온사이트 지원 위치는 {E}이며 출입 등록이 필요합니다.",
  "{TEAM_TOPIC} IDC 이전 대상 주소 {E_OBJ} 다시 확인했습니다.",
  "납품처 주소 {E}에 내일 장비가 도착할 예정입니다.",
  "{CHANNEL} 기록에 따르면 방문 예약 주소는 {E}입니다.",
  "현장 실사 보고서의 점검 위치는 {E}로 표기되어 있습니다.",
];

function genAddress() {
  const style = int(0, 4);
  const [city, districtList] = pick(areas);
  const district = pick(districtList);
  let entity;
  if (style === 0) entity = `${city} ${district} ${pick(roads)} ${int(1, 999)}-${int(1, 80)}`;
  else if (style === 1) entity = `${city} ${district} ${pick(dongs)} ${int(10, 999)}-${int(1, 99)}`;
  else if (style === 2) entity = `${district} ${pick(roads)} ${int(10, 900)} ${pick(buildings)} ${int(2, 35)}층`;
  else if (style === 3) entity = `${city} ${district} ${pick(roads)} ${int(1, 800)} ${pick(buildings)} ${int(101, 2600)}호`;
  else entity = `${city} ${district} ${pick(dongs)} ${int(100, 999)} ${pick(buildings)} ${int(1, 12)}동 ${int(101, 2505)}호`;
  const team = pick(teams);
  const text = render(pick(addressTemplates), { E: entity, E_DIR: addressDir(entity), E_OBJ: addressObj(entity), TEAM: team, TEAM_TOPIC: withParticle(team, "은/는"), TIME: pick(timeWords), CHANNEL: pick(channels) });
  return { text, entity };
}

const orgPrefixes = ["새벽", "한빛", "에이스", "블루", "그린", "프라임", "넥스트", "코어", "비전", "다온", "라온", "시너지", "유니온", "브릿지", "메가", "퓨처", "스마트", "클라우드", "데이터", "인사이트", "오로라", "루미", "핀", "크레딧", "하이퍼", "노바", "아틀라스", "세이프", "모던", "케어"];
const orgDomains = ["테크", "소프트", "네트웍스", "시스템즈", "데이터", "솔루션", "로지스", "파트너스", "랩스", "헬스", "모빌리티", "페이", "리테일", "에너지", "AI", "보안", "클라우드", "파이낸스", "커머스", "팩토리", "링크", "허브"];
const orgSuffixes = ["주식회사", "(주)", "유한회사", "컨소시엄", "코리아", "Inc.", "Labs", "Partners", "Networks", "그룹", "컴퍼니"];
const orgRegions = ["서울", "부산", "대전", "인천", "판교", "송도", "광주", "대구", "세종", "제주", "강남", "상암", "여의도", "구로", "성수", "분당"];
const orgTemplates = [
  "계약사는 {E_DIR} 등록되어 있습니다.",
  "{E} 측 담당자가 단가 조정을 요청했습니다.",
  "신규 고객사 {E}의 온보딩 일정을 확정했습니다.",
  "공급사 {E_WITH} 유지보수 조건을 재협의합니다.",
  "{E}의 보안 심사 결과를 {TEAM}에 공유해 주세요.",
  "입찰 참여 업체는 {E}입니다.",
  "하도급 업체 {E}에 작업 지시서를 발송했습니다.",
  "{CHANNEL}에 {E} 관련 계약 변경 요청이 올라왔습니다.",
  "정산 대상 법인은 {E}이며 증빙 보완이 필요합니다.",
  "이번 PoC는 {E_WITH} 공동으로 진행합니다.",
  "{TIME} {E} 담당자와 킥오프 미팅이 예정되어 있습니다.",
  "고객사 {E}의 서비스 이용 현황을 점검합니다.",
];

function genOrg() {
  const core = `${chance(0.28) ? pick(orgRegions) : ""}${pick(orgPrefixes)}${pick(orgDomains)}${chance(0.5) ? int(1, 999) : ""}`;
  const suffix = pick(orgSuffixes);
  const entity = suffix === "(주)" ? `${suffix}${core}` : `${core} ${suffix}`;
  const text = render(pick(orgTemplates), { E: entity, E_WITH: withParticle(entity, "와/과"), E_DIR: withParticle(entity, "으로/로"), TEAM: pick(teams), CHANNEL: pick(channels), TIME: pick(timeWords) });
  return { text, entity };
}

const projectDomains = ["결제", "보안", "검색", "CRM", "ERP", "데이터레이크", "인증", "모바일", "클라우드", "정산", "고객경험", "물류", "AI", "관제", "리스크", "마케팅", "권한관리", "파트너 API", "개인정보 파기", "장애 대응", "비용 최적화", "문서 자동화", "계약관리", "고객 포털", "운영 리포트", "데이터 품질", "알림센터", "권한 감사"];
const projectActions = ["고도화", "전환", "개편", "연동", "마이그레이션", "자동화", "통합", "분리", "최적화", "재구축", "상용화", "운영", "품질 개선", "표준화", "파일럿"];
const codeNames = ["Alpha", "Orion", "Nova", "Glacier", "Lynx", "Atlas", "Vertex", "Pulse", "Nimbus", "Forge", "Aster", "Zenith", "Delta", "Helios", "Mosaic", "Quartz", "Vector", "Signal"];
const projectTags = ["북미", "국내", "글로벌", "B2B", "B2C", "내부", "운영", "차세대", "레거시", "파일럿", "상용", "긴급", "표준", "통합", "보안"];
const projectTemplates = [
  "{E} 킥오프 회의가 내일 오전으로 잡혔습니다.",
  "{E}의 WBS를 최신 일정으로 업데이트했습니다.",
  "이번 분기 우선순위는 {E}입니다.",
  "{E} 관련 리스크를 PMO에 보고했습니다.",
  "고객 VOC는 {E} 범위에 포함됩니다.",
  "{E} 산출물 검토를 다음 주까지 완료해 주세요.",
  "개발팀은 {E} 배포 일정을 재조정했습니다.",
  "{E} 예산 변경안이 승인 대기 중입니다.",
  "아키텍처 리뷰 대상은 {E}입니다.",
  "{E} 담당팀과 보안팀 간 협의가 필요합니다.",
  "주간 보고서에 {E} 진행률을 추가했습니다.",
  "{CHANNEL}에 {E} 관련 일정 변경 요청이 등록되었습니다.",
];

function genProject() {
  let entity;
  if (chance(0.28)) entity = `${pick(codeNames)}-${chance(0.5) ? int(24, 29) : `Q${int(1, 4)}`}-${pick(["A", "B", "Pilot", "Ops", "Core", "Edge"])}${chance(0.35) ? `-${int(1, 99)}` : ""}`;
  else entity = `${chance(0.35) ? `${pick(projectTags)} ` : ""}${pick(projectDomains)} ${pick(projectActions)} ${pick(["Phase1", "Phase2", "2차", "3차", "파일럿", "운영전환", "2024", "2025", "Q1", "Q2", "Q3", "Q4"])}${chance(0.25) ? `-${int(1, 99)}` : ""}`;
  const text = render(pick(projectTemplates), { E: entity, CHANNEL: pick(channels) });
  return { text, entity };
}

const docSubjects = ["유지보수", "라이선스", "보안점검", "개인정보처리", "데이터이관", "클라우드전환", "마케팅대행", "공급계약", "SaaS이용", "장비임대", "서비스수준", "장애대응", "정산", "운영", "기술검토", "입찰", "위탁운영", "접근권한", "비밀유지", "하도급", "검수완료", "비용정산"];
const docKinds = ["계약서", "협약서", "제안서", "사업계획서", "검토보고서", "회의록", "견적서", "정산내역서", "기획안", "요구사항정의서", "보안검토서", "인수인계서", "MOU", "SLA", "변경요청서"];
const docExts = ["docx", "hwp", "hwpx", "pdf", "pptx", "xlsx", "doc"];
const configNames = ["db_config", "staging", "prod-secret", "backup", "deploy", "service_account", "pipeline", "release", "vault_policy", "oauth_client", "payment_webhook", "audit_rule"];
const configExts = ["env", "yml", "yaml", "conf", "json", "ini", "toml"];
const docTemplates = [
  "{E} 파일을 검토해 주세요.",
  "첨부된 {E}의 접근 권한을 요청합니다.",
  "{E} 최신본을 {TEAM}에 공유했습니다.",
  "법무팀에서 {E} 문구를 재검토 중입니다.",
  "서버에서 {E} 열람 이력이 확인되었습니다.",
  "{E} 초안을 오늘 중으로 회신해 주세요.",
  "계약 검토 대상 문서는 {E}입니다.",
  "{E}에 포함된 금액 조건을 확인해 주세요.",
  "보안 결재함에 {E}가 등록되었습니다.",
  "외부 공유 전 {E}를 마스킹해야 합니다.",
  "{CHANNEL}에 {E} 버전 충돌 이슈가 등록되었습니다.",
  "고객사에 전달할 {E} 최종본을 준비했습니다.",
];

function genDocument() {
  let entity;
  if (chance(0.18)) {
    entity = `${pick(configNames)}_${pick(["dev", "qa", "stage", "prod", "backup", "internal"])}_${int(1, 999)}.${pick(configExts)}`;
  } else {
    const year = chance(0.6) ? `${int(2023, 2027)}년 ` : "";
    entity = `${year}${pick(docSubjects)} ${pick(docKinds)}`;
    if (chance(0.35)) entity += ` ${pick(["초안", "최종본", "검토본", "개정본", "내부용", "외부공유본"])} ${int(1, 999)}`;
    if (chance(0.45)) entity = `${entity}.${pick(docExts)}`;
    if (chance(0.2)) entity = entity.replaceAll(" ", "_");
    if (chance(0.12)) entity = `${entity.replace(/\.[^.]+$/, "")}-v${int(1, 5)}.${int(0, 9)}.${pick(docExts)}`;
  }
  const text = render(pick(docTemplates), { E: entity, TEAM: pick(teams), CHANNEL: pick(channels) });
  return { text, entity };
}

const moneyContexts = ["계약 금액", "월 운영비", "입찰가", "예상 매출", "정산 금액", "유지보수 단가", "장비 단가", "위약금", "환급액", "분기 매출", "연간 비용", "라이선스 비용", "클라우드 사용료", "인센티브 지급액"];
const rateContexts = ["손실률", "영업이익률", "예산 집행률", "납기 준수율", "전환율", "마진율", "할인율", "성장률", "가동률", "환급 비율", "인센티브 비율"];
const financialTemplates = [
  "이번 안건의 {C_TOPIC} {E}입니다.",
  "회의록 기준 {C_SUBJ} {E_AS} 확정되었습니다.",
  "내부 검토 결과 {C_TOPIC} {E} 수준입니다.",
  "견적서에 기재된 {C}: {E}",
  "재무팀은 {C_OBJ} {E_AS} 보고했습니다.",
  "계약서상 {C_TOPIC} {E}이며 변경이 필요합니다.",
  "분기 보고서의 {C_TOPIC} {E_AS} 집계되었습니다.",
  "고객사 협의 후 {C_OBJ} {E_AS} 조정했습니다.",
  "승인 요청서에 {C} {E_SUBJ} 포함되어 있습니다.",
  "{CHANNEL}에 공유된 {C} 수치는 {E}입니다.",
  "{TEAM}은 {C_OBJ} {E_AS} 다시 산정했습니다.",
  "이사회 보고자료에는 {C_SUBJ} {E_AS} 표시되어 있습니다.",
];

function genFinancial() {
  const style = int(0, 5);
  let entity;
  let contextPool = moneyContexts;
  if (style === 0) entity = `${int(1, 980)}억 ${int(1, 9)}천만원`;
  else if (style === 1) entity = `${int(100, 999999).toLocaleString("en-US")}원`;
  else if (style === 2) {
    entity = `${int(1, 99)}.${int(0, 9)}%`;
    contextPool = rateContexts;
  }
  else if (style === 3) entity = `₩${int(1, 900).toLocaleString("en-US")},${pad(int(0, 999), 3)},000`;
  else if (style === 4) entity = `${int(1, 999)}만 ${int(1, 9999).toLocaleString("en-US")}원`;
  else entity = `${int(1, 25)}조 ${int(100, 9999).toLocaleString("en-US")}억원`;
  const context = pick(contextPool);
  const text = render(pick(financialTemplates), {
    E: entity,
    E_AS: withParticle(entity, "으로/로"),
    E_SUBJ: withParticle(entity, "이/가"),
    C: context,
    C_OBJ: withParticle(context, "을/를"),
    C_TOPIC: withParticle(context, "은/는"),
    C_SUBJ: withParticle(context, "이/가"),
    TEAM: pick(teams),
    CHANNEL: pick(channels),
  });
  return { text, entity };
}

const apiChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const hexChars = "abcdef0123456789";
const apiTemplates = [
  "API 호출 시 헤더에 X-API-KEY: {E}를 추가하세요.",
  "신규 API 키 {E}가 운영 콘솔에서 발급되었습니다.",
  "배치 서버 환경변수 API_TOKEN 값은 {E}입니다.",
  "웹훅 서명 검증용 secret은 {E}입니다.",
  "요청 헤더 Authorization 값에 {E}를 설정했습니다.",
  "연동 테스트용 credential {E}가 공유되었습니다.",
  "{CHANNEL}에 노출된 토큰 {E}를 즉시 폐기해 주세요.",
  "SDK 초기화 키로 {E}를 등록했습니다.",
  "외부 연동에는 {E} 키를 사용해야 합니다.",
  "현재 유효한 인증 키는 {E}입니다.",
  "{TEAM}에서 {E} 토큰의 만료일을 확인하고 있습니다.",
  "운영 콘솔에서 발급받은 접근 토큰은 {E}입니다.",
];

function genApiKey() {
  const style = int(0, 6);
  let entity;
  if (style === 0) entity = `sk_live_${asciiToken(38, apiChars)}`;
  else if (style === 1) entity = `ghp_${asciiToken(36, apiChars)}`;
  else if (style === 2) entity = `xoxb-${int(100000000, 999999999)}-${int(1000000000, 9999999999)}-${asciiToken(24, apiChars)}`;
  else if (style === 3) entity = `AKIA${asciiToken(16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")}`;
  else if (style === 4) entity = `Bearer.${asciiToken(12, apiChars)}.${asciiToken(28, apiChars)}`;
  else if (style === 5) entity = `${asciiToken(8, hexChars)}-${asciiToken(4, hexChars)}-${asciiToken(4, hexChars)}-${asciiToken(4, hexChars)}-${asciiToken(12, hexChars)}`;
  else entity = asciiToken(int(36, 52), apiChars);
  const text = render(pick(apiTemplates), { E: entity, CHANNEL: pick(channels), TEAM: pick(teams) });
  return { text, entity };
}

const pwBase = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const pwSpecial = "!@#$%^&*_-+=?";
const pwTemplates = [
  "임시 비밀번호는 {E}입니다.",
  "초기 로그인 PW: {E}",
  "서비스 계정 비밀번호를 {E}로 전달받았습니다.",
  "계정 복구용 임시 패스워드 {E}가 발급되었습니다.",
  "고객 포털 임시 비밀번호: {E}",
  "관리자 계정의 초기 암호는 {E}입니다.",
  "SMS로 발송된 일회용 비밀번호는 {E}입니다.",
  "테스트 계정 password 값은 {E}입니다.",
  "서버 접속용 임시 PW {E}를 폐기해 주세요.",
  "비상 계정 암호가 {E}로 설정되어 있습니다.",
  "셀프서비스 포털 패스워드: {E}",
  "{CHANNEL}에 공유된 임시 암호 {E}를 삭제해 주세요.",
  "{TEAM}은 {E} 비밀번호의 재사용 여부를 점검했습니다.",
  "장애 대응용 공유 비밀번호 {E}를 사용했습니다.",
];

function genPassword() {
  const style = int(0, 4);
  let entity;
  if (style === 0) entity = String(int(10000000, 99999999));
  else if (style === 1) entity = asciiToken(int(9, 18), pwBase);
  else if (style === 2) entity = `${asciiToken(int(5, 10), pwBase)}${pick(pwSpecial)}${asciiToken(int(3, 8), pwBase)}${int(0, 99)}`;
  else if (style === 3) entity = `${pick(pwSpecial)}${asciiToken(int(8, 20), pwBase + pwSpecial)}${pick(pwSpecial)}`;
  else entity = `${pick(["Tmp", "Init", "Reset", "Ops"])}-${asciiToken(int(6, 12), pwBase)}${pick(pwSpecial)}${int(10, 99)}`;
  const text = render(pick(pwTemplates), { E: entity, CHANNEL: pick(channels), TEAM: pick(teams) });
  return { text, entity };
}

function validateRows(type, rows) {
  const ids = new Set();
  const texts = new Set();
  const bad = [];
  for (const row of rows) {
    if (ids.has(row.id)) bad.push(`duplicate id ${row.id}`);
    if (texts.has(row.text)) bad.push(`duplicate text ${row.id}`);
    ids.add(row.id);
    texts.add(row.text);
    if (row.entity_type !== type || row.label !== LABEL) bad.push(`bad type/label ${row.id}`);
    if (row.text.slice(Number(row.start), Number(row.end)) !== row.entity_text) bad.push(`bad span ${row.id}`);
    if (looksLowQuality(row.text)) bad.push(`low quality ${row.id}`);
  }
  return {
    rows: rows.length,
    unique_ids: ids.size,
    unique_texts: texts.size,
    bad_count: bad.length,
    bad_examples: bad.slice(0, 10),
    min_length: Math.min(...rows.map((r) => r.text.length)),
    max_length: Math.max(...rows.map((r) => r.text.length)),
    avg_length: Number((rows.reduce((sum, r) => sum + r.text.length, 0) / rows.length).toFixed(2)),
  };
}

const generators = {
  ADDRESS: genAddress,
  PASSWORD: genPassword,
  API_KEY: genApiKey,
  DOCUMENT: genDocument,
  ORG: genOrg,
  PROJECT: genProject,
  FINANCIAL: genFinancial,
};

const globalTexts = readExistingTexts();
const summary = [];
for (const [type, generator] of Object.entries(generators)) {
  const { rows, uniqueEntities } = generateType(type, generator, globalTexts);
  const validation = validateRows(type, rows);
  if (validation.bad_count) {
    console.error(type, validation);
    process.exit(1);
  }
  const file = writeCsv(type, rows);
  summary.push({ type, file, unique_entities: uniqueEntities, ...validation });
}

fs.writeFileSync(path.join(OUT_DIR, "remaining_generation_summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
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
