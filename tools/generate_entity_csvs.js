const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "datasets", "generated_entities");
const ROWS_PER_TYPE = 5000;
const LABEL = "ENTITY";

let seed = 20260514;
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

function writeCsv(type, rows) {
  const file = path.join(OUT_DIR, `${type.toLowerCase()}_entity_5000.csv`);
  const header = ["id", "text", "entity_type", "entity_text", "start", "end", "label"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(header.map((key) => csvEscape(row[key])).join(","));
  }
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return file;
}

function makeRow(type, index, text, entityText) {
  const start = text.indexOf(entityText);
  if (start < 0) throw new Error(`Entity not found: ${type} ${entityText} in ${text}`);
  if (text.indexOf(entityText, start + entityText.length) !== -1) {
    throw new Error(`Ambiguous entity occurrence: ${type} ${entityText} in ${text}`);
  }
  const end = start + entityText.length;
  if (text.slice(start, end) !== entityText) {
    throw new Error(`Span mismatch: ${type} ${entityText} in ${text}`);
  }
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

function render(template, entity) {
  return template.split("{E}").join(entity);
}

const channels = [
  "메일", "슬랙", "팀즈", "결재함", "티켓", "회의록", "운영 로그", "장애 보고서", "계약 검토 메모",
  "보안 점검표", "CS 이관 내역", "구매 요청서", "정산 메모", "온보딩 체크리스트", "배포 노트",
  "위험 평가표", "PMO 주간보고", "감사 대응표", "현장 방문 기록", "고객 요청서",
];
const teams = [
  "보안팀", "인프라팀", "플랫폼팀", "영업팀", "재무팀", "법무팀", "구매팀", "CS팀", "데이터팀",
  "마케팅팀", "품질관리팀", "클라우드운영팀", "계약관리팀", "서비스기획팀", "파트너운영팀",
  "개발1팀", "개발2팀", "PMO", "감사실", "고객성공팀",
];
const intents = [
  "확인 요청", "승인 대기", "변경 접수", "검토 필요", "공유 제한", "외부 전달 금지", "마스킹 필요",
  "권한 확인", "재발송 요청", "이관 완료", "보류 처리", "긴급 확인", "내부 공유", "추가 검토",
  "정정 요청", "접근 기록 확인", "원본 대조", "최종본 검토", "업데이트 예정", "삭제 요청",
];
const timePhrases = [
  "오늘 오전", "오늘 오후", "금일", "내일 오전", "이번 주", "다음 주", "월말까지", "분기 마감 전",
  "배포 전", "계약 체결 전", "정산 마감 전에", "온보딩 전에", "장애 종료 후", "검수 직후",
  "회의 전", "외부 발송 전", "감사 대응 중", "야간 배치 후", "릴리즈 직전", "결재 상신 전",
];
const stylePrefixes = [
  "", "", "", "[긴급] ", "[공유] ", "[확인] ", "[보안] ", "[내부] ", "FYI: ", "TODO: ",
  "담당자 메모: ", "운영 메모: ", "검토 의견: ", "결재 코멘트: ", "티켓 업데이트: ",
];
const styleSuffixes = [
  "", "", "", " 담당자 확인 바랍니다.", " 외부 공유 전 검토해 주세요.", " 원문 보관이 필요합니다.",
  " 접근 권한을 제한해 주세요.", " 변경 이력을 남겨 주세요.", " 관련 증빙에 첨부해 주세요.",
  " 승인 후 처리 가능합니다.", " 보안 검토 대상입니다.", " 재확인 후 회신 바랍니다.",
  " 고객 전달 전 마스킹해 주세요.", " 내부망에서만 열람 가능합니다.", " 이력 추적이 필요합니다.",
];

function contextualize(text) {
  const prefix = pick(stylePrefixes);
  const suffix = pick(styleSuffixes);
  if (chance(0.45)) {
    return `${prefix}${pick(channels)} / ${pick(teams)} / ${pick(intents)}: ${text}${suffix}`;
  }
  if (chance(0.35)) {
    return `${prefix}${pick(timePhrases)} ${pick(teams)}에서 ${text}${suffix}`;
  }
  return `${prefix}${text}${suffix}`;
}

function uniqueRows(type, generator) {
  const rows = [];
  const texts = new Set();
  const entities = new Set();
  let attempts = 0;
  while (rows.length < ROWS_PER_TYPE) {
    attempts += 1;
    if (attempts > ROWS_PER_TYPE * 100) {
      throw new Error(`Too many duplicate attempts for ${type}`);
    }
    const { text, entity } = generator(rows.length + 1);
    const key = `${text}`;
    if (texts.has(key)) continue;
    texts.add(key);
    entities.add(entity);
    rows.push(makeRow(type, rows.length + 1, text, entity));
  }
  return { rows, uniqueEntities: entities.size };
}

const surnames = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황",
  "안", "송", "류", "홍", "전", "고", "문", "양", "손", "배", "백", "허", "유", "남", "심", "노",
];
const givenA = [
  "민", "서", "지", "하", "도", "유", "준", "시", "현", "수", "예", "채", "은", "다", "아", "태",
  "연", "성", "재", "윤", "가", "나", "원", "우", "동", "승", "혜", "보", "규", "진", "영", "혁",
  "솔", "라", "린", "빈", "호", "율", "리", "찬",
];
const givenB = [
  "우", "아", "준", "윤", "현", "서", "민", "영", "진", "희", "호", "원", "빈", "율", "연", "경",
  "수", "정", "하", "림", "결", "찬", "겸", "온", "솔", "리", "별", "재", "훈", "혁", "미", "린",
  "담", "겸", "인", "주", "완", "석", "비", "안",
];
const personTitles = ["담당자", "매니저", "책임", "선임", "주임", "팀장", "파트장", "본부장", "연구원", "컨설턴트", "PM", "PO"];
const personTemplates = [
  "{E} 담당자가 접근 권한 신청서를 제출했습니다.",
  "승인 요청자는 {E}입니다.",
  "장애 처리 담당으로 {E} 팀장이 배정되었습니다.",
  "회의 참석자 명단에 {E} 책임을 추가해 주세요.",
  "{E}님에게 고객 문의 이관을 완료했습니다.",
  "결재 라인에서 {E} 선임의 검토가 필요합니다.",
  "보안 예외 신청자는 {E} 컨설턴트입니다.",
  "온사이트 방문자는 {E}으로 등록되어 있습니다.",
  "권한 만료 안내를 {E}에게 발송했습니다.",
  "인수인계 담당자는 {E} PM으로 변경되었습니다.",
  "법무 검토 요청을 {E} 본부장에게 전달했습니다.",
  "{E} 연구원이 데이터 반출 사유서를 작성했습니다.",
  "계약 검토 담당자: {E}",
  "비상 연락망에 {E} 주임을 추가했습니다.",
  "배포 승인자는 {E}입니다.",
  "고객 미팅은 {E} 매니저가 주관합니다.",
];

