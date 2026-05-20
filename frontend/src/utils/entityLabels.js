const DEPRECATED_ENTITY_PATTERNS = ['BANK_CODE', 'SWIFT', '은행코드'];

// English code → Korean label (legacy API compatibility)
const ENTITY_LABELS = {
  PERSON:         '이름',
  NAME:           '이름',
  USER_NAME:      '이름',
  PER:            '이름',
  PS_NAME:        '이름',
  PHONE:          '전화번호',
  PHONE_NUMBER:   '전화번호',
  MOBILE:         '전화번호',
  TEL:            '전화번호',
  EMAIL:          '이메일',
  E_MAIL:         '이메일',
  RRN:            '주민등록번호',
  JUMIN:          '주민등록번호',
  RESIDENT_REGISTRATION_NUMBER: '주민등록번호',
  BUSINESS_NUMBER: '사업자등록번호',
  BIZ_NUMBER:     '사업자등록번호',
  CARD:           '카드번호',
  CARD_NUMBER:    '카드번호',
  ACCOUNT:        '계좌번호',
  ACCOUNT_NUMBER: '계좌번호',
  ADDRESS:        '주소',
  LOCATION:       '주소',
  IP:             'IP 주소',
  IP_ADDRESS:     'IP 주소',
  URL:            'URL',
  PROJECT:        '프로젝트',
  PROJECT_NAME:   '프로젝트',
  INTERNAL_PROJECT: '프로젝트',
  ORG:            '기관명',
  ORGANIZATION:   '기관명',
  COMPANY:        '기관명',
  FINANCIAL:      '금액 및 재무수치',
  FINANCIAL_NUM:  '금액 및 재무수치',
  PASSWORD:       '비밀번호',
  API_KEY:        'API키',
  SECRET:         '비밀번호',
  TOKEN:          '비밀번호',
  DOCUMENT:       '문서명',
  DOC_FILE:       '문서명',
};

// Legacy / old-format type names → canonical Korean type
const LEGACY_NAMES = {
  // Old internal pattern key names
  'domestic_account':         '계좌번호',
  'domestic_account_keyword': '계좌번호',
  'account_keyword':          '계좌번호',
  'phone_keyword':            '전화번호',
  // Card brand names stored in old data
  'Visa':       '카드번호',
  'Mastercard': '카드번호',
  'JCB':        '카드번호',
  'Amex':       '카드번호',
  '은련':        '카드번호',
  '다이너스':    '카드번호',
  '국내개인카드': '카드번호',
  '국내법인카드': '카드번호',
  // Old descriptive suffix fragments
  '키워드 국내':  '계좌번호',
  '일반':        '계좌번호',
};

// Canonical Korean types from current backend — pass through unchanged
const KNOWN_KOREAN_TYPES = new Set([
  '전화번호', '주민등록번호', '외국인등록번호', '카드번호', '계좌번호',
  '이메일', '여권번호', '사업자등록번호', '법인등록번호', '차량번호', '현금영수증번호',
  '이름', '주소', '비밀번호', 'API키', '계약서', '제안서', '문서명', '프로젝트',
  '금액 및 재무수치', '기관명',
]);

// Prefix list for normalizing old descriptive names like "전화번호 뒤에 키워드"
const KOREAN_PREFIXES = [
  '주민등록번호', '외국인등록번호', '사업자등록번호', '법인등록번호',
  '현금영수증번호', '현금영수증',
  '전화번호', '계좌번호', '카드번호', '여권번호', '차량번호',
  '이메일', '이름', '주소', '비밀번호', '문서명', '프로젝트', '기관명', '계약서', '제안서',
  '금액 및 재무수치',
];

export function isDeprecatedEntityType(value) {
  const text = String(value || '').trim().toUpperCase();
  return DEPRECATED_ENTITY_PATTERNS.some((p) => text.includes(p.toUpperCase()));
}

export function labelEntityType(value) {
  let text = String(value || '').trim();
  if (!text || isDeprecatedEntityType(text)) return '';

  // Strip bracket notation: "[전화번호]" → "전화번호"
  if (text.startsWith('[') && text.endsWith(']')) {
    text = text.slice(1, -1).trim();
  }

  // 1. Canonical Korean type → pass through
  if (KNOWN_KOREAN_TYPES.has(text)) return text;

  // 2. English code lookup
  const byCode = ENTITY_LABELS[text.toUpperCase()];
  if (byCode) return byCode;

  // 3. Legacy name lookup (case-sensitive first, then uppercase)
  const byLegacy = LEGACY_NAMES[text] ?? LEGACY_NAMES[text.toUpperCase()];
  if (byLegacy) return byLegacy;

  // 4. Korean prefix normalization — strips descriptive suffixes
  //    e.g. "전화번호 뒤에 키워드" → "전화번호"
  for (const prefix of KOREAN_PREFIXES) {
    if (text.startsWith(prefix)) {
      return prefix === '현금영수증' ? '현금영수증번호' : prefix;
    }
  }

  // 5. Fallback
  return text;
}

export function formatEntityTypes(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  const seen = new Set();
  const labels = values
    .map((v) => labelEntityType(v.trim()))
    .filter((item) => {
      if (!item || item === '-') return false;
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });

  return labels.join(', ') || '-';
}
