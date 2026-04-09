// 네이버 쇼핑인사이트 카테고리 정보
import { trackApiCall } from "./api-monitor";

function getHeaders() {
  return {
    "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
    "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    "Content-Type": "application/json",
  };
}

// ─── 온톨로지 L1 → Naver Shopping 카테고리 매핑 ─────────────────
export const ONTOLOGY_TO_NAVER_CATEGORY: Record<string, string> = {
  // 스마트스토어
  "ss.food":      "50000006",
  "ss.fashion":   "50000000",
  "ss.accessory": "50000001",
  "ss.beauty":    "50000002",
  "ss.digital":   "50000003",
  "ss.furniture": "50000004",
  "ss.sports":    "50000007",
  "ss.health":    "50000008",
  "ss.baby":      "50000005",
  "ss.leisure":   "50000009",
  "ss.pet":       "50000008",
  // 쿠팡
  "cp.food":      "50000006",
  "cp.wfashion":  "50000000",
  "cp.mfashion":  "50000000",
  "cp.beauty":    "50000002",
  "cp.digital":   "50000003",
  "cp.kitchen":   "50000008",
  "cp.home":      "50000004",
  "cp.sports":    "50000007",
  "cp.pet":       "50000008",
  "cp.baby":      "50000005",
  "cp.living":    "50000008",
  "cp.wellness":  "50000008",
  "cp.auto":      "50000009",
  "cp.office":    "50000009",
};

// 네이버 쇼핑인사이트 대분류 12개 (getCategoryList.naver 기준)
export const CATEGORIES = [
  { name: "패션의류",      code: "50000000", emoji: "👗" },
  { name: "패션잡화",      code: "50000001", emoji: "👜" },
  { name: "화장품/미용",   code: "50000002", emoji: "💄" },
  { name: "디지털/가전",   code: "50000003", emoji: "💻" },
  { name: "가구/인테리어", code: "50000004", emoji: "🛋️" },
  { name: "출산/육아",     code: "50000005", emoji: "👶" },
  { name: "식품",          code: "50000006", emoji: "🍎" },
  { name: "스포츠/레저",   code: "50000007", emoji: "⚽" },
  { name: "생활/건강",     code: "50000008", emoji: "🏥" },
  { name: "여가/생활편의", code: "50000009", emoji: "🎭" },
  { name: "면세점",        code: "50000010", emoji: "🛍️" },
  { name: "도서",          code: "50005542", emoji: "📚" },
];