function genPerson() {
  const name = `${pick(surnames)}${pick(givenA)}${pick(givenB)}`;
  const entity = chance(0.1) ? `${name}${pick(personTitles)}` : name;
  const text = render(pick(personTemplates), entity);
  return { text, entity };
}

const cities = ["서울시", "부산시", "대구시", "인천시", "광주시", "대전시", "울산시", "세종시", "경기도", "강원도", "충청북도", "충청남도", "전라북도", "전라남도", "경상북도", "경상남도"];
const districts = ["강남구", "서초구", "마포구", "영등포구", "성동구", "송파구", "해운대구", "수성구", "연수구", "유성구", "분당구", "일산동구", "덕진구", "창원구", "동래구", "남동구", "중구", "서구", "북구"];
const roads = ["테헤란로", "판교역로", "센텀중앙로", "디지털로", "공단로", "중앙대로", "한강대로", "송도과학로", "충무로", "서부산로", "대덕대로", "월드컵북로", "가산디지털로", "분당내곡로"];
const dongs = ["역삼동", "서초동", "상암동", "문래동", "성수동", "잠실동", "중동", "범어동", "송도동", "구암동", "정자동", "마두동", "인후동", "팔용동"];
const buildings = ["센터필드", "파크타워", "스마트허브", "테크노밸리", "비즈니스센터", "그린빌딩", "메트로타워", "드림스퀘어", "한빛프라자", "시그니처몰"];
const addressTemplates = [
  "배송지는 {E}입니다.",
  "현장 실사 주소: {E}",
  "장비 설치 위치를 {E}로 등록했습니다.",
  "계약서상 사업장 소재지는 {E}입니다.",
  "방문 예정지는 {E}이며 출입증이 필요합니다.",
  "반품 수거지는 {E}로 확인됩니다.",
  "IDC 이전 대상 주소는 {E}입니다.",
  "고객사 청구지 주소를 {E}로 변경했습니다.",
  "온사이트 점검 장소: {E}",
  "납품처 주소는 {E}입니다.",
  "보안 점검 대상 사이트는 {E}로 지정되었습니다.",
  "방문 예약 주소를 {E}로 확정했습니다.",
];

