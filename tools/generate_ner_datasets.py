"""
KoELECTRA-NER 학습용 CSV 데이터셋 생성기.

목표
- split 없이 CSV 생성
- ENTITY 8종, NON_ENTITY 8종을 각각 5,000개씩 생성
- 모든 row는 문장형 text를 갖도록 생성
- text, id, entity_text 중복 방지
- text[start:end] == entity_text 전수 검증

출력 컬럼
id,text,entity_type,entity_text,start,end,label

주의
- 이 스크립트는 기존 CSV 데이터풀을 재사용하지 않고, 아래에 정의된 문장/값 생성 규칙으로 새 데이터를 만든다.
- Excel에서 바로 열 때 한글이 깨지면 UTF-8로 가져오거나, 필요 시 utf-8-sig로 저장 옵션을 바꾸면 된다.
"""

from __future__ import annotations

import csv
import random
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "datasets" / "generated_entities_python"
ROWS_PER_FILE = 5000
RANDOM_SEED = 20260514


@dataclass(frozen=True)
class Row:
    """CSV 한 행에 들어갈 span annotation."""

    id: str
    text: str
    entity_type: str
    entity_text: str
    start: int
    end: int
    label: str


def pick(items: list[str]) -> str:
    """리스트에서 하나를 무작위 선택한다."""

    return random.choice(items)


def chance(probability: float) -> bool:
    """probability 확률로 True를 반환한다."""

    return random.random() < probability


def pad(number: int, width: int = 6) -> str:
    """ID용 숫자 padding."""

    return str(number).zfill(width)


def has_batchim(text: str) -> bool:
    """마지막 한글 글자에 받침이 있는지 확인한다."""

    if not text:
        return False
    code = ord(text[-1])
    if code < 0xAC00 or code > 0xD7A3:
        return False
    return (code - 0xAC00) % 28 != 0


def particle(text: str, pair: str) -> str:
    """한국어 조사를 간단히 보정한다."""

    batchim = has_batchim(text)
    if pair == "이/가":
        return "이" if batchim else "가"
    if pair == "은/는":
        return "은" if batchim else "는"
    if pair == "을/를":
        return "을" if batchim else "를"
    if pair == "와/과":
        return "과" if batchim else "와"
    if pair == "으로/로":
        code = ord(text[-1])
        jong = (code - 0xAC00) % 28 if 0xAC00 <= code <= 0xD7A3 else 0
        return "으로" if jong not in (0, 8) else "로"
    raise ValueError(f"unknown particle pair: {pair}")


def wp(text: str, pair: str) -> str:
    """단어 + 조사."""

    return f"{text}{particle(text, pair)}"


def render(template: str, **values: str) -> str:
    """{KEY} placeholder를 안전하게 치환한다."""

    for key, value in values.items():
        template = template.replace("{" + key + "}", value)
    return template


def ascii_token(length: int, chars: str) -> str:
    """API key, password, serial 형태를 만들기 위한 ASCII 토큰."""

    return "".join(random.choice(chars) for _ in range(length))


BAD_PATTERNS = re.compile(
    r"층로|층를|그룹와|그룹로|원가 포함|사용료은|처리 처리|요청 요청|전환 전환|"
    r"운영 운영전환|메모 메모|까지까지|[{}]|건는|시간가|시간로|사번는|PMO은"
)


def polish_text(text: str) -> str:
    """반복적으로 보이는 조사 오류를 후처리한다."""

    text = text.replace("PMO은", "PMO는")
    text = re.sub(r"([0-9])를", r"\1을", text)
    text = re.sub(r"([0-9])가", r"\1이", text)
    text = re.sub(r"([0-9])는", r"\1은", text)
    return text


def make_row(entity_type: str, label: str, index: int, text: str, entity_text: str) -> Row:
    """문자 span을 계산하고 한 행을 만든다."""

    text = polish_text(text.strip())
    start = text.find(entity_text)
    if start < 0:
        raise ValueError(f"entity not found: {entity_type} / {entity_text} / {text}")
    if text.find(entity_text, start + len(entity_text)) >= 0:
        raise ValueError(f"ambiguous entity: {entity_type} / {entity_text} / {text}")
    end = start + len(entity_text)
    if text[start:end] != entity_text:
        raise ValueError(f"span mismatch: {entity_type} / {entity_text} / {text}")
    return Row(
        id=f"{entity_type.lower()}_{'non_entity_' if label == 'NON_ENTITY' else ''}{pad(index)}",
        text=text,
        entity_type=entity_type,
        entity_text=entity_text,
        start=start,
        end=end,
        label=label,
    )


