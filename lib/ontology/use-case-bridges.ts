/**
 * 사용 시나리오 브릿지 + 창의적 수식어
 * 크로스 카테고리 키워드 발굴을 위한 정적 매핑
 */

/** 사용 시나리오 → 관련 온톨로지 경로 (L1~L2 수준) */
export const USE_CASE_BRIDGES: Record<string, string[]> = {
  // 아웃도어/레저
  캠핑:       ["ss.food.meat", "ss.food.seafood", "ss.sports.camping", "ss.furniture.outdoor", "ss.digital.portable"],
  글램핑:     ["ss.food.fruit", "ss.food.meat", "ss.furniture.outdoor", "ss.fashion.outdoor"],
  차박:       ["ss.digital.portable", "ss.furniture.outdoor", "ss.food.snack", "ss.health.sleep"],
  피크닉:     ["ss.food.snack", "ss.food.drink", "ss.furniture.outdoor", "ss.fashion.bag"],
  등산:       ["ss.sports.hiking", "ss.fashion.shoes", "ss.food.snack", "ss.health.supplement"],
  낚시:       ["ss.sports.fishing", "ss.food.seafood", "ss.fashion.outdoor", "ss.digital.camera"],
  여행:       ["ss.fashion.bag", "ss.digital.portable", "ss.beauty.mini", "ss.food.snack"],

  // 선물/이벤트
  선물:       ["ss.food.fruit", "ss.beauty.skincare", "ss.fashion.accessory", "ss.health.supplement", "ss.food.premium"],
  집들이:     ["ss.furniture.interior", "ss.food.drink", "ss.beauty.diffuser", "ss.health.air"],
  생일:       ["ss.food.cake", "ss.beauty.cosmetic", "ss.fashion.accessory", "ss.digital.gadget"],
  명절:       ["ss.food.gift", "ss.food.meat", "ss.food.fruit", "ss.health.supplement"],
  어버이날:   ["ss.health.supplement", "ss.beauty.skincare", "ss.food.premium", "ss.fashion.accessory"],
  크리스마스: ["ss.food.cake", "ss.furniture.deco", "ss.fashion.accessory", "ss.digital.gadget"],

  // 인구통계
  "1인가구":  ["ss.food.meal", "ss.furniture.small", "ss.digital.mini", "ss.health.simple"],
  자취생:     ["ss.food.instant", "ss.furniture.small", "ss.digital.mini", "ss.health.simple"],
  신혼부부:   ["ss.furniture.interior", "ss.digital.kitchen", "ss.food.premium", "ss.health.couple"],
  직장인:     ["ss.food.meal", "ss.fashion.office", "ss.digital.portable", "ss.health.supplement"],
  대학생:     ["ss.digital.portable", "ss.food.instant", "ss.fashion.casual", "ss.sports.fitness"],
  워킹맘:     ["ss.food.meal", "ss.baby.care", "ss.beauty.quick", "ss.health.supplement"],
  시니어:     ["ss.health.supplement", "ss.food.soft", "ss.digital.simple", "ss.furniture.comfort"],

  // 라이프스타일
  다이어트:   ["ss.food.diet", "ss.health.supplement", "ss.sports.fitness", "ss.food.salad"],
  비건:       ["ss.food.vegan", "ss.beauty.natural", "ss.health.plant", "ss.fashion.eco"],
  친환경:     ["ss.food.organic", "ss.health.natural", "ss.baby.organic", "ss.furniture.eco"],
  홈카페:     ["ss.food.coffee", "ss.digital.kitchen", "ss.furniture.cafe", "ss.food.dessert"],
  홈트레이닝: ["ss.sports.fitness", "ss.health.protein", "ss.digital.wearable", "ss.fashion.sportswear"],
  반려동물:   ["ss.pet.food", "ss.pet.toy", "ss.pet.care", "ss.furniture.pet"],
  재택근무:   ["ss.digital.monitor", "ss.furniture.desk", "ss.food.coffee", "ss.health.eye"],
  미니멀:     ["ss.furniture.simple", "ss.fashion.basic", "ss.digital.compact", "ss.beauty.allone"],

  // 조리/방법
  에어프라이어: ["ss.food.frozen", "ss.food.chicken", "ss.food.snack", "ss.digital.kitchen"],
  전자레인지:   ["ss.food.instant", "ss.food.meal", "ss.food.rice", "ss.digital.kitchen"],
  바베큐:       ["ss.food.meat", "ss.sports.camping", "ss.furniture.outdoor", "ss.food.sauce"],

  // 계절
  여름:       ["ss.food.fruit", "ss.fashion.summer", "ss.health.cooling", "ss.sports.water"],
  겨울:       ["ss.food.hot", "ss.fashion.winter", "ss.health.warm", "ss.furniture.heating"],
  장마:       ["ss.fashion.rain", "ss.furniture.dehumid", "ss.health.mold", "ss.digital.waterproof"],
};