function genAddress() {
  const style = int(0, 3);
  let entity;
  if (style === 0) {
    entity = `${pick(cities)} ${pick(districts)} ${pick(roads)} ${int(10, 999)}-${int(1, 30)}`;
  } else if (style === 1) {
    entity = `${pick(cities)} ${pick(districts)} ${pick(dongs)} ${int(10, 999)}-${int(1, 99)}`;
  } else if (style === 2) {
    entity = `${pick(districts)} ${pick(roads)} ${int(20, 900)} ${pick(buildings)} ${int(2, 35)}층`;
  } else {
    entity = `${pick(cities)} ${pick(districts)} ${pick(roads)} ${int(1, 800)} ${pick(buildings)} ${int(101, 2500)}호`;
  }
  return { text: render(pick(addressTemplates), entity), entity };
}

const orgPrefixes = ["새벽", "한빛", "에이스", "블루", "그린", "프라임", "넥스트", "코어", "비전", "다온", "라온", "시너지", "유니온", "브릿지", "메가", "퓨처", "스마트", "클라우드", "데이터", "인사이트"];
const orgDomains = ["테크", "소프트", "네트웍스", "시스템즈", "데이터", "솔루션", "로지스", "파트너스", "랩스", "헬스", "모빌리티", "페이", "리테일", "에너지", "AI", "보안"];
const orgSuffixes = ["주식회사", "(주)", "유한회사", "컨소시엄", "코리아", "Inc.", "Labs", "Partners", "Networks"];
const orgTemplates = [
  "계약사는 {E}로 등록되어 있습니다.",
  "{E} 측 담당자가 단가 조정을 요청했습니다.",
  "신규 고객사 {E}의 온보딩 일정을 확정했습니다.",
  "공급사 {E}와 유지보수 조건을 재협의합니다.",
  "{E}의 보안 심사 결과를 공유해 주세요.",
  "입찰 참여 업체는 {E}입니다.",
  "하도급 업체 {E}에 작업 지시서를 발송했습니다.",
  "고객사 {E}의 서비스 이용 현황을 점검합니다.",
  "정산 대상 법인은 {E}입니다.",
  "파트너 계약 검토 대상: {E}",
  "{E} 담당자와 킥오프 미팅이 예정되어 있습니다.",
  "이번 PoC는 {E}와 공동으로 진행합니다.",
];

function genOrg() {
  const core = `${pick(orgPrefixes)}${pick(orgDomains)}`;
  const suffix = pick(orgSuffixes);
  const entity = suffix === "(주)" ? `${suffix}${core}` : `${core} ${suffix}`;
  return { text: render(pick(orgTemplates), entity), entity };
}

const projectDomains = ["결제", "보안", "검색", "CRM", "ERP", "데이터레이크", "인증", "모바일", "클라우드", "정산", "고객경험", "물류", "AI", "관제", "리스크", "마케팅"];
const projectActions = ["고도화", "전환", "개편", "연동", "마이그레이션", "자동화", "통합", "분리", "최적화", "재구축", "상용화", "운영"];
const codeNames = ["Alpha", "Orion", "Nova", "Glacier", "Lynx", "Atlas", "Vertex", "Pulse", "Nimbus", "Forge", "Aster", "Zenith", "Delta", "Helios"];
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
  "{E} 종료 보고서를 작성해 주세요.",
];