def generate_rows(
    entity_type: str,
    label: str,
    generator: Callable[[int], tuple[str, str]],
    global_texts: set[str],
) -> list[Row]:
    """한 타입/라벨 조합에 대해 5,000개 row를 만든다."""

    rows: list[Row] = []
    local_texts: set[str] = set()
    local_entities: set[str] = set()
    attempts = 0

    while len(rows) < ROWS_PER_FILE:
        attempts += 1
        if attempts > ROWS_PER_FILE * 1000:
            raise RuntimeError(f"too many duplicate attempts: {entity_type} {label}")

        text, entity_text = generator(len(rows) + 1)
        text = polish_text(text)

        if len(text) < 16 or text == entity_text:
            continue
        if BAD_PATTERNS.search(text):
            continue
        if text in local_texts or text in global_texts:
            continue
        if entity_text in local_entities:
            continue

        row = make_row(entity_type, label, len(rows) + 1, text, entity_text)
        rows.append(row)
        local_texts.add(row.text)
        global_texts.add(row.text)
        local_entities.add(row.entity_text)

    return rows


def write_csv(path: Path, rows: Iterable[Row]) -> None:
    """CSV를 UTF-8로 저장한다."""

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["id", "text", "entity_type", "entity_text", "start", "end", "label"],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def validate(rows: list[Row]) -> dict[str, int]:
    """생성된 row의 핵심 품질 조건을 검사한다."""

    text_set = {row.text for row in rows}
    id_set = {row.id for row in rows}
    entity_set = {row.entity_text for row in rows}
    bad_span = sum(row.text[row.start : row.end] != row.entity_text for row in rows)
    bad_pattern = sum(bool(BAD_PATTERNS.search(row.text)) for row in rows)
    return {
        "rows": len(rows),
        "unique_texts": len(text_set),
        "unique_ids": len(id_set),
        "unique_entities": len(entity_set),
        "bad_span": bad_span,
        "bad_pattern": bad_pattern,
    }


# ---------------------------------------------------------------------------
# 공통 후보군
# ---------------------------------------------------------------------------

TEAMS = [
    "보안팀", "인프라팀", "플랫폼팀", "클라우드운영팀", "데이터팀", "개발팀", "QA팀", "서비스기획팀",
    "PMO", "고객성공팀", "CS팀", "영업팀", "재무팀", "법무팀", "구매팀", "계약관리팀", "감사실",
    "마케팅팀", "SRE팀", "DBA그룹", "교육지원팀", "파트너운영팀",
]
CHANNELS = ["메일", "슬랙", "팀즈", "결재함", "운영 로그", "Jira 티켓", "회의록", "감사 대응표", "보안 점검표", "구매 요청서", "정산 메모", "배포 노트"]
SYSTEMS = ["ERP", "CRM", "SSO", "VPN", "GitLab", "Jenkins", "Datadog", "Zendesk", "Confluence", "SAP", "Tableau", "Snowflake", "Kubernetes", "Okta", "ServiceNow"]


# ---------------------------------------------------------------------------
# ENTITY 생성기
# ---------------------------------------------------------------------------

SURNAMES = list("김이박최정강조윤장임한오서신권황안송류홍전고문양손배백허유남심노하곽성차주우구민진엄채원천방공현함변염여추도석소선설마길연위표명")
GIVEN_A = list("민서지하도유준시현수예채은다아태연성재윤가나원우동승혜보규진영혁솔라린빈호율리찬건인정세로해봄온별담겸환희경슬주산소")
GIVEN_B = list("우아준윤현서민영진희호원빈율연경수정하림결찬겸온솔리별재훈혁미린담인주완석비안은나라이채후열")


