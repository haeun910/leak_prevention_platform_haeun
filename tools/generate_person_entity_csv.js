const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "datasets", "generated_entities");
const OUT_FILE = path.join(OUT_DIR, "person_entity_5000.csv");
const COUNT = 5000;
const TYPE = "PERSON";
const LABEL = "ENTITY";

let seed = 520240514;
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

function fill(template, values) {
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
  if (pair === "으로/로") {
    const ch = text[text.length - 1];
    const code = ch.charCodeAt(0);
    const jong = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : 0;
    return jong !== 0 && jong !== 8 ? "으로" : "로";
  }
  throw new Error(`Unknown particle pair: ${pair}`);
}

function applyNameParticles(sentence, name) {
  return sentence
    .split(`${name}이 `).join(`${name}${particle(name, "이/가")} `)
    .split(`${name}가 `).join(`${name}${particle(name, "이/가")} `)
    .split(`${name}은 `).join(`${name}${particle(name, "은/는")} `)
    .split(`${name}는 `).join(`${name}${particle(name, "은/는")} `)
    .split(`${name}을 `).join(`${name}${particle(name, "을/를")} `)
    .split(`${name}를 `).join(`${name}${particle(name, "을/를")} `)
    .split(`${name}으로 `).join(`${name}${particle(name, "으로/로")} `)
    .split(`${name}로 `).join(`${name}${particle(name, "으로/로")} `);
}

function withParticle(word, pair) {
  return `${word}${particle(word, pair)}`;
}

const surnames = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황",
  "안", "송", "류", "홍", "전", "고", "문", "양", "손", "배", "백", "허", "유", "남", "심", "노",
  "하", "곽", "성", "차", "주", "우", "구", "민", "진", "엄", "채", "원", "천", "방", "공", "현",
  "함", "변", "염", "여", "추", "도", "석", "소", "선", "설", "마", "길", "연", "위", "표", "명",
];

const compoundSurnames = ["남궁", "황보", "제갈", "선우", "독고", "서문", "사공"];

const givenA = [
  "민", "서", "지", "하", "도", "유", "준", "시", "현", "수", "예", "채", "은", "다", "아", "태",
  "연", "성", "재", "윤", "가", "나", "원", "우", "동", "승", "혜", "보", "규", "진", "영", "혁",
  "솔", "라", "린", "빈", "호", "율", "리", "찬", "건", "준", "민", "서", "지", "윤", "인", "정",
  "세", "로", "해", "봄", "온", "별", "담", "겸", "율", "재", "환", "희", "경", "슬", "주", "원",
  "태", "이", "도", "강", "산", "하", "준", "유", "서", "연", "지", "소", "나", "혜", "지", "예",
];

const givenB = [
  "우", "아", "준", "윤", "현", "서", "민", "영", "진", "희", "호", "원", "빈", "율", "연", "경",
  "수", "정", "하", "림", "결", "찬", "겸", "온", "솔", "리", "별", "재", "훈", "혁", "미", "린",
  "담", "인", "주", "완", "석", "비", "안", "겸", "서", "빈", "호", "영", "율", "현", "유", "원",
  "재", "은", "나", "라", "이", "윤", "경", "서", "준", "민", "채", "율", "하", "온", "연", "성",
  "욱", "환", "준", "형", "림", "지", "아", "희", "영", "솔", "담", "겸", "찬", "후", "빈", "열",
];

const singleGiven = [
  "솔", "봄", "별", "찬", "율", "준", "민", "린", "빈", "현", "온", "겸", "담", "하", "윤", "재",
  "진", "환", "결", "율", "서", "연", "우", "호", "경", "훈", "영", "주", "라", "나", "도", "이",
];

function makeName(used) {
  const confusingEndings = new Set(["은", "는", "이", "가", "을", "를", "의", "와", "과", "에"]);
  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const surname = chance(0.025) ? pick(compoundSurnames) : pick(surnames);
    const given = chance(0.08) ? pick(singleGiven) : `${pick(givenA)}${pick(givenB)}`;
    const name = `${surname}${given}`;
    if (confusingEndings.has(name[name.length - 1])) continue;
    if (!used.has(name)) return name;
  }
  throw new Error("Unable to create unique Korean person name");
}