function genProject() {
  let entity;
  if (chance(0.35)) {
    entity = `${pick(codeNames)}-${chance(0.5) ? int(24, 29) : `Q${int(1, 4)}`}`;
  } else {
    entity = `${pick(projectDomains)} ${pick(projectDomains)} ${pick(projectActions)}`;
    if (chance(0.35)) entity += ` ${pick(["Phase1", "Phase2", "2차", "3차", "파일럿"])}`;
  }
  return { text: render(pick(projectTemplates), entity), entity };
}

const docSubjects = ["유지보수", "라이선스", "보안점검", "개인정보처리", "데이터이관", "클라우드전환", "마케팅대행", "공급계약", "SaaS이용", "장비임대", "서비스수준", "장애대응", "정산", "운영", "기술검토", "입찰"];
const docKinds = ["계약서", "협약서", "제안서", "사업계획서", "검토보고서", "회의록", "견적서", "정산내역서", "기획안", "요구사항정의서", "보안검토서", "인수인계서"];
const docExts = ["docx", "hwp", "pdf", "pptx", "xlsx", "doc", "hwpx"];
const configNames = ["db_config", "staging", "prod-secret", "backup", "deploy", "service_account", "pipeline", "release"];
const configExts = ["env", "yml", "yaml", "conf", "json", "ini"];
const documentTemplates = [
  "{E} 파일을 검토해 주세요.",
  "첨부된 {E}의 접근 권한을 요청합니다.",
  "{E} 최신본을 공유드립니다.",
  "법무팀에서 {E} 문구를 재검토 중입니다.",
  "서버에서 {E} 열람 이력이 확인되었습니다.",
  "{E} 초안을 오늘 중으로 회신해 주세요.",
  "계약 검토 대상 문서는 {E}입니다.",
  "{E}에 포함된 금액 조건을 확인해 주세요.",
  "보안 결재함에 {E}가 등록되었습니다.",
  "외부 공유 전 {E}를 마스킹해야 합니다.",
  "{E} 버전 충돌이 발생했습니다.",
  "고객사에 전달할 {E} 최종본을 준비했습니다.",
];

function genDocument() {
  let entity;
  if (chance(0.18)) {
    entity = `${pick(configNames)}.${pick(configExts)}`;
  } else {
    const year = chance(0.55) ? `${int(2023, 2026)}년 ` : "";
    const title = `${year}${pick(docSubjects)} ${pick(docKinds)}`;
    entity = chance(0.55) ? `${title}.${pick(docExts)}` : title;
    if (chance(0.2)) entity = entity.replaceAll(" ", "_");
    if (chance(0.15)) entity = `${entity.replace(/\.[^.]+$/, "")}-v${int(1, 4)}.${int(0, 9)}.${pick(docExts)}`;
  }
  return { text: render(pick(documentTemplates), entity), entity };
}

const financialContexts = ["계약 금액", "월 운영비", "입찰가", "예상 매출", "정산 금액", "유지보수 단가", "손실률", "영업이익률", "예산 집행률", "납기 준수율", "전환율", "마진율", "구매 수량", "장비 단가", "위약금", "환급액"];
const financialTemplates = [
  "이번 안건의 {C}은 {E}입니다.",
  "회의록 기준 {C}이 {E}로 확정되었습니다.",
  "내부 검토 결과 {C}은 {E} 수준입니다.",
  "견적서에 기재된 {C}: {E}",
  "재무팀은 {C}을 {E}로 보고했습니다.",
  "계약서상 {C}은 {E}이며 변경이 필요합니다.",
  "분기 보고서의 {C}은 {E}로 집계되었습니다.",
  "고객사 협의 후 {C}을 {E}로 조정했습니다.",
  "승인 요청서에 {C} {E}가 포함되어 있습니다.",
  "이사회 보고자료에는 {C}이 {E}로 표시되어 있습니다.",
];