/**
 * 창의적 수식어 (기존 "추천/할인/가성비"와 차별화)
 *
 * allow: 해당 수식어를 적용할 수 있는 L1 카테고리 (온톨로지 경로 접두어)
 *   - null이면 모든 카테고리에 적용 가능
 *   - 배열이면 해당 L1에만 적용
 */
interface ModifierGroup {
  words: string[];
  allow: string[] | null; // null = 전체 허용, ["food","health"] = 식품/건강만
}

export const CREATIVE_MODIFIER_GROUPS: Record<string, ModifierGroup> = {
  situation:    { words: ["출근길", "퇴근길", "새벽", "심야", "비오는날", "주말", "휴일", "방학", "연휴"], allow: null },
  demographic:  { words: ["1인가구", "직장인", "신혼부부", "시니어", "대학생", "자취생", "워킹맘", "맞벌이", "육아맘"], allow: null },
  lifestyle:    { words: ["감성", "힐링", "미니멀", "빈티지", "레트로"], allow: null },
  ecoLifestyle: { words: ["친환경", "비건", "제로웨이스트"], allow: ["food", "beauty", "health", "baby"] },
  occasion:     { words: ["집들이", "생일", "어버이날", "스승의날", "크리스마스", "결혼기념일", "돌잔치", "명절", "졸업"], allow: null },
  methodFood:   { words: ["에어프라이어", "전자레인지", "도시락"], allow: ["food"] },
  methodOutdoor:{ words: ["캠핑", "차박", "글램핑", "피크닉"], allow: null },
  methodFit:    { words: ["홈트"], allow: ["sports", "health", "food"] },
  qualityFood:  { words: ["수제", "유기농", "무첨가", "저칼로리", "글루텐프리"], allow: ["food", "health"] },
  qualityAll:   { words: ["장인", "프리미엄", "소량", "맞춤"], allow: null },
  purposeFood:  { words: ["혼밥", "혼술", "간식용"], allow: ["food"] },
  purposeAll:   { words: ["선물용", "비상용", "보관용", "휴대용", "사무실용", "차량용"], allow: null },
  homeCafe:     { words: ["홈카페"], allow: ["food", "digital", "furniture"] },
};

/** 하위 호환: 기존 CREATIVE_MODIFIERS 형태 (전체 flat) */
export const CREATIVE_MODIFIERS: Record<string, string[]> = Object.fromEntries(
  Object.entries(CREATIVE_MODIFIER_GROUPS).map(([k, v]) => [k, v.words])
);

/**
 * 시드 키워드의 온톨로지 경로에서 L1 카테고리를 추출하고,
 * 해당 카테고리에 적용 가능한 수식어만 반환
 */
export function getFilteredModifiers(seedPath: string | undefined): string[] {
  // L1 추출: "ss.food.meat.chicken" → "food"
  const l1 = seedPath ? seedPath.split(".")[1] : undefined;

  const result: string[] = [];
  for (const group of Object.values(CREATIVE_MODIFIER_GROUPS)) {
    if (group.allow === null || (l1 && group.allow.includes(l1))) {
      result.push(...group.words);
    }
  }
  return result;
}

/** 뻔한 수식어 (기존 추천에서 많이 쓰이는 것들) */
export const COMMON_MODIFIERS = [
  "추천", "인기", "가성비", "프리미엄", "할인", "최저가", "저렴한",
  "남성용", "여성용", "대용량", "소포장", "세트", "선물세트",
  "가정용", "국내산", "경량", "접이식", "무선", "베스트", "특가",
];

const ALL_CREATIVE = Object.values(CREATIVE_MODIFIERS).flat();

/**
 * 키워드에서 사용 시나리오 태그 추출
 * 키워드 토큰이 브릿지 키에 포함되거나, 창의적 수식어에 매칭되면 반환
 */
export function findUseCases(keyword: string): string[] {
  const tokens = keyword.split(/\s+/);
  const cases = new Set<string>();

  for (const [useCase] of Object.entries(USE_CASE_BRIDGES)) {
    for (const token of tokens) {
      if (token.includes(useCase) || useCase.includes(token)) {
        cases.add(useCase);
      }
    }
  }

  return Array.from(cases);
}

/**
 * 키워드 토큰이 창의적 수식어인지 판별
 */
export function isCreativeModifier(token: string): boolean {
  return ALL_CREATIVE.some((m) => token.includes(m) || m.includes(token));
}

/**
 * 키워드 토큰이 뻔한 수식어인지 판별
 */
export function isCommonModifier(token: string): boolean {
  return COMMON_MODIFIERS.some((m) => token.includes(m) || m.includes(token));
}