const teams = [
  "보안팀", "인프라팀", "플랫폼팀", "클라우드운영팀", "데이터팀", "개발1팀", "개발2팀", "QA팀",
  "서비스기획팀", "PMO", "고객성공팀", "CS팀", "영업팀", "파트너운영팀", "재무팀", "법무팀",
  "구매팀", "계약관리팀", "감사실", "마케팅팀", "제품전략팀", "현장지원팀", "SRE팀", "DBA그룹",
  "통합관제팀", "정산운영팀", "교육지원팀", "리스크관리팀", "개인정보보호팀", "운영개선TF",
];

const titles = [
  "담당자", "매니저", "선임", "책임", "주임", "팀장", "파트장", "본부장", "연구원", "컨설턴트",
  "프로젝트 매니저", "제품 책임자", "엔지니어", "분석가", "검토자", "승인자", "운영자", "관리자",
  "계약 담당", "현장 담당",
];

const channels = [
  "메일", "슬랙", "팀즈", "결재함", "Jira 티켓", "운영 로그", "장애 보고서", "회의록", "감사 대응표",
  "고객 요청서", "구매 요청서", "보안 점검표", "정산 메모", "배포 노트", "온보딩 체크리스트",
  "출입 신청서", "권한 신청서", "VOC 이관 내역", "계약 검토 메모", "릴리즈 체크리스트",
];

const systems = [
  "ERP", "CRM", "그룹웨어", "VPN", "SSO", "GitLab", "Jenkins", "Datadog", "Zendesk", "Confluence",
  "SAP", "Tableau", "Snowflake", "Kubernetes", "Okta", "Slack Admin", "AWS 콘솔", "Azure Portal",
  "Notion", "Linear", "Redmine", "ServiceNow",
];

const projects = [
  "결제 배치 개편", "고객 포털 전환", "보안 관제 고도화", "데이터레이크 연동", "ERP 업그레이드",
  "모바일 인증 개선", "클라우드 비용 최적화", "정산 자동화", "검색 품질 개선", "CRM 마이그레이션",
  "파트너 API 전환", "개인정보 파기 자동화", "인프라 표준화", "장애 대응 체계 개선",
  "권한 관리 일원화", "외부 감사 대응", "고객사 온보딩", "계약 프로세스 개선",
];

const customers = [
  "고객사", "협력사", "파트너사", "공급사", "대행사", "외주사", "법무법인", "회계법인", "운영 대행사",
  "현장 업체", "클라우드 파트너", "보안 관제 업체", "물류 파트너", "정산 대행사",
];

const timePhrases = [
  "오늘 오전", "오늘 오후", "금일 중", "내일 오전", "이번 주", "다음 주", "월말", "분기 마감 시점",
  "배포 당일", "릴리즈 직전", "장애 종료 직후", "계약 체결 전", "정산 마감일", "온보딩 전",
  "감사 대응 기간", "야간 배치 후", "회의 전", "외부 발송 전", "결재 상신 전", "검수 직후",
];

const deadlinePhrases = [
  "오늘 오전까지", "오늘 오후까지", "금일 중", "내일 오전까지", "이번 주 안에", "다음 주까지",
  "월말까지", "분기 마감 전까지", "배포 전까지", "릴리즈 직전까지", "계약 체결 전까지",
  "정산 마감일까지", "온보딩 전까지", "감사 대응 기간 중", "회의 전까지", "외부 발송 전까지",
  "결재 상신 전까지", "검수 직후 바로",
];

const statusPhrases = [
  "승인 대기", "검토 필요", "처리 완료", "보류 처리", "재확인 필요", "이관 완료", "긴급 확인",
  "내부 공유", "접근 제한", "권한 만료", "수정 요청", "원본 대조", "추가 확인", "회신 대기",
  "담당자 변경", "결재 반려", "증빙 요청", "보안 검토", "고객 회신 전", "외부 공유 금지",
];