def gen_person_entity(index: int) -> tuple[str, str]:
    """실명 PERSON. 직함은 문장에만 넣고 span은 이름만 잡는다."""

    while True:
        name = f"{pick(SURNAMES)}{pick(GIVEN_A)}{pick(GIVEN_B)}"
        if name[-1] not in "은는이가을를의와과에":
            break
    templates = [
        "{TEAM}은 {E}에게 접근 권한 검토 의견을 요청했습니다.",
        "{CHANNEL}에서 {E} 담당 건이 승인 대기 상태로 남아 있습니다.",
        "{E} 담당자가 고객 문의를 접수하고 후속 조치를 등록했습니다.",
        "{SYSTEM} 감사 로그에서 {E} 이름의 다운로드 기록을 확인했습니다.",
        "외부 발송 전 {E} 관리자의 승인 여부를 확인해야 합니다.",
    ]
    return render(pick(templates), E=name, TEAM=pick(TEAMS), CHANNEL=pick(CHANNELS), SYSTEM=pick(SYSTEMS)), name


def gen_address_entity(index: int) -> tuple[str, str]:
    """상세 주소 ADDRESS."""

    city = pick(["서울시", "부산시", "대구시", "인천시", "대전시", "광주시", "경기도", "충청남도", "경상남도", "제주도"])
    district = pick(["강남구", "서초구", "마포구", "연수구", "유성구", "분당구", "해운대구", "수성구", "제주시", "창원시 성산구"])
    road = pick(["테헤란로", "판교역로", "센텀중앙로", "디지털로", "중앙대로", "송도과학로", "혁신대로", "첨단과기로"])
    building = pick(["스마트허브", "센터필드", "파크타워", "테크노밸리", "메트로타워", "그린빌딩"])
    if chance(0.45):
        entity = f"{city} {district} {road} {index}-{random.randint(1, 80)}"
    elif chance(0.5):
        entity = f"{city} {district} {road} {random.randint(1, 900)} {building} {random.randint(101, 2600)}호"
    else:
        entity = f"{district} {road} {random.randint(10, 900)} {building} {random.randint(2, 35)}층"
    templates = [
        "{TEAM} 현장 방문지는 {E}로 등록되어 있습니다.",
        "보안 점검 대상 사이트를 {E}로 지정했습니다.",
        "계약서상 사업장 소재지는 {E}입니다.",
        "{CHANNEL}에 올라온 배송지 변경 주소는 {E}입니다.",
    ]
    return render(pick(templates), E=entity, TEAM=pick(TEAMS), CHANNEL=pick(CHANNELS)), entity


def gen_password_entity(index: int) -> tuple[str, str]:
    """비밀번호/임시 암호 PASSWORD."""

    chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    specials = "!@#$%^&*_-+=?"
    if chance(0.25):
        entity = str(random.randint(10000000, 99999999))
    elif chance(0.5):
        entity = ascii_token(random.randint(9, 18), chars)
    else:
        entity = f"{ascii_token(random.randint(5, 10), chars)}{pick(list(specials))}{ascii_token(random.randint(4, 8), chars)}{random.randint(10, 99)}"
    templates = [
        "임시 비밀번호는 {E}입니다.",
        "초기 로그인 PW: {E}",
        "서비스 계정 비밀번호를 {E}로 전달받았습니다.",
        "{CHANNEL}에 공유된 임시 암호 {E}를 삭제해 주세요.",
    ]
    return render(pick(templates), E=entity, CHANNEL=pick(CHANNELS)), entity


def gen_api_key_entity(index: int) -> tuple[str, str]:
    """API key/token/secret API_KEY."""

    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"
    if chance(0.25):
        entity = f"sk_live_{ascii_token(38, chars)}"
    elif chance(0.35):
        entity = f"ghp_{ascii_token(36, chars)}"
    elif chance(0.5):
        entity = f"AKIA{ascii_token(16, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}"
    else:
        entity = ascii_token(random.randint(36, 52), chars)
    templates = [
        "API 호출 시 헤더에 X-API-KEY: {E}를 추가하세요.",
        "신규 API 키 {E}가 운영 콘솔에서 발급되었습니다.",
        "배치 서버 환경변수 API_TOKEN 값은 {E}입니다.",
        "{TEAM}에서 {E} 토큰의 만료일을 확인하고 있습니다.",
    ]
    return render(pick(templates), E=entity, TEAM=pick(TEAMS)), entity