function genFinancial() {
  const kind = int(0, 3);
  let entity;
  if (kind === 0) {
    entity = `${int(1, 980)}억 ${int(1, 9)}천만원`;
  } else if (kind === 1) {
    entity = `${int(100, 999999).toLocaleString("en-US")}원`;
  } else if (kind === 2) {
    entity = `${int(1, 180)}.${int(0, 9)}%`;
  } else {
    entity = `₩${int(1, 900).toLocaleString("en-US")},000,000`;
  }
  const template = pick(financialTemplates).split("{C}").join(pick(financialContexts));
  return { text: render(template, entity), entity };
}

const apiChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
function randomString(length, chars = apiChars) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(rand() * chars.length)];
  return out;
}

const apiTemplates = [
  "API 호출 시 헤더에 X-API-KEY: {E}를 추가하세요.",
  "신규 API 키 {E}가 발급되었습니다.",
  "운영 콘솔에서 발급받은 토큰은 {E}입니다.",
  "외부 연동에는 {E} 키를 사용해야 합니다.",
  "현재 유효한 인증 키는 {E}입니다.",
  "{E} 키가 만료 예정이니 교체해 주세요.",
  "배치 서버 환경변수 API_TOKEN 값은 {E}입니다.",
  "웹훅 서명 검증용 secret은 {E}입니다.",
  "요청 헤더 Authorization 값에 {E}를 설정했습니다.",
  "연동 테스트용 credential {E}가 공유되었습니다.",
  "관리자 콘솔에서 {E} 토큰을 폐기해 주세요.",
  "SDK 초기화 키로 {E}를 등록했습니다.",
];

function genApiKey() {
  const style = int(0, 4);
  let entity;
  if (style === 0) entity = `sk_live_${randomString(38)}`;
  else if (style === 1) entity = `ghp_${randomString(36)}`;
  else if (style === 2) entity = `xoxb-${int(1000000000, 9999999999)}-${int(1000000000, 9999999999)}-${randomString(24)}`;
  else if (style === 3) entity = `AKIA${randomString(16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")}`;
  else entity = randomString(int(36, 48));
  return { text: render(pick(apiTemplates), entity), entity };
}

const pwChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const pwSpecial = "!@#$%^&*_-+=?";
const passwordTemplates = [
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
  "장애 대응용 공유 비밀번호 {E}를 사용했습니다.",
];

function genPassword() {
  const style = int(0, 3);
  let entity;
  if (style === 0) entity = String(int(10000000, 99999999));
  else if (style === 1) entity = randomString(int(8, 16), pwChars);
  else if (style === 2) {
    entity = `${randomString(int(5, 10), pwChars)}${pick(pwSpecial)}${randomString(int(3, 8), pwChars)}${int(0, 99)}`;
  } else {
    entity = `${pick(pwSpecial)}${randomString(int(8, 20), pwChars + pwSpecial)}${pick(pwSpecial)}`;
  }
  return { text: render(pick(passwordTemplates), entity), entity };
}

const generators = {
  PERSON: genPerson,
  ADDRESS: genAddress,
  PASSWORD: genPassword,
  API_KEY: genApiKey,
  DOCUMENT: genDocument,
  ORG: genOrg,
  PROJECT: genProject,
  FINANCIAL: genFinancial,
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const summary = [];
for (const [type, generator] of Object.entries(generators)) {
  const { rows, uniqueEntities } = uniqueRows(type, generator);
  const file = writeCsv(type, rows);
  summary.push({
    type,
    rows: rows.length,
    unique_entities: uniqueEntities,
    duplicate_texts: rows.length - new Set(rows.map((r) => r.text)).size,
    bad_spans: rows.filter((r) => r.text.slice(Number(r.start), Number(r.end)) !== r.entity_text).length,
    file,
  });
}

const summaryFile = path.join(OUT_DIR, "generation_summary.json");
fs.writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.table(summary.map((s) => ({
  type: s.type,
  rows: s.rows,
  unique_entities: s.unique_entities,
  duplicate_texts: s.duplicate_texts,
  bad_spans: s.bad_spans,
})));
console.log(`Wrote summary: ${summaryFile}`);