const reasons = [
  "접근 권한 신청", "배포 승인", "장애 원인 분석", "계약 문구 검토", "고객 문의 이관", "정산 내역 확인",
  "개인정보 열람", "서버 접속 승인", "외부 반출 검토", "회의록 검수", "견적서 검토",
  "온보딩 일정 조율", "데이터 삭제 승인", "계정 복구 처리", "SLA 위반 확인", "취약점 조치 확인",
  "작업 결과 보고", "릴리즈 노트 검토", "감사 증빙 제출", "변경 요청 승인",
];

const suffixes = [
  "확인 바랍니다.", "회신해 주세요.", "기록을 남겨 주세요.", "검토 후 승인해 주세요.", "외부 공유 전 확인해 주세요.",
  "접근 권한을 조정해 주세요.", "고객 전달 전 마스킹해 주세요.", "관련 증빙에 첨부해 주세요.",
  "보안 검토 대상입니다.", "처리 이력을 업데이트해 주세요.", "원본과 대조해 주세요.", "담당 부서에 공유해 주세요.",
  "다음 회의 안건에 포함해 주세요.", "승인 후 진행 가능합니다.", "기한 내 처리해 주세요.", "이슈 링크에 남겨 주세요.",
];

const sentencePatterns = [
  "{N} 담당자가 {R} 건으로 {ST} 상태입니다.",
  "{T} {TEAM}에서 {N} {TITLE}에게 {R_OBJ} 요청했습니다.",
  "{CH}에 등록된 {R} 담당자는 {N}입니다.",
  "{N} {TITLE_SUBJ} {SYS} 접근 권한 변경을 승인했습니다.",
  "{TEAM_TOPIC} {N}에게 {P} 관련 검토 의견을 요청했습니다.",
  "{CH} / {TEAM} / {ST}: {N} {TITLE} 확인 필요.",
  "{N}님이 {CUSTOMER} 문의를 접수하고 {TEAM_DIR} 이관했습니다.",
  "{P} 회의록에서 {N}의 액션 아이템이 미완료로 표시되었습니다.",
  "{SYS} 계정 권한 만료 안내를 {N}에게 발송했습니다.",
  "외부 발송 전 {N} {TITLE}의 승인 여부를 확인해야 합니다.",
  "{T} 기준 {N} 담당 건은 {ST_AS} 분류되었습니다.",
  "{CUSTOMER} 미팅 참석자로 {N} {TITLE_OBJ} 추가했습니다.",
  "{N}이 작성한 {R} 메모는 {CH}에 첨부되어 있습니다.",
  "{TEAM} 담당자 변경으로 {N}에게 알림을 재발송했습니다.",
  "{CH}에서 {N} 이름으로 등록된 요청이 중복 접수되었습니다.",
  "{N} {TITLE_TOPIC} {P} 산출물 검토를 완료했습니다.",
  "{T} {SYS} 로그에서 {N}의 승인 기록이 확인되었습니다.",
  "{R} 결재선에 {N} {TITLE_OBJ} 추가해 주세요.",
  "{CUSTOMER} 전달 자료는 {N} 검토 후 발송 가능합니다.",
  "{N}에게 배정된 {P} 후속 조치가 지연되고 있습니다.",
  "{TEAM} 주간보고에 {N}의 처리 내역을 반영했습니다.",
  "{CH} 코멘트에 따르면 {N} {TITLE_SUBJ} 최종 확인자입니다.",
  "{N}님은 {SYS} 접속 오류로 헬프데스크에 문의했습니다.",
  "{R} 요청자는 {N}이며 승인자는 아직 지정되지 않았습니다.",
  "{DL} {N} {TITLE_SUBJ} 고객 회신 초안을 작성하기로 했습니다.",
  "{P} 리스크 검토 회의에 {N}을 필수 참석자로 지정했습니다.",
  "{N}의 퇴사 예정일에 맞춰 {SYS} 권한 회수가 필요합니다.",
  "{TEAM}에서 {N} 담당 자료의 외부 공유 가능 여부를 문의했습니다.",
  "{CH}에 {N} {TITLE}의 서명 누락 건이 올라왔습니다.",
  "{N}이 제출한 작업 결과 보고서는 {ST} 상태로 남아 있습니다.",
  "{CUSTOMER} 담당 미팅은 {N}이 주관하고 {TEAM}이 배석합니다.",
  "{SYS} 관리자 역할을 {N}에게 임시 부여했습니다.",
  "{T} {CH}에서 {N} 관련 개인정보 열람 이력이 확인되었습니다.",
  "{N} {TITLE}에게 {P} 일정 변경 사실을 안내했습니다.",
  "{R} 증빙 파일의 작성자로 {N}이 표시되어 있습니다.",
  "{TEAM_TOPIC} {N}의 검토 의견을 받은 뒤 계약서를 발송할 예정입니다.",
  "{CH} 알림 수신자를 {N}에서 다른 담당자로 변경해 주세요.",
  "{N}님이 {CUSTOMER} 요청 범위를 다시 확인하겠다고 답변했습니다.",
  "{P} 배포 승인 화면에 {N} {TITLE}의 결재가 남아 있습니다.",
  "{T} 기준 {N}의 {SYS} 접속 권한을 제한해야 합니다.",
  "{TEAM} 내부 회의에서 {N} 담당 안건이 우선순위로 지정되었습니다.",
  "{CUSTOMER} 문의 답변자는 {N}이고 참조자는 {TEAM}입니다.",
  "{N} {TITLE_SUBJ} {R} 사유를 보완해 다시 상신했습니다.",
  "{CH}에 남긴 {N}의 코멘트는 고객 발송 전에 삭제해야 합니다.",
  "{T} {P} 점검 결과를 {N}에게 먼저 공유했습니다.",
  "{N} 담당 티켓은 {ST} 상태라 추가 조치가 필요합니다.",
  "{SYS} 변경 작업 승인자로 {N} {TITLE_OBJ} 지정했습니다.",
  "{R} 요청이 {N} 이름으로 접수되어 본인 확인이 필요합니다.",
  "{TEAM_TOPIC} {N}에게 {CUSTOMER} 전달 문구 수정을 요청했습니다.",
  "{P} 산출물의 최종 검수자는 {N}입니다.",
  "{CH}에는 {N} {TITLE}의 휴가 기간 중 대체자가 아직 없습니다.",
  "{N}이 담당한 {CUSTOMER} 온보딩 건은 다음 주로 연기되었습니다.",
  "{DL} {N}에게 {R} 요청 결과를 회신받아야 합니다.",
  "{TEAM} 보안 검토표에서 {N} 담당 항목만 미완료입니다.",
  "{P} 배포 후 장애 보고서에 {N}의 확인 의견이 추가되었습니다.",
  "{N} {TITLE}에게 {SYS} 관리자 권한 부여 사유를 다시 요청했습니다.",
  "{CUSTOMER} 계약 미팅 참석자 명단에 {N}을 추가해 주세요.",
  "{N}의 작업 승인 내역은 {CH}에서만 확인 가능합니다.",
  "{TEAM_TOPIC} {R} 담당자를 {N}으로 재지정했습니다.",
  "{T} 접수된 {CH}에서 {N} 관련 요청이 우선 처리 대상으로 분류되었습니다.",
  "{N}님에게 발송된 알림은 {ST} 상태로 남아 있습니다.",
  "{P} 작업 중 {N} {TITLE}의 확인 절차가 누락되었습니다.",
  "{SYS} 감사 로그에서 {N} 이름의 다운로드 기록을 확인했습니다.",
  "{CUSTOMER} 회신 초안은 {N} 검토 후 법무팀에 전달됩니다.",
  "{TEAM_TOPIC} {N}의 권한 변경 사유를 증빙으로 보관했습니다.",
  "{R} 관련 통화 기록에 {N} {TITLE}의 이름이 포함되어 있습니다.",
  "{T} 기준 {N}에게 배정된 티켓을 {TEAM_DIR} 이관해 주세요.",
  "{CH}에 첨부된 체크리스트는 {N}이 마지막으로 수정했습니다.",
  "{P} 일정 협의는 {N} 담당으로 계속 진행합니다.",
  "{N} {TITLE}의 확인 없이 {CUSTOMER}에 자료를 보내면 안 됩니다.",
  "{TEAM} 온콜 명단에서 {N}의 연락 순서를 조정했습니다.",
  "{R} 결재가 반려되어 {N}에게 보완 요청을 보냈습니다.",
  "{SYS} 접근 신청서에 {N}의 소속 팀 정보가 누락되었습니다.",
  "{N}이 {P} 회의에서 공유한 일정은 아직 확정되지 않았습니다.",
  "{CUSTOMER} 이슈 담당자가 {N}으로 바뀌었다고 안내받았습니다.",
  "{CH} 검토 코멘트에서 {N} {TITLE}만 추가 확인 대상으로 남았습니다.",
  "{T} {TEAM} 회의에서 {N} 담당 리스크가 재분류되었습니다.",
  "{N}에게 전달된 {R} 요청은 고객 정보가 포함되어 있습니다.",
  "{P} 산출물 검토 결과를 {N} 이름으로 회신했습니다.",
  "{SYS} 권한 신청 승인자는 {N}이며 만료일은 별도 관리합니다.",
  "{TEAM_TOPIC} {N} {TITLE}의 확인을 받은 뒤 배포를 진행했습니다.",
  "{CUSTOMER} 담당자와의 통화 메모에 {N}이 참조자로 기록되어 있습니다.",
  "{CH}에서 {N}에게 멘션된 내용은 외부 공유 대상이 아닙니다.",
  "{R} 처리 담당을 {N}에서 {TEAM} 공용 큐로 옮겼습니다.",
  "{T} 기준 {N} 담당 승인 건이 세 건 남아 있습니다.",
  "{P} 테스트 결과를 {N} {TITLE}에게 먼저 공유해 주세요.",
  "{SYS} 비상 계정 점검자는 {N}으로 지정되어 있습니다.",
  "{N}님이 {CUSTOMER} 요청서를 검토하고 보완 의견을 남겼습니다.",
  "{TEAM_TOPIC} {N}의 휴가 기간 동안 대체 승인자를 지정해야 합니다.",
  "{CH}에 기록된 {N}의 답변은 고객 전달 문안으로 사용됩니다.",
  "{P} 착수 보고서의 작성 책임자는 {N}입니다.",
  "{R} 요청이 지연되어 {N} {TITLE}에게 알림을 다시 보냈습니다.",
  "{CUSTOMER} 보안 서약서 수신자는 {N}으로 등록되어 있습니다.",
  "{T} {SYS} 계정 검토에서 {N}의 권한이 예외로 표시되었습니다.",
];