def gen_document_entity(index: int) -> tuple[str, str]:
    """업무 문서명/파일명 DOCUMENT."""

    subject = pick(["유지보수", "라이선스", "보안점검", "개인정보처리", "데이터이관", "클라우드전환", "정산", "입찰", "비밀유지"])
    kind = pick(["계약서", "협약서", "제안서", "사업계획서", "검토보고서", "회의록", "정산내역서", "보안검토서"])
    ext = pick(["docx", "hwp", "hwpx", "pdf", "pptx", "xlsx"])
    entity = f"{random.randint(2023, 2027)}년 {subject} {kind} {pick(['초안', '최종본', '검토본'])} {index}.{ext}"
    templates = [
        "{E} 파일을 검토해 주세요.",
        "첨부된 {E}의 접근 권한을 요청합니다.",
        "외부 공유 전 {E}를 마스킹해야 합니다.",
        "고객사에 전달할 {E}을 준비했습니다.",
    ]
    return render(pick(templates), E=entity), entity


def gen_org_entity(index: int) -> tuple[str, str]:
    """외부 회사/고객사/협력사 ORG."""

    core = f"{pick(['새벽', '한빛', '에이스', '블루', '그린', '프라임', '넥스트', '코어', '데이터'])}{pick(['테크', '소프트', '네트웍스', '시스템즈', '솔루션', '로지스'])}{index}"
    suffix = pick(["주식회사", "유한회사", "코리아", "Labs", "Partners", "Networks"])
    entity = f"{core} {suffix}"
    templates = [
        "계약사는 {E}로 등록되어 있습니다.",
        "신규 고객사 {E}의 온보딩 일정을 확정했습니다.",
        "공급사 {E}와 유지보수 조건을 재협의합니다.",
        "{CHANNEL}에 {E} 관련 계약 변경 요청이 올라왔습니다.",
    ]
    return render(pick(templates), E=entity, CHANNEL=pick(CHANNELS)), entity


def gen_project_entity(index: int) -> tuple[str, str]:
    """프로젝트명/코드명 PROJECT."""

    if chance(0.35):
        entity = f"{pick(['Alpha', 'Nova', 'Glacier', 'Lynx', 'Atlas', 'Pulse', 'Vector'])}-Q{random.randint(1, 4)}-{index}"
    else:
        entity = f"{pick(['결제', '보안', '검색', 'CRM', 'ERP', '데이터레이크', '인증', '클라우드'])} {pick(['고도화', '전환', '개편', '연동', '자동화'])} {pick(['Phase1', 'Phase2', '2차', '3차'])}-{index}"
    templates = [
        "{E} 킥오프 회의가 내일 오전으로 잡혔습니다.",
        "{E}의 WBS를 최신 일정으로 업데이트했습니다.",
        "주간 보고서에 {E} 진행률을 추가했습니다.",
        "{E} 관련 리스크를 PMO에 보고했습니다.",
    ]
    return render(pick(templates), E=entity), entity


def gen_financial_entity(index: int) -> tuple[str, str]:
    """금액/비율/재무 수치 FINANCIAL."""

    if chance(0.25):
        entity = f"{random.randint(1, 980)}억 {random.randint(1, 9)}천만원"
        context = pick(["계약 금액", "정산 금액", "입찰가", "월 운영비"])
    elif chance(0.5):
        entity = f"{random.randint(1, 99)}.{random.randint(0, 9)}%"
        context = pick(["마진율", "전환율", "예산 집행률", "납기 준수율"])
    else:
        entity = f"{random.randint(100, 999999):,}원"
        context = pick(["장비 단가", "환급액", "라이선스 비용", "클라우드 사용료"])
    templates = [
        "이번 안건의 {C}은 {E}입니다.",
        "회의록 기준 {C}이 {E}로 확정되었습니다.",
        "견적서에 기재된 {C}: {E}",
        "{TEAM}은 {C}을 {E}로 다시 산정했습니다.",
    ]
    return render(pick(templates), E=entity, C=context, TEAM=pick(TEAMS)), entity


# ---------------------------------------------------------------------------
# NON_ENTITY 생성기
# 각 타입처럼 보이거나 주변 문맥이 비슷하지만, 실제 마스킹 대상은 아닌 span.
# ---------------------------------------------------------------------------