// 카테고리별 대표 키워드 (셀러 관점 큐레이션)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "50000000": [ // 패션의류
    "원피스","반팔티","청바지","코트","니트","레깅스","자켓","슬랙스",
    "롱스커트","맨투맨","가디건","블라우스","후드티","와이드팬츠","셔츠",
    "점프수트","민소매","트렌치코트","패딩","조거팬츠","크롭탑","빅사이즈",
    "린넨셔츠","오버핏티","여름원피스","린넨바지","스트라이프셔츠","무지티",
    "오프숄더","쉬폰블라우스",
  ],
  "50000001": [ // 패션잡화
    "크로스백","숄더백","백팩","토트백","클러치백","지갑","선글라스",
    "모자","스니커즈","샌들","힐","부츠","슬리퍼","벨트","스카프",
    "캡모자","버킷햇","미니백","에코백","카드지갑","장갑","귀걸이",
    "목걸이","팔찌","반지","시계","명품지갑","운동화","로퍼",
  ],
  "50000002": [ // 화장품/미용
    "선크림","에센스","파운데이션","쿠션","마스크팩","립스틱","눈썹펜슬",
    "토너","세럼","크림","BB크림","아이라이너","마스카라","클렌징폼",
    "미스트","앰플","아이크림","선스틱","각질제거","샴푸","트리트먼트",
    "헤어에센스","향수","틴트","컨실러","파우더","블러셔","하이라이터",
    "클렌징오일",
  ],
  "50000003": [ // 디지털/가전
    "무선이어폰","에어팟","노트북","태블릿","스마트워치","블루투스스피커",
    "보조배터리","스마트폰케이스","충전기","이어폰","키보드","마우스",
    "모니터","웹캠","USB허브","공기청정기","로봇청소기","무선청소기",
    "전기면도기","드라이기","고데기","전동칫솔","에어프라이어","전기포트",
    "커피머신","식기세척기","제습기","가습기","선풍기","에어서큘레이터",
  ],
  "50000004": [ // 가구/인테리어
    "책상","의자","침대","소파","수납장","옷장","식탁","선반",
    "커튼","러그","조명","스탠드","LED조명","벽선반","멀티탭",
    "행거","서랍장","화장대","컴퓨터책상","사무용의자","게이밍체어",
    "1인소파","빈백","침대프레임","매트리스","이불","베개","패브릭소파",
    "천장조명",
  ],
  "50000005": [ // 출산/육아
    "기저귀","분유","유모차","카시트","아기띠","젖병","이유식","장난감",
    "유아책","아기옷","배냇저고리","속싸개","아기침대","범퍼침대","보행기",
    "흔들의자","아기욕조","로션","젖꼭지","수유쿠션","바운서","아기카메라",
    "아기모빌","아기블록","유아식기","워터매트","킥보드","세발자전거",
  ],
  "50000006": [ // 식품
    "단백질쉐이크","비타민","홍삼","프로틴","콜라겐","오메가3","유산균",
    "다이어트식품","간식","견과류","과일청","원두커피","녹차","캡슐커피",
    "닭가슴살","샐러드","두부","계란","올리브오일","코코넛오일",
    "꿀","잡곡","현미","귀리","아몬드","호두","김","건어물","떡볶이",
  ],
  "50000007": [ // 스포츠/레저
    "요가매트","덤벨","폼롤러","저항밴드","훌라후프","줄넘기","헬스장갑",
    "러닝화","등산화","사이클복","수영복","골프공","골프장갑","텐트",
    "캠핑의자","캠핑테이블","랜턴","버너","코펠","침낭","등산배낭",
    "트레킹폴","킥보드","인라인","프로틴쉐이커","스포츠타이즈","헤드밴드",
    "등산스틱","낚시대",
  ],
  "50000008": [ // 생활/건강
    "칫솔","치약","면도기","샴푸","바디워시","수건","욕실슬리퍼","화장지",
    "물티슈","세제","섬유유연제","청소기","청소도구","주방세제","랩",
    "지퍼백","비닐봉지","종이컵","빨대","마스크","손소독제","두통약",
    "소화제","파스","체온계","혈압계","혈당계","안마기","족욕기",
  ],
  "50000009": [ // 여가/생활편의
    "보드게임","퍼즐","레고","피규어","카드게임","다이어리","캘린더",
    "여행가방","캐리어","여권지갑","여행용파우치","목베개","트래블킷",
    "악기","우쿨렐레","기타","드럼패드","키보드악기","독서대",
    "자전거","전동킥보드","스케이트보드","롤러스케이트",
    "반려동물용품","강아지옷","고양이간식","펫카메라",
    "자동차용품","차량방향제","블랙박스","카시트",
  ],
  "50000010": [ // 면세점
    "향수","명품가방","럭셔리화장품","선글라스브랜드","위스키","와인",
    "초콜릿","화장품세트","립스틱세트","스킨케어세트","향수선물세트",
    "명품지갑","시계","쥬얼리","캐시미어","구찌","샤넬","디올",
    "에르메스","루이비통","프라다","버버리","발렌시아가",
  ],
  "50005542": [ // 도서
    "베스트셀러","자기계발책","경제경영책","소설책","에세이","만화책",
    "어린이책","그림책","학습만화","수험서","영어책","일본어책",
    "요리책","육아책","건강책","여행책","IT책","파이썬책",
    "독서대","책받침","북스탠드","형광펜세트","포스트잇","노트",
  ],
};

export interface CategoryKeyword {
  rank: number;
  keyword: string;
}

export interface CategoryTrend {
  category: string;
  code: string;
  keywords: CategoryKeyword[];
}

// 카테고리 키워드 목록 반환 (pre-curated, Naver Shopping 경쟁도 미포함 버전 - 빠름)
export async function getCategoryKeywords(
  categoryCode: string,
  categoryName: string
): Promise<CategoryTrend> {
  const keywords = CATEGORY_KEYWORDS[categoryCode] ?? [];
  return {
    category: categoryName,
    code: categoryCode,
    keywords: keywords.map((kw, i) => ({ rank: i + 1, keyword: kw })),
  };
}

// 카테고리 트렌드 방향 조회 (네이버 쇼핑인사이트 /categories 엔드포인트)
export async function getCategoryTrendDirection(
  categoryCode: string,
  categoryName: string
): Promise<"상승" | "하락" | "안정"> {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 60);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const res = await fetch("https://openapi.naver.com/v1/datalab/shopping/categories", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        startDate: fmt(start),
        endDate: fmt(end),
        timeUnit: "week",
        category: [{ name: categoryName, param: [categoryCode] }],
      }),
      cache: "no-store",
    });

    if (!res.ok) return "안정";
    const json = await res.json();
    const data: { ratio: number }[] = json?.results?.[0]?.data ?? [];
    if (data.length < 4) return "안정";

    const recent = data.slice(-2).reduce((s, d) => s + d.ratio, 0) / 2;
    const prev = data.slice(-6, -4).reduce((s, d) => s + d.ratio, 0) / 2;

    if (recent > prev * 1.08) return "상승";
    if (recent < prev * 0.92) return "하락";
    return "안정";
  } catch {
    return "안정";
  }
}

// ─── Shopping Insight 키워드 인구통계 (별도 한도!) ─────────────────

const SHOPPING_INSIGHT_BASE = "https://openapi.naver.com/v1/datalab/shopping/category/keyword";

// Shopping Insight 연령 그룹 (6개 — DataLab Search의 11개와 다름)
export const SHOPPING_AGE_GROUPS = [
  { code: "10", label: "10대" },
  { code: "20", label: "20대" },
  { code: "30", label: "30대" },
  { code: "40", label: "40대" },
  { code: "50", label: "50대" },
  { code: "60", label: "60대+" },
] as const;