function makeSentence(name) {
  const status = pick(statusPhrases);
  const title = pick(titles);
  const channel = pick(channels);
  const team = pick(teams);
  const system = pick(systems);
  const project = pick(projects);
  const customer = pick(customers);
  const reason = pick(reasons);
  const values = {
    N: name,
    TEAM: team,
    TEAM_TOPIC: withParticle(team, "은/는"),
    TEAM_DIR: withParticle(team, "으로/로"),
    TITLE: title,
    CH: channel,
    SYS: system,
    P: project,
    CUSTOMER: customer,
    T: pick(timePhrases),
    DL: pick(deadlinePhrases),
    ST: status,
    ST_AS: withParticle(status, "으로/로"),
    R: reason,
    R_OBJ: withParticle(reason, "을/를"),
    TITLE_SUBJ: withParticle(title, "이/가"),
    TITLE_TOPIC: withParticle(title, "은/는"),
    TITLE_OBJ: withParticle(title, "을/를"),
    CH_OBJ: withParticle(channel, "을/를"),
    TEAM_OBJ: withParticle(team, "을/를"),
    SYS_OBJ: withParticle(system, "을/를"),
    CUSTOMER_OBJ: withParticle(customer, "을/를"),
    P_OBJ: withParticle(project, "을/를"),
  };
  let sentence = fill(pick(sentencePatterns), values);
  if (chance(0.18)) sentence = `[${pick(["확인", "긴급", "내부", "보안", "공유", "결재", "검토"])}] ${sentence}`;
  if (chance(0.12)) {
    const memoChannel = pick(channels);
    const memoLabel = memoChannel.includes("메모") ? `${memoChannel}:` : `${memoChannel} 메모:`;
    sentence = `${memoLabel} ${sentence}`;
  }
  if (chance(0.16)) sentence += ` ${pick(suffixes)}`;
  return applyNameParticles(sentence.replace(/\s+/g, " ").trim(), name);
}