def gen_person_non(index: int) -> tuple[str, str]:
    entity = f"{pick(TEAMS)} {pick(['담당자', '관리자', '승인자', '검토자', '온콜 담당'])} {pick(['A', 'B', '1조', '2조', '공용'])}-{index:04d}"
    templates = [
        "{E} 역할은 아직 개인 이름으로 배정되지 않았습니다.",
        "{CHANNEL}에는 {E}만 표시되고 실제 담당자 이름은 비공개 처리되었습니다.",
        "고객 회신란에는 {E}라고만 적혀 있어 실명 확인이 필요합니다.",
    ]
    return render(pick(templates), E=entity, CHANNEL=pick(CHANNELS)), entity


def gen_address_non(index: int) -> tuple[str, str]:
    entity = f"{pick(['강남', '판교', '상암', '송도', '여의도', '성수', '대전', '부산'])} {pick(['권역', '상권', '담당 구역', '배송 권역'])}-{index:04d}"
    templates = [
        "{E} 근처에서 고객 미팅이 예정되어 있습니다.",
        "{CHANNEL}에는 {E}까지만 적혀 있어 정확한 주소가 아닙니다.",
        "행사 장소는 {E}로 표시되었지만 상세 주소는 별도 공지 예정입니다.",
    ]
    return render(pick(templates), E=entity, CHANNEL=pick(CHANNELS)), entity


def gen_password_non(index: int) -> tuple[str, str]:
    kind = pick(["주문번호", "운송장 번호", "장비 시리얼", "사번", "쿠폰 코드", "접수 번호", "전화번호 끝자리"])
    entity = str(random.randint(1000, 9999)) if "끝자리" in kind else f"{pick(['OD', 'SO', 'TRK', 'AS', 'EQ'])}-{random.randint(100000, 999999)}-{ascii_token(3, 'ABCDEFGHJKLMNPQRSTUVWXYZ')}"
    templates = [
        "{E}는 {K}라서 비밀번호로 사용하면 안 됩니다.",
        "{CHANNEL}에 공유된 {K} {E}는 로그인 암호가 아닙니다.",
        "{K} {E}가 접수되었지만 패스워드 변경 대상은 아닙니다.",
    ]
    return render(pick(templates), E=entity, K=kind, CHANNEL=pick(CHANNELS)), entity


def gen_api_key_non(index: int) -> tuple[str, str]:
    kind = pick(["추적 ID", "요청 ID", "상관관계 ID", "쿠폰 번호", "빌드 해시", "배포 태그", "샘플 토큰"])
    entity = f"{pick(['REQ', 'TRACE', 'LOG', 'CASE', 'SAMPLE'])}-{ascii_token(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}-{index % 100:02d}"
    templates = [
        "{E}는 {K}이며 인증용 API 키가 아닙니다.",
        "{CHANNEL}에 남은 {K} {E}는 호출 권한을 부여하지 않습니다.",
        "문서 예시에 포함된 {E}는 실제 토큰이 아닌 더미 값입니다.",
    ]
    return render(pick(templates), E=entity, K=kind, CHANNEL=pick(CHANNELS)), entity


def gen_document_non(index: int) -> tuple[str, str]:
    entity = f"{pick(['README', 'LICENSE', 'CHANGELOG', 'sample', 'template', 'example', 'placeholder'])}_{pick(['v1', 'v2', 'blank', 'public'])}_{index}.{pick(['md', 'txt', 'pdf', 'docx', 'json', 'yaml'])}"
    templates = [
        "{E}는 공개 템플릿 파일이라 계약 문서로 분류하지 않습니다.",
        "교육 자료에는 {E}를 예시 파일로 첨부했습니다.",
        "{CHANNEL}에 올라온 {E}는 샘플 문서입니다.",
    ]
    return render(pick(templates), E=entity, CHANNEL=pick(CHANNELS)), entity