export interface ShoppingDemographicData {
  maleRatio: number;
  femaleRatio: number;
  ageGroups: { age: string; code: string; ratio: number }[];
  hasGenderData: boolean;
  hasAgeData: boolean;
  usedKeyword: string;
}

// 키워드 → Naver Shopping 카테고리 코드 추론
export async function resolveNaverCategoryCode(keyword: string): Promise<string | null> {
  // 1순위: 온톨로지 분류
  try {
    const { classifyKeyword } = await import("./ontology/index");
    const cls = classifyKeyword(keyword);
    if (cls) {
      const l1 = cls.path.split(".").slice(0, 2).join(".");
      const code = ONTOLOGY_TO_NAVER_CATEGORY[l1];
      if (code) return code;
    }
  } catch { /* 온톨로지 실패 시 다음 단계 */ }

  // 2순위: Naver Shopping Search로 카테고리 추론 (25K 한도, 여유)
  try {
    const { searchNaver } = await import("./naver");
    const res = await searchNaver(keyword, 1);
    if (res.items.length > 0) {
      const cat1 = res.items[0].category1;
      const match = CATEGORIES.find((c) => c.name === cat1);
      if (match) return match.code;
    }
  } catch { /* 검색 실패 시 기본값 */ }

  return null;
}

// Shopping Insight 인구통계 가져오기 (성별 1회 + 연령 1회 = 2회)
export async function fetchShoppingDemographics(
  keyword: string,
  categoryCode: string
): Promise<ShoppingDemographicData> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const body = {
    startDate: fmt(start),
    endDate: fmt(end),
    timeUnit: "month",
    category: categoryCode,
    keyword,
  };

  // 성별 + 연령 병렬 호출 (2회) — 한도 체크
  if (!trackApiCall("naver_insight") || !trackApiCall("naver_insight")) {
    return { maleRatio: 50, femaleRatio: 50, ageGroups: SHOPPING_AGE_GROUPS.map(g => ({ age: g.label, code: g.code, ratio: 0 })), hasGenderData: false, hasAgeData: false, usedKeyword: keyword };
  }
  const [genderRes, ageRes] = await Promise.all([
    fetch(`${SHOPPING_INSIGHT_BASE}/gender`, {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify(body), cache: "no-store",
    }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${SHOPPING_INSIGHT_BASE}/age`, {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify(body), cache: "no-store",
    }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  // ── 성별 파싱 ──
  type DataPoint = { period: string; ratio: number; group: string };
  const genderData: DataPoint[] = genderRes?.results?.[0]?.data ?? [];

  const malePoints = genderData.filter((d) => d.group === "m");
  const femalePoints = genderData.filter((d) => d.group === "f");
  const hasGenderData = malePoints.length > 0 || femalePoints.length > 0;

  const maleAvg = malePoints.length > 0
    ? malePoints.reduce((s, d) => s + d.ratio, 0) / malePoints.length : 0;
  const femaleAvg = femalePoints.length > 0
    ? femalePoints.reduce((s, d) => s + d.ratio, 0) / femalePoints.length : 0;

  let maleRatio = 50;
  let femaleRatio = 50;
  if (hasGenderData) {
    const total = maleAvg + femaleAvg;
    maleRatio = total > 0 ? Math.round((maleAvg / total) * 100) : 50;
    femaleRatio = 100 - maleRatio;
  }

  // ── 연령 파싱 ──
  const ageData: DataPoint[] = ageRes?.results?.[0]?.data ?? [];
  const hasAgeData = ageData.length > 0;

  const ageMap = new Map<string, number[]>();
  for (const d of ageData) {
    const arr = ageMap.get(d.group) ?? [];
    arr.push(d.ratio);
    ageMap.set(d.group, arr);
  }

  const ageRaws = SHOPPING_AGE_GROUPS.map((g) => {
    const vals = ageMap.get(g.code) ?? [];
    const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return { age: g.label, code: g.code, val: avg };
  });

  const ageTotal = ageRaws.reduce((s, a) => s + a.val, 0);
  let ageGroups: { age: string; code: string; ratio: number }[];

  if (!hasAgeData || ageTotal === 0) {
    ageGroups = ageRaws.map((a) => ({ age: a.age, code: a.code, ratio: 0 }));
  } else {
    ageGroups = ageRaws.map((a) => ({
      age: a.age, code: a.code,
      ratio: Math.round((a.val / ageTotal) * 100),
    }));
    // 반올림 오차 보정
    const sum = ageGroups.reduce((s, a) => s + a.ratio, 0);
    if (sum !== 100) {
      const maxIdx = ageGroups.reduce((mi, a, i, arr) => a.ratio > arr[mi].ratio ? i : mi, 0);
      ageGroups[maxIdx].ratio += (100 - sum);
    }
  }

  return {
    maleRatio, femaleRatio, ageGroups,
    hasGenderData, hasAgeData, usedKeyword: keyword,
  };
}