function looksLowQuality(text) {
  return (
    text.includes("{") ||
    text.includes("}}") ||
    /메모 메모/.test(text) ||
    /처리 처리/.test(text) ||
    /요청 요청/.test(text) ||
    /전환 전환/.test(text) ||
    /고도화 고도화/.test(text) ||
    /개선 개선/.test(text) ||
    /마이그레이션 마이그레이션/.test(text) ||
    /자동화 자동화/.test(text) ||
    /통합 통합/.test(text) ||
    /까지까지/.test(text) ||
    /전 이후/.test(text) ||
    /[가-힣]{2,4}가며/.test(text) ||
    /[가-힣]{2,4}가고/.test(text) ||
    /[가-힣]{2,4}가입니다/.test(text)
  );
}

function makeRow(index, name, text) {
  const start = text.indexOf(name);
  if (start < 0) throw new Error(`Name not found: ${name} / ${text}`);
  if (text.indexOf(name, start + name.length) !== -1) {
    throw new Error(`Name appears more than once: ${name} / ${text}`);
  }
  const end = start + name.length;
  if (text.slice(start, end) !== name) {
    throw new Error(`Bad span: ${name} / ${text}`);
  }
  return {
    id: `person_${pad(index, 6)}`,
    text,
    entity_type: TYPE,
    entity_text: name,
    start,
    end,
    label: LABEL,
  };
}