def gen_org_non(index: int) -> tuple[str, str]:
    entity = f"{pick(['보안정책팀', '클라우드운영팀', '플랫폼개발팀', 'PMO', 'SRE셀', 'DBA그룹'])} {pick(['공용', '운영', '검토', '승인'])}-{index:04d}"
    templates = [
        "{E}은 내부 부서명이라 외부 조직명으로 보지 않습니다.",
        "{CHANNEL}에는 {E} 담당으로만 표시되어 고객사명이 아닙니다.",
        "계약 상대방이 아니라 {E}에서 접수한 내부 요청입니다.",
    ]
    return render(pick(templates), E=entity, CHANNEL=pick(CHANNELS)), entity


def gen_project_non(index: int) -> tuple[str, str]:
    entity = f"{pick(['정기 점검', '업무 인수인계', '권한 검토', '운영 이관', '최종 검토', '회의 준비', '자료 취합'])} {pick(['1차', '2차', '오전', '오후', '월간', '분기'])}-{index:04d}"
    templates = [
        "{E}은 반복 업무명이라 공식 프로젝트명으로 분류하지 않습니다.",
        "{CHANNEL}에 등록된 {E} 일정은 프로젝트 코드가 아닙니다.",
        "{E}은 담당자 업무 상태라 프로젝트명 마스킹 대상이 아닙니다.",
    ]
    return render(pick(templates), E=entity, CHANNEL=pick(CHANNELS)), entity


def gen_financial_non(index: int) -> tuple[str, str]:
    context = pick(["대기 건수", "로그 라인 수", "참석 인원", "알림 횟수", "대여 수량", "교육 시간", "회의 차수"])
    if "시간" in context:
        entity = f"{index}시간"
    elif "차수" in context:
        entity = f"{index}차"
    else:
        entity = f"{index:,}건"
    templates = [
        "{C}는 {E}로 집계되었지만 금액 정보는 아닙니다.",
        "{CHANNEL}에 기록된 {E}는 {C} 값입니다.",
        "보고서의 {E}는 단순 수량이라 재무 수치로 보지 않습니다.",
    ]
    return render(pick(templates), E=entity, C=context, CHANNEL=pick(CHANNELS)), entity


GENERATORS: dict[tuple[str, str], Callable[[int], tuple[str, str]]] = {
    ("PERSON", "ENTITY"): gen_person_entity,
    ("ADDRESS", "ENTITY"): gen_address_entity,
    ("PASSWORD", "ENTITY"): gen_password_entity,
    ("API_KEY", "ENTITY"): gen_api_key_entity,
    ("DOCUMENT", "ENTITY"): gen_document_entity,
    ("ORG", "ENTITY"): gen_org_entity,
    ("PROJECT", "ENTITY"): gen_project_entity,
    ("FINANCIAL", "ENTITY"): gen_financial_entity,
    ("PERSON", "NON_ENTITY"): gen_person_non,
    ("ADDRESS", "NON_ENTITY"): gen_address_non,
    ("PASSWORD", "NON_ENTITY"): gen_password_non,
    ("API_KEY", "NON_ENTITY"): gen_api_key_non,
    ("DOCUMENT", "NON_ENTITY"): gen_document_non,
    ("ORG", "NON_ENTITY"): gen_org_non,
    ("PROJECT", "NON_ENTITY"): gen_project_non,
    ("FINANCIAL", "NON_ENTITY"): gen_financial_non,
}


def main() -> None:
    """전체 데이터셋 생성 진입점."""

    random.seed(RANDOM_SEED)
    global_texts: set[str] = set()
    summaries: list[tuple[str, dict[str, int]]] = []

    for (entity_type, label), generator in GENERATORS.items():
        rows = generate_rows(entity_type, label, generator, global_texts)
        suffix = "entity" if label == "ENTITY" else "non_entity"
        path = OUT_DIR / f"{entity_type.lower()}_{suffix}_5000.csv"
        write_csv(path, rows)
        summaries.append((path.name, validate(rows)))

    # 전체 중복 검증
    total_rows = sum(summary["rows"] for _, summary in summaries)
    total_unique_texts = len(global_texts)

    print(f"output_dir: {OUT_DIR}")
    print(f"total_rows: {total_rows}")
    print(f"global_unique_texts: {total_unique_texts}")
    print(f"global_duplicate_texts: {total_rows - total_unique_texts}")
    for filename, summary in summaries:
        print(filename, summary)


if __name__ == "__main__":
    main()