function generate() {
  const rows = [];
  const usedNames = new Set();
  const usedTexts = new Set();
  let attempts = 0;

  while (rows.length < COUNT) {
    attempts += 1;
    if (attempts > COUNT * 200) {
      throw new Error("Too many duplicate attempts while generating PERSON rows");
    }

    const name = makeName(usedNames);
    const text = makeSentence(name);
    if (looksLowQuality(text)) continue;
    if (usedTexts.has(text)) continue;
    usedNames.add(name);
    usedTexts.add(text);
    rows.push(makeRow(rows.length + 1, name, text));
  }

  return rows;
}

function validate(rows) {
  const ids = new Set();
  const texts = new Set();
  const names = new Set();
  const bad = [];

  for (const row of rows) {
    if (ids.has(row.id)) bad.push(`duplicate id: ${row.id}`);
    if (texts.has(row.text)) bad.push(`duplicate text: ${row.text}`);
    if (names.has(row.entity_text)) bad.push(`duplicate entity_text: ${row.entity_text}`);
    ids.add(row.id);
    texts.add(row.text);
    names.add(row.entity_text);
    if (row.label !== LABEL) bad.push(`bad label: ${row.id}`);
    if (row.entity_type !== TYPE) bad.push(`bad type: ${row.id}`);
    if (row.text.slice(row.start, row.end) !== row.entity_text) {
      bad.push(`span mismatch: ${row.id}`);
    }
    if (row.text.length < 18) bad.push(`too short: ${row.id}`);
    if (row.text === row.entity_text) bad.push(`value-only row: ${row.id}`);
    if (looksLowQuality(row.text)) bad.push(`low quality text: ${row.id}`);
  }

  return {
    rows: rows.length,
    unique_ids: ids.size,
    unique_texts: texts.size,
    unique_entity_texts: names.size,
    bad_count: bad.length,
    bad_examples: bad.slice(0, 20),
    min_length: Math.min(...rows.map((r) => r.text.length)),
    max_length: Math.max(...rows.map((r) => r.text.length)),
    avg_length: Number((rows.reduce((sum, r) => sum + r.text.length, 0) / rows.length).toFixed(2)),
  };
}

function write(rows) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const header = ["id", "text", "entity_type", "entity_text", "start", "end", "label"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(header.map((key) => csvEscape(row[key])).join(","));
  }
  fs.writeFileSync(OUT_FILE, `${lines.join("\n")}\n`, "utf8");
}

const rows = generate();
const summary = validate(rows);
if (summary.bad_count > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}
write(rows);
console.log(JSON.stringify({ file: OUT_FILE, ...summary }, null, 2));
