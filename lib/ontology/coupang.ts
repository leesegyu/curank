/**
 * 쿠팡 전용 카테고리 온톨로지
 * 쿠팡 카테고리 체계 기반 (스마트스토어와 다른 L1 구조)
 *
 * 쿠팡 특수: 여성패션/남성패션 분리, 주방용품 독립, 반려동물 카테고리 등
 */

import type { OntologyNode } from "./types";

export const COUPANG_NODES: OntologyNode[] = [

  // ═══════════════════════════════════════════════════════════════
  // L1: 식품 (쿠팡 로켓프레시 기반)
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.food", name: "식품", level: 1, parent: null,
    matchKeywords: ["식품", "음식", "식재료", "로켓프레시"],
    seedKeywords: [] },

  { id: "cp.food.meat", name: "축산/계란", level: 2, parent: "cp.food",
    matchKeywords: ["고기", "육류", "축산", "정육", "계란"],
    seedKeywords: [] },

  { id: "cp.food.meat.pork", name: "돼지고기", level: 3, parent: "cp.food.meat",
    matchKeywords: ["돼지고기", "돈육"],
    seedKeywords: [] },
  { id: "cp.food.meat.pork.belly", name: "삼겹살", level: 4, parent: "cp.food.meat.pork",
    matchKeywords: ["삼겹살", "삼겹", "통삼겹"],
    seedKeywords: [
      "쿠팡 로켓프레시 삼겹살 국내산", "대패 삼겹살 냉동 1kg",
      "한돈 냉장 삼겹살 구이용", "에어프라이어 벌집 삼겹살",
    ] },
  { id: "cp.food.meat.pork.belly_camping", name: "캠핑용 삼겹살", level: 4, parent: "cp.food.meat.pork",
    matchKeywords: ["캠핑 삼겹", "바베큐 삼겹", "아웃도어 고기"],
    seedKeywords: [
      "캠핑 삼겹살 국내산 소포장", "숯불구이 삼겹살 세트",
      "차박 BBQ 삼겹살 밀키트", "캠핑 양념삼겹 즉석구이",
    ] },
  { id: "cp.food.meat.pork.belly_aged", name: "숙성 삼겹살", level: 4, parent: "cp.food.meat.pork",
    matchKeywords: ["숙성 삼겹", "수비드 삼겹", "에이징 삼겹"],
    seedKeywords: [
      "7일 숙성 국내산 삼겹 500g", "수비드 삼겹살 즉석조리",
      "웻에이징 한돈 삼겹 프리미엄", "드라이에이징 삼겹살",
    ] },
  { id: "cp.food.meat.pork.neck", name: "목살/특수부위", level: 4, parent: "cp.food.meat.pork",
    matchKeywords: ["목살", "항정살", "갈매기살", "가브리살"],
    seedKeywords: [
      "한돈 목살 냉장 두툼 구이", "항정살 구이용 500g",
      "갈매기살 냉동 특수부위", "가브리살 냉장 소포장",
    ] },

  { id: "cp.food.meat.beef", name: "소고기", level: 3, parent: "cp.food.meat",
    matchKeywords: ["소고기", "한우", "호주산소", "미국산소"],
    seedKeywords: [] },
  { id: "cp.food.meat.beef.sirloin", name: "등심/채끝", level: 4, parent: "cp.food.meat.beef",
    matchKeywords: ["등심", "안심", "꽃등심", "채끝", "스테이크"],
    seedKeywords: [
      "한우 1++ 등심 선물세트", "미국산 채끝 스테이크 200g",
      "호주산 꽃등심 슬라이스", "안심 스테이크 냉장",
    ] },
  { id: "cp.food.meat.beef.ribs", name: "갈비", level: 4, parent: "cp.food.meat.beef",
    matchKeywords: ["갈비", "LA갈비", "소갈비", "차돌박이"],
    seedKeywords: [
      "LA갈비 양념 1kg 냉동", "한우 차돌박이 300g",
      "소갈비찜용 국내산", "명절 소갈비 세트",
    ] },

  { id: "cp.food.meat.chicken", name: "닭/오리", level: 3, parent: "cp.food.meat",
    matchKeywords: ["닭고기", "닭가슴살", "오리", "닭발"],
    seedKeywords: [
      "훈제 닭가슴살 30팩 대용량", "무항생제 생닭 1kg",
      "오리훈제 슬라이스", "닭발 매콤 양념 냉동",
    ] },

  { id: "cp.food.meat.seafood", name: "수산물", level: 3, parent: "cp.food.meat",
    matchKeywords: ["해산물", "생선", "새우", "오징어", "굴"],
    seedKeywords: [
      "왕새우 냉동 1kg", "손질 오징어 국내산",
      "통영 굴 생굴 1kg", "고등어 순살 필렛",
    ] },

  { id: "cp.food.health", name: "건강식품", level: 2, parent: "cp.food",
    matchKeywords: ["건강식품", "다이어트", "프로틴"],
    seedKeywords: [] },
  { id: "cp.food.health.protein", name: "단백질/보충제", level: 3, parent: "cp.food.health",
    matchKeywords: ["프로틴", "단백질바", "BCAA", "보충제"],
    seedKeywords: [
      "저당 단백질바 초코 20입", "유청 프로틴 파우더",
      "BCAA 아미노산 2000mg", "비건 프로틴 쉐이크",
    ] },
  { id: "cp.food.health.diet", name: "다이어트식품", level: 3, parent: "cp.food.health",
    matchKeywords: ["곤약", "저칼로리", "다이어트", "식이섬유"],
    seedKeywords: [
      "곤약 젤리 저칼로리 30개", "곤약쌀 즉석밥 10팩",
      "저칼로리 과자 뻥튀기", "식이섬유 분말 30포",
    ] },

  { id: "cp.food.drink", name: "음료", level: 2, parent: "cp.food",
    matchKeywords: ["커피", "음료", "차", "주스", "생수"],
    seedKeywords: [] },
  { id: "cp.food.drink.coffee", name: "커피", level: 3, parent: "cp.food.drink",
    matchKeywords: ["커피", "원두", "콜드브루", "캡슐커피"],
    seedKeywords: [
      "로켓배송 원두커피 1kg", "콜드브루 커피 1L 대용량",
      "호환 캡슐커피 100개입", "스틱커피 아메리카노 100T",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 여성패션 (쿠팡 특수: 성별 분리)
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.wfashion", name: "여성패션", level: 1, parent: null,
    matchKeywords: ["여성패션", "여성옷", "여성의류", "여자옷"],
    seedKeywords: [] },

  { id: "cp.wfashion.tops", name: "여성상의", level: 2, parent: "cp.wfashion",
    matchKeywords: ["여성상의", "블라우스", "여성니트"],
    seedKeywords: [] },
  { id: "cp.wfashion.tops.tshirt", name: "여성 티셔츠", level: 3, parent: "cp.wfashion.tops",
    matchKeywords: ["여성 반팔", "여성 티셔츠", "여성 민소매"],
    seedKeywords: [
      "오버핏 여성 반팔티", "크롭 반팔 여성 여름",
      "린넨 민소매 나시 여성", "슬라브 V넥 여성 티셔츠",
    ] },
  { id: "cp.wfashion.tops.blouse", name: "블라우스/셔츠", level: 3, parent: "cp.wfashion.tops",
    matchKeywords: ["블라우스", "여성 셔츠", "시스루"],
    seedKeywords: [
      "봄 시스루 블라우스 여성", "린넨 셔츠 오버핏 여성",
      "리본 블라우스 출근룩", "스트라이프 여성 셔츠",
    ] },

  { id: "cp.wfashion.bottoms", name: "여성하의", level: 2, parent: "cp.wfashion",
    matchKeywords: ["여성바지", "여성치마", "스커트"],
    seedKeywords: [] },
  { id: "cp.wfashion.bottoms.pants", name: "여성 바지", level: 3, parent: "cp.wfashion.bottoms",
    matchKeywords: ["여성 슬랙스", "여성 와이드", "여성 청바지"],
    seedKeywords: [
      "하이웨이스트 와이드 슬랙스", "스판 스키니 청바지 여성",
      "밴딩 린넨 팬츠 여성", "구김없는 여성 정장바지",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 남성패션
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.mfashion", name: "남성패션", level: 1, parent: null,
    matchKeywords: ["남성패션", "남성옷", "남성의류", "남자옷"],
    seedKeywords: [] },

  { id: "cp.mfashion.tops", name: "남성상의", level: 2, parent: "cp.mfashion",
    matchKeywords: ["남성 상의", "남성 셔츠"],
    seedKeywords: [] },
  { id: "cp.mfashion.tops.tshirt", name: "남성 티셔츠", level: 3, parent: "cp.mfashion.tops",
    matchKeywords: ["남성 반팔", "남성 티셔츠", "남성 폴로"],
    seedKeywords: [
      "오버핏 남성 반팔티 무지", "쿨링 기능성 반팔 남성",
      "폴로셔츠 남성 카라티", "슬럽 라운드 남성 여름",
    ] },

  { id: "cp.mfashion.bottoms", name: "남성하의", level: 2, parent: "cp.mfashion",
    matchKeywords: ["남성바지", "남성 청바지"],
    seedKeywords: [] },
  { id: "cp.mfashion.bottoms.pants", name: "남성 바지", level: 3, parent: "cp.mfashion.bottoms",
    matchKeywords: ["남성 슬랙스", "남성 면바지", "남성 청바지"],
    seedKeywords: [
      "밴딩 면바지 남성 여름", "슬림핏 청바지 남성",
      "스판 정장 슬랙스 남성", "조거팬츠 남성 스트릿",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 뷰티
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.beauty", name: "뷰티", level: 1, parent: null,
    matchKeywords: ["뷰티", "화장품", "스킨케어", "메이크업"],
    seedKeywords: [] },

  { id: "cp.beauty.skincare", name: "스킨케어", level: 2, parent: "cp.beauty",
    matchKeywords: ["스킨케어", "기초화장"],
    seedKeywords: [] },
  { id: "cp.beauty.skincare.moisture", name: "보습/수분", level: 3, parent: "cp.beauty.skincare",
    matchKeywords: ["수분크림", "보습크림", "세럼", "에센스"],
    seedKeywords: [
      "수분크림 건성 대용량", "히알루론산 세럼 보습",
      "쿠팡 로켓배송 에센스", "판테놀 진정크림",
    ] },
  { id: "cp.beauty.skincare.sun", name: "선케어", level: 3, parent: "cp.beauty.skincare",
    matchKeywords: ["선크림", "자외선차단제", "선스틱"],
    seedKeywords: [
      "SPF50 순한 선크림 대용량", "물리적 무기자차 선크림",
      "쿠팡 인기 선스틱 휴대용", "아기 선크림 저자극",
    ] },

  { id: "cp.beauty.makeup", name: "메이크업", level: 2, parent: "cp.beauty",
    matchKeywords: ["색조", "립스틱", "쿠션", "파운데이션"],
    seedKeywords: [] },
  { id: "cp.beauty.makeup.base", name: "베이스메이크업", level: 3, parent: "cp.beauty.makeup",
    matchKeywords: ["쿠션팩트", "파운데이션", "BB크림"],
    seedKeywords: [
      "커버력 쿠션팩트 리필 포함", "촉촉한 BB크림 자연스러운",
      "세미매트 파운데이션 밀착", "톤업크림 보라색",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 가전디지털 (쿠팡 명칭)
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.digital", name: "가전디지털", level: 1, parent: null,
    matchKeywords: ["가전", "디지털", "전자기기"],
    seedKeywords: [] },

  { id: "cp.digital.audio", name: "음향기기", level: 2, parent: "cp.digital",
    matchKeywords: ["이어폰", "스피커", "헤드폰"],
    seedKeywords: [] },
  { id: "cp.digital.audio.earphone", name: "이어폰/헤드폰", level: 3, parent: "cp.digital.audio",
    matchKeywords: ["무선이어폰", "블루투스이어폰", "에어팟", "헤드셋"],
    seedKeywords: [
      "쿠팡 로켓배송 무선이어폰", "노이즈캔슬링 블루투스",
      "유선 이어폰 게이밍", "오픈형 무선 이어폰 스포츠",
    ] },

  { id: "cp.digital.peripheral", name: "PC주변기기", level: 2, parent: "cp.digital",
    matchKeywords: ["키보드", "마우스", "허브"],
    seedKeywords: [] },
  { id: "cp.digital.peripheral.keyboard", name: "키보드", level: 3, parent: "cp.digital.peripheral",
    matchKeywords: ["기계식키보드", "무선키보드", "텐키리스"],
    seedKeywords: [
      "적축 기계식 키보드 RGB", "저소음 무선 키보드 슬림",
      "로켓배송 블루투스 키보드", "가성비 텐키리스 기계식",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 주방용품 (쿠팡 특수 — 스마트스토어는 여가/생활에 포함)
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.kitchen", name: "주방용품", level: 1, parent: null,
    matchKeywords: ["주방", "조리도구", "그릇", "수납"],
    seedKeywords: [] },

  { id: "cp.kitchen.cookware", name: "조리도구", level: 2, parent: "cp.kitchen",
    matchKeywords: ["프라이팬", "냄비", "칼", "도마"],
    seedKeywords: [] },
  { id: "cp.kitchen.cookware.pan", name: "프라이팬/냄비", level: 3, parent: "cp.kitchen.cookware",
    matchKeywords: ["프라이팬", "냄비", "웍", "그리들"],
    seedKeywords: [
      "인덕션 프라이팬 세트", "스텐 냄비세트 4종",
      "캠핑 그리들 팬 대형", "에어프라이어 전용 그릴팬",
    ] },
  { id: "cp.kitchen.cookware.knife", name: "칼/도마", level: 3, parent: "cp.kitchen.cookware",
    matchKeywords: ["칼", "도마", "가위", "칼세트"],
    seedKeywords: [
      "원목도마 항균 대형", "다마스커스 칼세트 5종",
      "주방가위 분리형 스텐", "실리콘 도마 접이식",
    ] },

  { id: "cp.kitchen.storage", name: "주방수납/정리", level: 2, parent: "cp.kitchen",
    matchKeywords: ["주방수납", "밀폐용기", "접시", "컵"],
    seedKeywords: [] },
  { id: "cp.kitchen.storage.container", name: "밀폐용기/보관", level: 3, parent: "cp.kitchen.storage",
    matchKeywords: ["밀폐용기", "반찬통", "보관용기", "글라스락"],
    seedKeywords: [
      "글라스락 밀폐용기 12개세트", "스텐 밀폐용기 반찬통",
      "김치통 대용량 냉장고용", "이유식 보관용기 소분",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 홈인테리어
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.home", name: "홈인테리어", level: 1, parent: null,
    matchKeywords: ["가구", "인테리어", "침구", "커튼"],
    seedKeywords: [] },

  { id: "cp.home.furniture", name: "가구", level: 2, parent: "cp.home",
    matchKeywords: ["소파", "책상", "의자", "침대"],
    seedKeywords: [] },
  { id: "cp.home.furniture.sofa", name: "소파/의자", level: 3, parent: "cp.home.furniture",
    matchKeywords: ["소파", "암체어", "리클라이너", "좌식"],
    seedKeywords: [
      "1인소파 패브릭 원룸용", "코너소파 세트 배송설치",
      "리클라이너 전동 소파", "좌식의자 등받이 쿠션",
    ] },

  { id: "cp.home.bedding", name: "침구", level: 2, parent: "cp.home",
    matchKeywords: ["이불", "베개", "매트리스", "침구"],
    seedKeywords: [] },
  { id: "cp.home.bedding.pillow", name: "베개/매트리스", level: 3, parent: "cp.home.bedding",
    matchKeywords: ["베개", "매트리스토퍼", "경추베개"],
    seedKeywords: [
      "메모리폼 경추베개 낮은", "매트리스 토퍼 7cm 접이식",
      "호텔식 구스다운 베개", "라텍스 베개 목편한",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 스포츠/레저
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.sports", name: "스포츠/레저", level: 1, parent: null,
    matchKeywords: ["스포츠", "운동", "레저", "캠핑"],
    seedKeywords: [] },

  { id: "cp.sports.fitness", name: "피트니스", level: 2, parent: "cp.sports",
    matchKeywords: ["헬스", "요가", "필라테스", "홈트"],
    seedKeywords: [] },
  { id: "cp.sports.fitness.equipment", name: "운동기구", level: 3, parent: "cp.sports.fitness",
    matchKeywords: ["덤벨", "요가매트", "폼롤러", "밴드"],
    seedKeywords: [
      "조절덤벨 24kg 가정용", "TPE 요가매트 8mm 두꺼운",
      "폼롤러 근막이완 45cm", "힙업 저항밴드 5단계",
    ] },

  { id: "cp.sports.camping", name: "캠핑", level: 2, parent: "cp.sports",
    matchKeywords: ["캠핑", "텐트", "캠핑의자"],
    seedKeywords: [] },
  { id: "cp.sports.camping.gear", name: "캠핑장비", level: 3, parent: "cp.sports.camping",
    matchKeywords: ["텐트", "의자", "테이블", "타프"],
    seedKeywords: [
      "원터치 텐트 2인용 팝업", "경량 폴딩 캠핑의자",
      "접이식 알루미늄 테이블", "쿠팡 로켓배송 텐트",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 반려동물 (쿠팡 특수 카테고리)
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.pet", name: "반려동물", level: 1, parent: null,
    matchKeywords: ["반려동물", "강아지", "고양이", "펫"],
    seedKeywords: [] },

  { id: "cp.pet.dog", name: "강아지", level: 2, parent: "cp.pet",
    matchKeywords: ["강아지", "개", "반려견"],
    seedKeywords: [] },
  { id: "cp.pet.dog.food", name: "강아지 사료/간식", level: 3, parent: "cp.pet.dog",
    matchKeywords: ["사료", "강아지사료", "개간식", "애견"],
    seedKeywords: [
      "강아지 사료 소형견 6kg", "강아지 간식 덴탈껌",
      "소프트 사료 노견용", "연어 그레인프리 사료",
    ] },
  { id: "cp.pet.dog.supply", name: "강아지 용품", level: 3, parent: "cp.pet.dog",
    matchKeywords: ["강아지용품", "하네스", "배변패드", "강아지집"],
    seedKeywords: [
      "강아지 배변패드 200매", "소형견 하네스 가슴줄",
      "강아지 이동장 캐리어", "반려견 GPS 트래커",
    ] },

  { id: "cp.pet.cat", name: "고양이", level: 2, parent: "cp.pet",
    matchKeywords: ["고양이", "캣", "묘"],
    seedKeywords: [] },
  { id: "cp.pet.cat.food", name: "고양이 사료/간식", level: 3, parent: "cp.pet.cat",
    matchKeywords: ["고양이사료", "캣사료", "고양이간식", "츄르"],
    seedKeywords: [
      "고양이사료 전연령 6kg", "츄르 고양이 간식 20개",
      "그레인프리 캣사료 연어", "고양이 습식캔 24입",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 출산/유아동
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.baby", name: "출산/유아동", level: 1, parent: null,
    matchKeywords: ["아기", "유아", "출산", "신생아"],
    seedKeywords: [] },

  { id: "cp.baby.diaper", name: "기저귀/물티슈", level: 2, parent: "cp.baby",
    matchKeywords: ["기저귀", "물티슈", "팬티기저귀"],
    seedKeywords: [] },
  { id: "cp.baby.diaper.item", name: "기저귀", level: 3, parent: "cp.baby.diaper",
    matchKeywords: ["기저귀", "팬티기저귀", "밤기저귀"],
    seedKeywords: [
      "로켓배송 기저귀 밴드형 대형", "팬티기저귀 대용량 박스",
      "밤기저귀 오버나이트 특대", "유기농 기저귀 신생아",
    ] },

  { id: "cp.baby.feeding", name: "수유/이유식", level: 2, parent: "cp.baby",
    matchKeywords: ["수유", "젖병", "이유식"],
    seedKeywords: [] },
  { id: "cp.baby.feeding.bottle", name: "젖병/컵", level: 3, parent: "cp.baby.feeding",
    matchKeywords: ["젖병", "빨대컵", "이유식용기"],
    seedKeywords: [
      "PPSU 젖병 260ml 세트", "누수방지 빨대컵 아기",
      "실리콘 이유식 용기 세트", "아기 식판 흡착형",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 생활용품
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.living", name: "생활용품", level: 1, parent: null,
    matchKeywords: ["생활", "세탁", "청소", "욕실"],
    seedKeywords: [] },

  { id: "cp.living.cleaning", name: "청소/세탁", level: 2, parent: "cp.living",
    matchKeywords: ["청소", "세탁", "세제", "물걸레"],
    seedKeywords: [] },
  { id: "cp.living.cleaning.item", name: "청소용품", level: 3, parent: "cp.living.cleaning",
    matchKeywords: ["물걸레", "청소포", "세제", "섬유유연제"],
    seedKeywords: [
      "물걸레 청소기 패드 40매", "세탁세제 캡슐 대용량",
      "섬유유연제 고농축 3L", "화장실 곰팡이 제거제",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 헬스/건강식품
  // ═══════════════════════════════════════════════════════════════
  { id: "cp.wellness", name: "헬스/건강식품", level: 1, parent: null,
    matchKeywords: ["건강", "영양제", "비타민", "마사지"],
    seedKeywords: [] },

  { id: "cp.wellness.supplement", name: "영양제", level: 2, parent: "cp.wellness",
    matchKeywords: ["비타민", "유산균", "오메가3", "영양제"],
    seedKeywords: [] },
  { id: "cp.wellness.supplement.vitamin", name: "비타민/미네랄", level: 3, parent: "cp.wellness.supplement",
    matchKeywords: ["비타민C", "비타민D", "종합비타민", "마그네슘"],
    seedKeywords: [
      "종합비타민 멀티 365일분", "비타민D 5000IU 연질캡슐",
      "마그네슘 수면 보조 90정", "비타민C 1000mg 대용량",
    ] },
  { id: "cp.wellness.supplement.probiotics", name: "유산균", level: 3, parent: "cp.wellness.supplement",
    matchKeywords: ["유산균", "프로바이오틱스", "장건강"],
    seedKeywords: [
      "모유유산균 여성 질건강", "장건강 프로바이오틱스",
      "어린이 유산균 츄어블", "100억 장용성 유산균",
    ] },

  { id: "cp.wellness.device", name: "건강기기", level: 2, parent: "cp.wellness",
    matchKeywords: ["마사지건", "안마기", "혈압계", "체중계"],
    seedKeywords: [] },
  { id: "cp.wellness.device.massage", name: "마사지기기", level: 3, parent: "cp.wellness.device",
    matchKeywords: ["마사지건", "목안마기", "눈마사지기"],
    seedKeywords: [
      "미니 마사지건 4헤드", "목어깨 온열 안마기 충전",
      "온열 눈마사지기 접이식", "종아리 에어 마사지기",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // 확장 노드 시작 — 기존 노드 이후 append
  // ═══════════════════════════════════════════════════════════════

  // ── 반려동물 L3 확장: 강아지 세분화 ──
  { id: "cp.pet.dog.clothing", name: "강아지 의류", level: 3, parent: "cp.pet.dog",
    matchKeywords: ["강아지옷", "애견의류", "반려견패딩", "강아지우비", "강아지레인코트"],
    seedKeywords: [
      "강아지 패딩조끼 소형견 겨울", "애견 레인코트 방수 산책",
      "강아지 올인원 잠옷 면", "소형견 후드티 귀여운",
      "반려견 쿨링 조끼 여름",
    ] },
  { id: "cp.pet.dog.health", name: "강아지 건강/위생", level: 3, parent: "cp.pet.dog",
    matchKeywords: ["강아지샴푸", "강아지영양제", "이빨관리", "귀세정", "애견목욕"],
    seedKeywords: [
      "강아지 저자극 샴푸 약산성", "반려견 관절 영양제 글루코사민",
      "강아지 치석 제거 덴탈스프레이", "귀세정제 반려견 귀청소",
      "강아지 발워시 실리콘 세척기",
    ] },
  { id: "cp.pet.dog.bed", name: "강아지 침대/하우스", level: 3, parent: "cp.pet.dog",
    matchKeywords: ["강아지침대", "반려견쿠션", "강아지하우스", "켄넬", "울타리"],
    seedKeywords: [
      "강아지 원형 방석 쿠션 대형", "반려견 접이식 울타리 8칸",
      "강아지 텐트 하우스 실내", "세탁가능 강아지 침대 사계절",
      "강아지 계단 침대용 3단",
    ] },
  { id: "cp.pet.dog.walk", name: "강아지 산책용품", level: 3, parent: "cp.pet.dog",
    matchKeywords: ["리드줄", "산책줄", "자동줄", "산책가방", "배변봉투"],
    seedKeywords: [
      "자동 리드줄 5m 소형견", "야간 LED 산책줄 발광",
      "배변봉투 300매 대용량 친환경", "산책 가방 간식 물병 수납",
      "강아지 GPS 트래커 실시간",
    ] },

  // ── 반려동물 L3 확장: 고양이 세분화 ──
  { id: "cp.pet.cat.supply", name: "고양이 용품", level: 3, parent: "cp.pet.cat",
    matchKeywords: ["고양이모래", "캣타워", "스크래처", "고양이화장실"],
    seedKeywords: [
      "두부 고양이 모래 7L 3봉", "캣타워 대형 원목 천장형",
      "골판지 스크래처 대형 리필", "자동 고양이 화장실 셀프클린",
      "고양이 모래 탈취제 무향",
    ] },
  { id: "cp.pet.cat.toy", name: "고양이 장난감", level: 3, parent: "cp.pet.cat",
    matchKeywords: ["캣닢", "낚싯대장난감", "레이저포인터", "터널", "고양이공"],
    seedKeywords: [
      "캣닢 쿠션 인형 고양이", "자동 레이저 고양이 장난감",
      "고양이 터널 3구 접이식", "낚싯대 깃털 교체형 5개",
      "고양이 공 트랙볼 지능개발",
    ] },
  { id: "cp.pet.cat.health", name: "고양이 건강/위생", level: 3, parent: "cp.pet.cat",
    matchKeywords: ["고양이영양제", "고양이샴푸", "헤어볼", "구강관리", "고양이유산균"],
    seedKeywords: [
      "고양이 헤어볼 케어 사료", "고양이 유산균 분말 장건강",
      "고양이 눈물자국 세정제", "고양이 빗 브러쉬 슬리커",
      "고양이 네일캡 발톱 커버 20개",
    ] },
  { id: "cp.pet.cat.furniture", name: "고양이 가구", level: 3, parent: "cp.pet.cat",
    matchKeywords: ["캣워크", "캣선반", "고양이침대", "윈도우해먹", "캣휠"],
    seedKeywords: [
      "벽걸이 캣선반 3단 DIY", "캣휠 실내운동 런닝머신",
      "고양이 윈도우 해먹 흡착형", "고양이 침대 동굴형 겨울",
      "캣워크 구름다리 벽부착",
    ] },

  // ── 주방용품 L3 확장: 소형가전 ──
  { id: "cp.kitchen.appliance", name: "주방소형가전", level: 2, parent: "cp.kitchen",
    matchKeywords: ["에어프라이어", "전기밥솥", "믹서기", "전기포트"],
    seedKeywords: [] },
  { id: "cp.kitchen.appliance.fryer", name: "에어프라이어", level: 3, parent: "cp.kitchen.appliance",
    matchKeywords: ["에어프라이어", "오븐프라이어", "에프", "오일프리", "대용량에어프라이어"],
    seedKeywords: [
      "에어프라이어 대용량 5.5L 가정용", "미니 에어프라이어 1인 원룸",
      "로티세리 에어프라이어 오븐형", "에어프라이어 종이호일 200매",
      "디지털 터치 에어프라이어 7L",
    ] },
  { id: "cp.kitchen.appliance.cooker", name: "전기밥솥/압력솥", level: 3, parent: "cp.kitchen.appliance",
    matchKeywords: ["전기밥솥", "IH밥솥", "압력밥솥", "미니밥솥", "1인밥솥"],
    seedKeywords: [
      "IH 전기밥솥 6인용 스텐내솥", "1인용 미니밥솥 3인분",
      "압력밥솥 10인용 대가족", "잡곡 현미 전기밥솥 맛있는",
      "멀티쿠커 압력 슬로우 겸용",
    ] },
  { id: "cp.kitchen.appliance.blender", name: "믹서기/블렌더", level: 3, parent: "cp.kitchen.appliance",
    matchKeywords: ["믹서기", "블렌더", "착즙기", "초고속블렌더", "핸드블렌더"],
    seedKeywords: [
      "초고속 진공 믹서기 스무디", "핸드 블렌더 멀티 4in1",
      "저속 착즙기 원액기 가정용", "개인용 텀블러 블렌더 USB",
      "대용량 믹서기 주스 1.5L",
    ] },
  { id: "cp.kitchen.appliance.pot", name: "전기포트/커피머신", level: 3, parent: "cp.kitchen.appliance",
    matchKeywords: ["전기포트", "전기주전자", "커피머신", "에스프레소머신", "커피메이커"],
    seedKeywords: [
      "스텐 전기포트 1.7L 무선", "온도조절 전기주전자 분유용",
      "캡슐 커피머신 로켓배송", "에스프레소 머신 가정용 반자동",
      "드립 커피메이커 타이머",
    ] },

  // ── 주방용품 L3 확장: 식기 ──
  { id: "cp.kitchen.tableware", name: "식기", level: 2, parent: "cp.kitchen",
    matchKeywords: ["그릇", "접시", "수저", "컵", "식기세트"],
    seedKeywords: [] },
  { id: "cp.kitchen.tableware.plate", name: "접시/그릇", level: 3, parent: "cp.kitchen.tableware",
    matchKeywords: ["접시", "그릇", "공기", "국그릇", "면기", "도자기"],
    seedKeywords: [
      "북유럽 도자기 접시 세트 4매", "스텐 이중 면기 2개",
      "멜라민 접시 어린이 깨지지않는", "한식 공기 국그릇 세트",
      "캠핑 식기세트 4인 스텐",
    ] },
  { id: "cp.kitchen.tableware.cup", name: "컵/텀블러", level: 3, parent: "cp.kitchen.tableware",
    matchKeywords: ["텀블러", "머그컵", "보온병", "물병", "워터보틀"],
    seedKeywords: [
      "스텐 보온 텀블러 500ml", "이중진공 보온보냉 물병 1L",
      "유리 머그컵 내열 카페", "빨대 텀블러 대용량 900ml",
      "캠핑 머그컵 스텐 겹겹이",
    ] },
  { id: "cp.kitchen.tableware.cutlery", name: "수저/커트러리", level: 3, parent: "cp.kitchen.tableware",
    matchKeywords: ["수저", "젓가락", "커트러리", "포크", "나이프", "스푼"],
    seedKeywords: [
      "스텐 수저세트 4인 가정용", "유아 포크 스푼 세트 단계별",
      "캠핑 커트러리 접이식 휴대용", "골드 양식 커트러리 세트",
      "나무 젓가락 10쌍 세트",
    ] },

  // ── 생활용품 L3 확장: 욕실 ──
  { id: "cp.living.bath", name: "욕실용품", level: 2, parent: "cp.living",
    matchKeywords: ["욕실", "칫솔", "치약", "비누", "샤워"],
    seedKeywords: [] },
  { id: "cp.living.bath.toothcare", name: "구강관리", level: 3, parent: "cp.living.bath",
    matchKeywords: ["칫솔", "치약", "전동칫솔", "치실", "가글", "구강청결제"],
    seedKeywords: [
      "전동칫솔 음파진동 2분타이머", "미백 치약 불소 3개세트",
      "치실 워터플로서 구강세정기", "가글 구강청결제 1L 대용량",
      "칫솔 살균기 UV 건조 벽걸이",
    ] },
  { id: "cp.living.bath.towel", name: "수건/목욕용품", level: 3, parent: "cp.living.bath",
    matchKeywords: ["수건", "목욕수건", "타월", "때밀이", "등밀이"],
    seedKeywords: [
      "호텔식 목욕수건 140x70 5장", "극세사 헤어타월 빠른건조",
      "때밀이 이태리타올 100장", "등밀이 타올 손잡이 롱",
      "순면 세면타월 10장 무형광",
    ] },
  { id: "cp.living.bath.mat", name: "욕실매트/커튼", level: 3, parent: "cp.living.bath",
    matchKeywords: ["욕실매트", "규조토", "샤워커튼", "발매트", "미끄럼방지매트"],
    seedKeywords: [
      "규조토 발매트 대형 빠른흡수", "실리콘 욕실 미끄럼방지 매트",
      "샤워커튼 방수 곰팡이방지 세트", "메모리폼 욕실 발매트 푹신",
      "욕실 배수구 머리카락 거름망",
    ] },
  { id: "cp.living.bath.soap", name: "비누/바디워시", level: 3, parent: "cp.living.bath",
    matchKeywords: ["비누", "바디워시", "핸드워시", "손세정제", "천연비누"],
    seedKeywords: [
      "대용량 바디워시 1000ml 보습", "핸드워시 자동디스펜서 세트",
      "천연 수제비누 선물세트", "아이 순한 바디워시 저자극",
      "손세정제 리필 대용량 4L",
    ] },

  // ── 생활용품 L3 확장: 세탁 ──
  { id: "cp.living.laundry", name: "세탁용품", level: 2, parent: "cp.living",
    matchKeywords: ["세탁", "세제", "빨래", "건조대", "옷걸이"],
    seedKeywords: [] },
  { id: "cp.living.laundry.detergent", name: "세제/유연제", level: 3, parent: "cp.living.laundry",
    matchKeywords: ["세탁세제", "섬유유연제", "표백제", "캡슐세제", "드럼세제"],
    seedKeywords: [
      "세탁세제 캡슐 3in1 50개입", "섬유유연제 고농축 3L 향기",
      "아기 세탁세제 순한 무향료", "산소계 표백제 과탄산소다",
      "찌든때 전용 세탁세제 바 비누",
    ] },
  { id: "cp.living.laundry.rack", name: "빨래건조대/다리미", level: 3, parent: "cp.living.laundry",
    matchKeywords: ["빨래건조대", "다리미", "스팀다리미", "옷걸이", "세탁망"],
    seedKeywords: [
      "스텐 빨래건조대 접이식 X형", "핸디형 스팀다리미 휴대용",
      "논슬립 옷걸이 벨벳 50개", "세탁망 미세먼지 대형 3종",
      "빨래바구니 접이식 방수 대형",
    ] },

  // ── 생활용품 L3 확장: 종이/일회용 ──
  { id: "cp.living.paper", name: "종이/일회용품", level: 2, parent: "cp.living",
    matchKeywords: ["휴지", "키친타월", "물티슈", "종이컵", "일회용"],
    seedKeywords: [] },
  { id: "cp.living.paper.tissue", name: "화장지/키친타월", level: 3, parent: "cp.living.paper",
    matchKeywords: ["화장지", "두루마리", "미용티슈", "키친타월", "롤화장지"],
    seedKeywords: [
      "3겹 화장지 30롤 로켓배송", "키친타월 150매 4롤",
      "미용티슈 200매 6박스", "물에녹는 물티슈 60매 10팩",
      "프리미엄 4겹 화장지 대용량",
    ] },
  { id: "cp.living.paper.disposable", name: "일회용품", level: 3, parent: "cp.living.paper",
    matchKeywords: ["종이컵", "비닐봉투", "비닐장갑", "지퍼백", "랩"],
    seedKeywords: [
      "종이컵 6.5온스 1000개", "위생 비닐장갑 500매",
      "지퍼백 대형 냉동보관 100매", "랩 30cm 100m 대용량",
      "음식물 쓰레기봉투 5L 100매",
    ] },

  // ── 헬스/건강식품 L3 확장: 오메가3 ──
  { id: "cp.wellness.supplement.omega", name: "오메가3/크릴오일", level: 3, parent: "cp.wellness.supplement",
    matchKeywords: ["오메가3", "크릴오일", "피쉬오일", "EPA", "DHA", "지방산"],
    seedKeywords: [
      "rTG 오메가3 고함량 180캡슐", "크릴오일 남극 인지질 60캡슐",
      "식물성 오메가3 아마씨유 비건", "EPA DHA 복합 오메가3",
      "어린이 오메가3 츄어블 딸기",
    ] },
  { id: "cp.wellness.supplement.collagen", name: "콜라겐/이너뷰티", level: 3, parent: "cp.wellness.supplement",
    matchKeywords: ["콜라겐", "히알루론산", "석류", "이너뷰티", "먹는콜라겐"],
    seedKeywords: [
      "저분자 콜라겐 스틱 30포", "히알루론산 캡슐 90정",
      "석류 콜라겐 젤리 맛있는", "먹는 콜라겐 분말 피쉬",
      "엘라스틴 콜라겐 복합 60일분",
    ] },
  { id: "cp.wellness.supplement.liver", name: "간건강/밀크시슬", level: 3, parent: "cp.wellness.supplement",
    matchKeywords: ["밀크시슬", "간건강", "실리마린", "간영양제", "간해독"],
    seedKeywords: [
      "밀크시슬 실리마린 간건강 90정", "UDCA 간장약 보조 60정",
      "쿠르쿠민 강황 간보호", "비타민B군 간건강 피로회복",
      "간 디톡스 해독 30일분",
    ] },
  { id: "cp.wellness.supplement.joint", name: "관절/뼈건강", level: 3, parent: "cp.wellness.supplement",
    matchKeywords: ["글루코사민", "관절영양제", "MSM", "칼슘", "비타민K"],
    seedKeywords: [
      "글루코사민 MSM 관절 120정", "칼슘마그네슘 비타민D 뼈건강",
      "보스웰리아 관절 통증 완화", "초록입홍합 관절영양제",
      "콘드로이친 연골 보호 60캡슐",
    ] },

  // ── 헬스/건강식품 L3 확장: 다이어트보조 ──
  { id: "cp.wellness.diet", name: "다이어트보조", level: 2, parent: "cp.wellness",
    matchKeywords: ["다이어트", "가르시니아", "체지방", "슬리밍"],
    seedKeywords: [] },
  { id: "cp.wellness.diet.burner", name: "체지방감소/대사", level: 3, parent: "cp.wellness.diet",
    matchKeywords: ["가르시니아", "CLA", "카르니틴", "체지방", "대사부스터"],
    seedKeywords: [
      "가르시니아 HCA 체지방 감소", "CLA 공액리놀레산 90캡슐",
      "L-카르니틴 운동전 태움", "녹차추출물 카테킨 다이어트",
      "잔티젠 내장지방 감소 60정",
    ] },

  // ── 식품 L3 확장: 로켓프레시 과일 ──
  { id: "cp.food.fruit", name: "과일", level: 2, parent: "cp.food",
    matchKeywords: ["과일", "사과", "딸기", "바나나", "포도", "오렌지"],
    seedKeywords: [] },
  { id: "cp.food.fruit.apple", name: "사과/배", level: 3, parent: "cp.food.fruit",
    matchKeywords: ["사과", "배", "부사", "홍로", "신고배", "청사과"],
    seedKeywords: [
      "로켓프레시 경북 사과 2kg", "부사 사과 가정용 5kg",
      "나주 배 선물세트 프리미엄", "홍로 사과 당도선별",
      "세척사과 간편 3개입 팩",
    ] },
  { id: "cp.food.fruit.berry", name: "딸기/베리류", level: 3, parent: "cp.food.fruit",
    matchKeywords: ["딸기", "블루베리", "체리", "라즈베리", "아보카도"],
    seedKeywords: [
      "로켓프레시 딸기 설향 500g", "냉동 블루베리 1kg 미국산",
      "생체리 칠레산 항공직송", "아보카도 6개입 숙성",
      "냉동 라즈베리 유기농 500g",
    ] },
  { id: "cp.food.fruit.citrus", name: "감귤/한라봉", level: 3, parent: "cp.food.fruit",
    matchKeywords: ["귤", "감귤", "한라봉", "천혜향", "레드향", "오렌지"],
    seedKeywords: [
      "제주 감귤 로켓프레시 3kg", "한라봉 당도선별 2kg",
      "천혜향 제주 프리미엄", "네이블 오렌지 12개입",
      "레드향 선물세트 고급",
    ] },
  { id: "cp.food.fruit.tropical", name: "열대과일", level: 3, parent: "cp.food.fruit",
    matchKeywords: ["바나나", "망고", "파인애플", "키위", "코코넛"],
    seedKeywords: [
      "바나나 송이 로켓프레시", "냉동 망고 다이스 1kg",
      "골드키위 뉴질랜드 10개입", "필리핀 파인애플 통 1개",
      "애플망고 제주산 프리미엄",
    ] },

  // ── 식품 L3 확장: 채소 ──
  { id: "cp.food.veggie", name: "채소", level: 2, parent: "cp.food",
    matchKeywords: ["채소", "야채", "샐러드", "양파", "감자"],
    seedKeywords: [] },
  { id: "cp.food.veggie.root", name: "감자/고구마/뿌리채소", level: 3, parent: "cp.food.veggie",
    matchKeywords: ["감자", "고구마", "당근", "무", "양파", "마늘"],
    seedKeywords: [
      "꿀 고구마 5kg 호박고구마", "감자 수미 3kg 감자튀김용",
      "양파 10kg 국내산 가정용", "무농약 당근 1kg 주스용",
      "국산 깐마늘 1kg 냉장",
    ] },
  { id: "cp.food.veggie.leaf", name: "엽채/샐러드", level: 3, parent: "cp.food.veggie",
    matchKeywords: ["상추", "양배추", "시금치", "샐러드", "깻잎", "브로콜리"],
    seedKeywords: [
      "로켓프레시 혼합샐러드 200g", "양배추 1통 국내산",
      "브로콜리 2송이 신선 세척", "깻잎 50매 팩 향긋한",
      "유기농 시금치 300g 무농약",
    ] },
  { id: "cp.food.veggie.mushroom", name: "버섯/나물", level: 3, parent: "cp.food.veggie",
    matchKeywords: ["버섯", "팽이버섯", "새송이", "표고", "느타리", "나물"],
    seedKeywords: [
      "새송이버섯 2팩 로켓프레시", "표고버섯 건 100g 국내산",
      "팽이버섯 3봉 묶음", "건나물 세트 5종 명절용",
      "느타리버섯 싱싱 국산 300g",
    ] },

  // ── 식품 L3 확장: 유제품 ──
  { id: "cp.food.dairy", name: "유제품", level: 2, parent: "cp.food",
    matchKeywords: ["우유", "치즈", "요거트", "버터", "유제품"],
    seedKeywords: [] },
  { id: "cp.food.dairy.milk", name: "우유/두유", level: 3, parent: "cp.food.dairy",
    matchKeywords: ["우유", "두유", "귀리우유", "아몬드밀크", "저지방우유"],
    seedKeywords: [
      "서울우유 1L 로켓프레시", "무첨가 두유 190ml 24팩",
      "오트밀크 바리스타 1L", "저지방 우유 900ml 팩",
      "유기농 우유 아이 간식용",
    ] },
  { id: "cp.food.dairy.yogurt", name: "요거트/발효유", level: 3, parent: "cp.food.dairy",
    matchKeywords: ["요거트", "그릭요거트", "발효유", "요플레", "액티비아"],
    seedKeywords: [
      "그릭 요거트 플레인 무가당", "비피더스 발효유 30입",
      "단백질 그릭요거트 100g 10개", "떠먹는 요거트 딸기 대용량",
      "유아 요거트 아이간식",
    ] },
  { id: "cp.food.dairy.cheese", name: "치즈/버터", level: 3, parent: "cp.food.dairy",
    matchKeywords: ["치즈", "모짜렐라", "크림치즈", "버터", "슬라이스치즈"],
    seedKeywords: [
      "모짜렐라 슈레드 1kg 피자용", "슬라이스 치즈 36매 대용량",
      "크림치즈 200g 필라델피아", "무염 버터 450g 베이킹용",
      "스트링 치즈 어린이 간식",
    ] },

  // ── 식품 L3 확장: 냉동식품 ──
  { id: "cp.food.frozen", name: "냉동식품", level: 2, parent: "cp.food",
    matchKeywords: ["냉동", "만두", "냉동피자", "냉동밥", "냉동간편식"],
    seedKeywords: [] },
  { id: "cp.food.frozen.dumpling", name: "만두/교자", level: 3, parent: "cp.food.frozen",
    matchKeywords: ["만두", "교자", "왕만두", "물만두", "군만두"],
    seedKeywords: [
      "왕교자 만두 냉동 1.4kg", "새우 물만두 대용량 1kg",
      "군만두 바삭한 에프용 500g", "비건 만두 두부야채",
      "김치만두 국산김치 1kg",
    ] },
  { id: "cp.food.frozen.pizza", name: "냉동 피자/간식", level: 3, parent: "cp.food.frozen",
    matchKeywords: ["냉동피자", "치킨너겟", "핫도그", "냉동간식", "프렌치프라이"],
    seedKeywords: [
      "냉동 피자 치즈 4판 대용량", "치킨 너겟 1kg 에프용",
      "핫도그 모짜렐라 냉동 10개", "감자튀김 프렌치프라이 1kg",
      "냉동 붕어빵 팥앙금 20개",
    ] },
  { id: "cp.food.frozen.rice", name: "냉동밥/볶음밥", level: 3, parent: "cp.food.frozen",
    matchKeywords: ["냉동밥", "볶음밥", "즉석밥", "비빔밥", "컵밥"],
    seedKeywords: [
      "볶음밥 냉동 10봉 모음", "새우 볶음밥 300g 10개",
      "컵밥 즉석 비빔밥 6종세트", "닭가슴살 볶음밥 다이어트",
      "김치볶음밥 대용량 냉동",
    ] },

  // ── 식품 L3 확장: 라면/면류 ──
  { id: "cp.food.noodle", name: "라면/면류", level: 2, parent: "cp.food",
    matchKeywords: ["라면", "국수", "우동", "파스타", "쌀국수"],
    seedKeywords: [] },
  { id: "cp.food.noodle.ramen", name: "라면", level: 3, parent: "cp.food.noodle",
    matchKeywords: ["라면", "봉지라면", "컵라면", "비빔면", "짜파게티"],
    seedKeywords: [
      "신라면 멀티팩 40봉 박스", "진라면 순한맛 20개입",
      "불닭볶음면 5봉 세트", "비빔면 여름 시원한 10개",
      "컵라면 모음 12종 세트",
    ] },
  { id: "cp.food.noodle.pasta", name: "파스타/소스", level: 3, parent: "cp.food.noodle",
    matchKeywords: ["파스타", "스파게티", "파스타소스", "펜네", "마카로니"],
    seedKeywords: [
      "스파게티면 500g 듀럼밀", "토마토 파스타소스 대용량",
      "크림 파스타소스 까르보나라", "펜네 리가테 500g",
      "밀키트 로제 파스타 2인분",
    ] },

  // ── 식품 L3 확장: 간식/과자 ──
  { id: "cp.food.snack", name: "과자/간식", level: 2, parent: "cp.food",
    matchKeywords: ["과자", "초콜릿", "사탕", "젤리", "간식"],
    seedKeywords: [] },
  { id: "cp.food.snack.chip", name: "스낵/과자", level: 3, parent: "cp.food.snack",
    matchKeywords: ["감자칩", "새우깡", "포카칩", "프링글스", "과자"],
    seedKeywords: [
      "과자 박스 대용량 20봉 모음", "감자칩 허니버터 대용량",
      "새우깡 오리지널 30봉 세트", "프링글스 사워크림 110g",
      "오징어 땅콩 믹스넛 간식",
    ] },
  { id: "cp.food.snack.choco", name: "초콜릿/젤리", level: 3, parent: "cp.food.snack",
    matchKeywords: ["초콜릿", "젤리", "사탕", "캐러멜", "곰젤리", "가나"],
    seedKeywords: [
      "페레로로쉐 초콜릿 선물세트", "하리보 곰젤리 1kg 대용량",
      "빼빼로 대용량 박스 20개", "카카오 다크초콜릿 72%",
      "츄파춥스 막대사탕 50개입",
    ] },

  // ── 가전디지털 L3 확장: 대형가전 ──
  { id: "cp.digital.tv", name: "TV/영상가전", level: 2, parent: "cp.digital",
    matchKeywords: ["TV", "텔레비전", "모니터", "빔프로젝터"],
    seedKeywords: [] },
  { id: "cp.digital.tv.television", name: "TV", level: 3, parent: "cp.digital.tv",
    matchKeywords: ["TV", "스마트TV", "OLED", "QLED", "4K", "대형TV"],
    seedKeywords: [
      "55인치 4K 스마트TV UHD", "75인치 대형TV 거실용",
      "OLED TV 65인치 프리미엄", "가성비 43인치 FHD TV",
      "벽걸이 TV 브라켓 설치",
    ] },
  { id: "cp.digital.tv.monitor", name: "모니터", level: 3, parent: "cp.digital.tv",
    matchKeywords: ["모니터", "게이밍모니터", "IPS", "커브드", "듀얼모니터"],
    seedKeywords: [
      "27인치 QHD IPS 모니터", "32인치 4K 디자인 모니터",
      "게이밍 모니터 165Hz 1ms", "커브드 34인치 울트라와이드",
      "24인치 가성비 모니터 사무용",
    ] },
  { id: "cp.digital.tv.projector", name: "빔프로젝터", level: 3, parent: "cp.digital.tv",
    matchKeywords: ["빔프로젝터", "미니빔", "프로젝터", "캠핑빔", "홈시어터"],
    seedKeywords: [
      "미니빔 프로젝터 FHD 가정용", "캠핑 포터블 빔프로젝터",
      "LED 빔프로젝터 밝기 3000", "프로젝터 스크린 100인치",
      "스마트 프로젝터 넷플릭스 내장",
    ] },

  // ── 가전디지털 L3 확장: 대형가전 ──
  { id: "cp.digital.major", name: "대형가전", level: 2, parent: "cp.digital",
    matchKeywords: ["냉장고", "세탁기", "건조기", "에어컨", "식기세척기"],
    seedKeywords: [] },
  { id: "cp.digital.major.fridge", name: "냉장고", level: 3, parent: "cp.digital.major",
    matchKeywords: ["냉장고", "양문형", "4도어", "미니냉장고", "김치냉장고"],
    seedKeywords: [
      "양문형 냉장고 800L 대용량", "미니 냉장고 원룸 소형 115L",
      "4도어 냉장고 메탈 프리미엄", "김치냉장고 스탠드형 300L",
      "원룸 냉장고 냉동겸용 150L",
    ] },
  { id: "cp.digital.major.washer", name: "세탁기/건조기", level: 3, parent: "cp.digital.major",
    matchKeywords: ["세탁기", "건조기", "드럼세탁기", "통돌이", "일체형"],
    seedKeywords: [
      "드럼세탁기 12kg 에너지1등급", "통돌이 세탁기 10kg 가성비",
      "의류건조기 히트펌프 9kg", "미니 세탁기 아기옷 3kg",
      "세탁건조기 올인원 일체형",
    ] },
  { id: "cp.digital.major.ac", name: "에어컨/선풍기", level: 3, parent: "cp.digital.major",
    matchKeywords: ["에어컨", "선풍기", "서큘레이터", "냉풍기", "제습기"],
    seedKeywords: [
      "벽걸이 에어컨 7평 인버터", "이동식 에어컨 원룸 공사불필요",
      "타워형 선풍기 DC모터 저소음", "서큘레이터 3D회전 강력",
      "제습기 10L 원룸 소형 저소음",
    ] },

  // ── 가전디지털 L3 확장: 소형가전 ──
  { id: "cp.digital.small", name: "소형가전", level: 2, parent: "cp.digital",
    matchKeywords: ["로봇청소기", "전기면도기", "다리미", "뷰티가전"],
    seedKeywords: [] },
  { id: "cp.digital.small.robot", name: "로봇청소기", level: 3, parent: "cp.digital.small",
    matchKeywords: ["로봇청소기", "물걸레로봇", "자동비움", "LDS", "맵핑"],
    seedKeywords: [
      "로봇청소기 물걸레 자동비움", "LDS 레이저 맵핑 로봇청소기",
      "가성비 로봇청소기 저소음", "로봇청소기 소모품 사이드브러쉬",
      "물걸레 로봇 전용패드 20매",
    ] },
  { id: "cp.digital.small.iron", name: "다리미/스티머", level: 3, parent: "cp.digital.small",
    matchKeywords: ["다리미", "스팀다리미", "핸디스티머", "옷주름", "스팀기"],
    seedKeywords: [
      "핸디형 스팀다리미 강력 스팀", "무선 충전식 다리미 소형",
      "스탠드 스팀다리미 걸이형", "여행용 미니 다리미 접이식",
      "스팀 브러쉬 옷주름 제거",
    ] },
  { id: "cp.digital.small.shaver", name: "전기면도기/이발기", level: 3, parent: "cp.digital.small",
    matchKeywords: ["전기면도기", "이발기", "코털정리기", "바리깡", "트리머"],
    seedKeywords: [
      "3중날 전기면도기 방수 충전", "무선 바리깡 이발기 셀프컷",
      "코털정리기 귀털 USB 충전", "턱수염 트리머 길이조절",
      "여성 전기면도기 비키니라인",
    ] },

  // ── 가전디지털: 노트북/태블릿 ──
  { id: "cp.digital.laptop", name: "노트북", level: 2, parent: "cp.digital",
    matchKeywords: ["노트북", "랩탑", "맥북", "그램"],
    seedKeywords: [] },
  { id: "cp.digital.laptop.office", name: "사무/학생 노트북", level: 3, parent: "cp.digital.laptop",
    matchKeywords: ["사무용노트북", "학생노트북", "울트라북", "경량노트북"],
    seedKeywords: [
      "14인치 경량 노트북 1kg 이하", "대학생 노트북 가성비 추천",
      "사무용 노트북 i5 16GB SSD", "맥북에어 M시리즈 최신",
      "LG그램 15인치 초경량 배터리",
    ] },
  { id: "cp.digital.laptop.gaming", name: "게이밍 노트북", level: 3, parent: "cp.digital.laptop",
    matchKeywords: ["게이밍노트북", "RTX", "고사양", "게임용"],
    seedKeywords: [
      "RTX 게이밍 노트북 16인치", "144Hz 게이밍노트북 가성비",
      "고사양 영상편집 노트북", "17인치 대화면 게이밍",
      "게이밍 노트북 쿨링패드 세트",
    ] },
  { id: "cp.digital.tablet", name: "태블릿", level: 2, parent: "cp.digital",
    matchKeywords: ["태블릿", "아이패드", "갤럭시탭"],
    seedKeywords: [] },
  { id: "cp.digital.tablet.device", name: "태블릿 기기", level: 3, parent: "cp.digital.tablet",
    matchKeywords: ["아이패드", "갤럭시탭", "태블릿PC", "안드로이드태블릿"],
    seedKeywords: [
      "아이패드 WiFi 최신모델", "갤럭시탭 S시리즈 최신",
      "가성비 태블릿 영상 10인치", "아이패드 미니 휴대용",
      "학생용 태블릿 필기 추천",
    ] },
  { id: "cp.digital.tablet.accessory", name: "태블릿 액세서리", level: 3, parent: "cp.digital.tablet",
    matchKeywords: ["태블릿케이스", "애플펜슬", "키보드케이스", "필름"],
    seedKeywords: [
      "아이패드 키보드 케이스 세트", "애플펜슬 호환 터치펜 2세대",
      "종이질감 필름 필기용", "갤럭시탭 북커버 케이스",
      "태블릿 거치대 각도조절 알루미늄",
    ] },

  // ── 가전디지털: 카메라 ──
  { id: "cp.digital.camera", name: "카메라", level: 2, parent: "cp.digital",
    matchKeywords: ["카메라", "미러리스", "액션캠", "웹캠"],
    seedKeywords: [] },
  { id: "cp.digital.camera.mirrorless", name: "미러리스/DSLR", level: 3, parent: "cp.digital.camera",
    matchKeywords: ["미러리스", "DSLR", "카메라바디", "렌즈", "풀프레임"],
    seedKeywords: [
      "입문 미러리스 카메라 번들킷", "풀프레임 미러리스 바디",
      "인물용 단렌즈 50mm F1.8", "DSLR 카메라 가방 방수",
      "카메라 삼각대 경량 여행용",
    ] },
  { id: "cp.digital.camera.action", name: "액션캠/브이로그", level: 3, parent: "cp.digital.camera",
    matchKeywords: ["액션캠", "고프로", "브이로그카메라", "짐벌", "셀카봉"],
    seedKeywords: [
      "4K 액션캠 방수 30m", "스마트폰 짐벌 3축 안정화",
      "셀카봉 삼각대 겸용 무선", "브이로그 카메라 소형 유튜브",
      "고프로 액세서리 키트 50종",
    ] },

  // ── 여성패션 L3 확장 ──
  { id: "cp.wfashion.dress", name: "원피스", level: 2, parent: "cp.wfashion",
    matchKeywords: ["원피스", "드레스", "여성원피스"],
    seedKeywords: [] },
  { id: "cp.wfashion.dress.casual", name: "캐주얼 원피스", level: 3, parent: "cp.wfashion.dress",
    matchKeywords: ["캐주얼원피스", "면원피스", "셔츠원피스", "린넨원피스", "데일리"],
    seedKeywords: [
      "린넨 셔츠 원피스 여름 롱", "면 데일리 원피스 루즈핏",
      "A라인 캐주얼 원피스 봄", "오버사이즈 티셔츠 원피스",
      "체크 셔츠원피스 허리끈 포함",
    ] },
  { id: "cp.wfashion.dress.party", name: "파티/하객 원피스", level: 3, parent: "cp.wfashion.dress",
    matchKeywords: ["하객룩", "파티드레스", "결혼식원피스", "하객원피스"],
    seedKeywords: [
      "하객룩 원피스 결혼식 레이스", "칵테일 드레스 세미포멀",
      "블랙 미니 파티 드레스", "쉬폰 플리츠 하객 원피스",
      "정장 원피스 무릎길이 오피스",
    ] },
  { id: "cp.wfashion.outer", name: "여성 아우터", level: 2, parent: "cp.wfashion",
    matchKeywords: ["여성자켓", "여성코트", "여성점퍼", "여성패딩"],
    seedKeywords: [] },
  { id: "cp.wfashion.outer.jacket", name: "여성 자켓/코트", level: 3, parent: "cp.wfashion.outer",
    matchKeywords: ["여성자켓", "트렌치코트", "블레이저", "여성코트", "가디건"],
    seedKeywords: [
      "트렌치코트 여성 봄 허리끈", "크롭 블레이저 오버핏 여성",
      "울 코트 여성 겨울 롱", "데님 자켓 여성 봄가을",
      "경량 패딩 여성 숏 가을",
    ] },
  { id: "cp.wfashion.underwear", name: "여성 속옷", level: 2, parent: "cp.wfashion",
    matchKeywords: ["여성속옷", "브라", "팬티", "보정속옷"],
    seedKeywords: [] },
  { id: "cp.wfashion.underwear.bra", name: "브래지어/세트", level: 3, parent: "cp.wfashion.underwear",
    matchKeywords: ["브라", "노와이어", "브라렛", "속옷세트", "스포츠브라"],
    seedKeywords: [
      "노와이어 브라 편한 면 3장", "심리스 브라렛 원피스형",
      "볼륨업 누드브라 실리콘", "수면브라 코튼 무봉제",
      "운동용 스포츠브라 미디엄",
    ] },
  { id: "cp.wfashion.underwear.panty", name: "여성팬티/보정", level: 3, parent: "cp.wfashion.underwear",
    matchKeywords: ["여성팬티", "거들", "보정속옷", "쿨팬티", "레이스팬티"],
    seedKeywords: [
      "여성 면팬티 10매 대용량", "쿨링 여름 팬티 냉감 5매",
      "하이웨이스트 보정 거들 팬티", "레이스 팬티 세트 로맨틱",
      "심리스 노라인 팬티 누디",
    ] },

  // ── 남성패션 L3 확장 ──
  { id: "cp.mfashion.tops.shirt", name: "남성 셔츠", level: 3, parent: "cp.mfashion.tops",
    matchKeywords: ["남성셔츠", "와이셔츠", "옥스포드", "린넨셔츠"],
    seedKeywords: [
      "남성 슬림핏 와이셔츠 화이트", "옥스포드 캐주얼 셔츠 봄",
      "구김방지 스판 셔츠 출근", "린넨 반팔 셔츠 여름 남성",
      "체크 셔츠 플란넬 가을",
    ] },
  { id: "cp.mfashion.outer", name: "남성 아우터", level: 2, parent: "cp.mfashion",
    matchKeywords: ["남성자켓", "남성코트", "남성점퍼"],
    seedKeywords: [] },
  { id: "cp.mfashion.outer.jacket", name: "남성 자켓/코트", level: 3, parent: "cp.mfashion.outer",
    matchKeywords: ["남성자켓", "남성블레이저", "바람막이", "남성코트", "항공점퍼"],
    seedKeywords: [
      "남성 바람막이 봄 경량 방풍", "캐주얼 블레이저 남성 오버핏",
      "울 코트 남성 겨울 롱", "항공점퍼 봄버자켓 남성",
      "경량 패딩 숏 남성 가을",
    ] },
  { id: "cp.mfashion.suit", name: "남성 정장", level: 2, parent: "cp.mfashion",
    matchKeywords: ["남성정장", "수트", "양복", "정장세트"],
    seedKeywords: [] },
  { id: "cp.mfashion.suit.set", name: "정장 세트", level: 3, parent: "cp.mfashion.suit",
    matchKeywords: ["정장세트", "면접정장", "슬림핏수트", "투피스"],
    seedKeywords: [
      "남성 슬림핏 정장 세트 네이비", "면접 양복 상하의 세트",
      "구김방지 정장바지 슬랙스", "캐주얼 셋업 린넨 세트",
      "블랙 정장 세트 예복 격식",
    ] },
  { id: "cp.mfashion.underwear", name: "남성 속옷", level: 2, parent: "cp.mfashion",
    matchKeywords: ["남성속옷", "사각팬티", "드로즈", "런닝"],
    seedKeywords: [] },
  { id: "cp.mfashion.underwear.boxer", name: "남성 팬티/런닝", level: 3, parent: "cp.mfashion.underwear",
    matchKeywords: ["사각팬티", "드로즈", "남성런닝", "트렁크", "기능성속옷"],
    seedKeywords: [
      "남성 사각팬티 면 5매세트", "드로즈 남성 기능성 통기성",
      "쿨링 여름 팬티 냉감 남성", "런닝 셔츠 순면 3장",
      "스포츠 기능성 남성 속옷",
    ] },
  { id: "cp.mfashion.socks", name: "양말", level: 2, parent: "cp.mfashion",
    matchKeywords: ["양말", "남성양말", "발목양말", "스포츠양말"],
    seedKeywords: [] },
  { id: "cp.mfashion.socks.item", name: "양말", level: 3, parent: "cp.mfashion.socks",
    matchKeywords: ["발목양말", "장목양말", "등산양말", "양말세트", "무지양말"],
    seedKeywords: [
      "남성 발목양말 10켤레 면", "등산양말 두꺼운 쿠션 5켤레",
      "무지 면양말 기본 20켤레", "스포츠 양말 쿠션 러닝",
      "겨울 기모양말 방한 5켤레",
    ] },

  // ── 뷰티 L3 확장: 헤어/바디/향수 ──
  { id: "cp.beauty.hair", name: "헤어케어", level: 2, parent: "cp.beauty",
    matchKeywords: ["샴푸", "린스", "헤어", "트리트먼트", "염색"],
    seedKeywords: [] },
  { id: "cp.beauty.hair.shampoo", name: "샴푸/컨디셔너", level: 3, parent: "cp.beauty.hair",
    matchKeywords: ["샴푸", "린스", "컨디셔너", "탈모샴푸", "두피샴푸"],
    seedKeywords: [
      "탈모방지 두피 샴푸 1000ml", "약산성 아미노산 샴푸 순한",
      "손상모 영양 컨디셔너 대용량", "비듬 가려움 두피 샴푸",
      "로켓배송 인기 샴푸 세트",
    ] },
  { id: "cp.beauty.hair.treatment", name: "트리트먼트/오일", level: 3, parent: "cp.beauty.hair",
    matchKeywords: ["트리트먼트", "헤어팩", "헤어오일", "에센스", "손상모"],
    seedKeywords: [
      "손상모 집중 헤어팩 200ml", "아르간 헤어오일 경량 펌프",
      "단백질 트리트먼트 복구 집중", "열보호 에센스 드라이전",
      "야간 헤어 슬리핑팩",
    ] },
  { id: "cp.beauty.hair.styling", name: "스타일링/기기", level: 3, parent: "cp.beauty.hair",
    matchKeywords: ["왁스", "고데기", "헤어드라이기", "스프레이", "젤"],
    seedKeywords: [
      "매트 왁스 남성 내추럴 홀드", "미니 고데기 여행용 휴대",
      "음이온 헤어드라이기 대풍량", "볼륨 스프레이 뿌리 셋팅",
      "컬링 아이론 32mm 긴머리",
    ] },
  { id: "cp.beauty.body", name: "바디케어", level: 2, parent: "cp.beauty",
    matchKeywords: ["바디워시", "바디로션", "핸드크림", "바디스크럽"],
    seedKeywords: [] },
  { id: "cp.beauty.body.wash", name: "바디워시/비누", level: 3, parent: "cp.beauty.body",
    matchKeywords: ["바디워시", "비누", "샤워젤", "천연비누", "클렌징바"],
    seedKeywords: [
      "보습 바디워시 대용량 1L", "약산성 민감성 바디클렌저",
      "천연 수제비누 선물세트 6개", "향기좋은 샤워젤 프리미엄",
      "아토피 순한 바디워시 아이",
    ] },
  { id: "cp.beauty.body.lotion", name: "바디로션/핸드크림", level: 3, parent: "cp.beauty.body",
    matchKeywords: ["바디로션", "바디크림", "핸드크림", "바디버터"],
    seedKeywords: [
      "시어버터 바디크림 500ml", "핸드크림 미니 세트 선물",
      "세라마이드 바디로션 아토피", "요소크림 발뒤꿈치 건조",
      "향기 바디밀크 보습 촉촉",
    ] },
  { id: "cp.beauty.perfume", name: "향수/디퓨저", level: 2, parent: "cp.beauty",
    matchKeywords: ["향수", "디퓨저", "캔들", "방향제"],
    seedKeywords: [] },
  { id: "cp.beauty.perfume.fragrance", name: "향수", level: 3, parent: "cp.beauty.perfume",
    matchKeywords: ["향수", "오드퍼퓸", "니치향수", "데일리향수", "미니향수"],
    seedKeywords: [
      "여성 데일리 향수 플로럴 50ml", "남성 우디 향수 시트러스",
      "미니 향수 세트 선물용 5ml", "니치 향수 유니섹스 50ml",
      "가성비 향수 지속력 좋은",
    ] },
  { id: "cp.beauty.perfume.diffuser", name: "디퓨저/캔들", level: 3, parent: "cp.beauty.perfume",
    matchKeywords: ["디퓨저", "캔들", "향초", "차량방향제", "인센스"],
    seedKeywords: [
      "리드 디퓨저 200ml 거실용", "소이캔들 향초 선물세트",
      "차량용 방향제 송풍구 클립", "인센스 스틱 명상 백단향",
      "섬유향수 옷 스프레이 고급",
    ] },
  { id: "cp.beauty.nail", name: "네일", level: 2, parent: "cp.beauty",
    matchKeywords: ["네일", "매니큐어", "젤네일", "네일아트"],
    seedKeywords: [] },
  { id: "cp.beauty.nail.polish", name: "네일폴리시/젤", level: 3, parent: "cp.beauty.nail",
    matchKeywords: ["매니큐어", "젤네일", "젤폴리시", "셀프네일", "LED램프"],
    seedKeywords: [
      "셀프 젤네일 세트 LED램프 포함", "원스텝 젤폴리시 인기색",
      "빠른건조 매니큐어 누드톤", "젤 네일 스티커 세미큐어",
      "네일 리무버 아세톤프리",
    ] },

  // ── 홈인테리어 L3 확장 ──
  { id: "cp.home.furniture.desk", name: "책상/의자", level: 3, parent: "cp.home.furniture",
    matchKeywords: ["책상", "컴퓨터책상", "사무용의자", "게이밍체어", "스탠딩데스크"],
    seedKeywords: [
      "전동 스탠딩데스크 높이조절", "L자형 컴퓨터 책상 코너",
      "메쉬 사무용 의자 요추 받침", "게이밍 체어 리클라이닝",
      "어린이 높이조절 책상 세트",
    ] },
  { id: "cp.home.furniture.storage", name: "수납/선반", level: 3, parent: "cp.home.furniture",
    matchKeywords: ["수납장", "선반", "책장", "서랍장", "행거"],
    seedKeywords: [
      "조립식 수납장 6칸 대형", "벽걸이 원목 선반 3단",
      "스틸 행거 이동식 커버포함", "아크릴 투명 서랍장 3단",
      "미드센추리 책장 5단 원목",
    ] },
  { id: "cp.home.furniture.bed", name: "침대", level: 3, parent: "cp.home.furniture",
    matchKeywords: ["침대", "침대프레임", "저상침대", "이층침대", "수납침대"],
    seedKeywords: [
      "퀸 저상 침대프레임 원목", "슈퍼싱글 수납 침대 서랍",
      "이층침대 아이방 분리형", "접이식 간이침대 게스트용",
      "호텔식 침대 헤드보드 포함",
    ] },
  { id: "cp.home.bedding.blanket", name: "이불/침구커버", level: 3, parent: "cp.home.bedding",
    matchKeywords: ["이불", "이불커버", "차렵이불", "여름이불", "구스다운이불"],
    seedKeywords: [
      "여름 시어서커 이불 퀸", "극세사 겨울이불 따뜻한",
      "차렵이불 4계절 면 더블", "구스다운 이불 프리미엄",
      "순면 이불커버 200수 세트",
    ] },
  { id: "cp.home.curtain", name: "커튼/블라인드", level: 2, parent: "cp.home",
    matchKeywords: ["커튼", "블라인드", "롤스크린", "암막"],
    seedKeywords: [] },
  { id: "cp.home.curtain.blackout", name: "암막 커튼", level: 3, parent: "cp.home.curtain",
    matchKeywords: ["암막커튼", "차광커튼", "방한커튼", "단열커튼"],
    seedKeywords: [
      "100% 암막커튼 거실 대형", "3중 방한 단열커튼 겨울",
      "원룸 암막커튼 창문 차광", "그레이 암막커튼 세트",
      "아이방 암막커튼 귀여운 패턴",
    ] },
  { id: "cp.home.curtain.blind", name: "블라인드/롤스크린", level: 3, parent: "cp.home.curtain",
    matchKeywords: ["블라인드", "롤스크린", "콤비블라인드", "우드블라인드"],
    seedKeywords: [
      "콤비 블라인드 맞춤 제작", "무타공 롤스크린 부착형",
      "우드 블라인드 거실 원목", "허니콤 블라인드 단열 효과",
      "미니 블라인드 사무실 창문",
    ] },
  { id: "cp.home.deco", name: "인테리어소품", level: 2, parent: "cp.home",
    matchKeywords: ["인테리어소품", "액자", "시계", "거울", "화병"],
    seedKeywords: [] },
  { id: "cp.home.deco.frame", name: "액자/포스터", level: 3, parent: "cp.home.deco",
    matchKeywords: ["액자", "포스터", "그림액자", "갤러리월", "캔버스"],
    seedKeywords: [
      "인테리어 액자 세트 갤러리월", "캔버스 포스터 북유럽 모던",
      "사진 액자 나무 프레임 A4", "추상화 그림 액자 거실",
      "LED 네온사인 벽장식 인테리어",
    ] },
  { id: "cp.home.deco.clock", name: "시계/거울", level: 3, parent: "cp.home.deco",
    matchKeywords: ["벽시계", "탁상시계", "전신거울", "벽거울", "화장거울"],
    seedKeywords: [
      "무소음 벽시계 심플 인테리어", "전신거울 대형 스탠드",
      "LED 화장거울 조명 탁상", "빈티지 탁상시계 우드",
      "라운드 벽거울 욕실 인테리어",
    ] },

  // ── 스포츠/레저 L3 확장 ──
  { id: "cp.sports.fitness.yoga", name: "요가/필라테스", level: 3, parent: "cp.sports.fitness",
    matchKeywords: ["요가", "필라테스", "요가매트", "스트레칭"],
    seedKeywords: [
      "TPE 두꺼운 요가매트 8mm", "논슬립 요가 타월 극세사",
      "필라테스 링 소도구 세트", "밸런스 보수반구 코어",
      "요가 블록 2개세트 EVA",
    ] },
  { id: "cp.sports.golf", name: "골프", level: 2, parent: "cp.sports",
    matchKeywords: ["골프", "골프채", "골프웨어", "골프백"],
    seedKeywords: [] },
  { id: "cp.sports.golf.club", name: "골프채/용품", level: 3, parent: "cp.sports.golf",
    matchKeywords: ["골프채", "드라이버", "아이언", "퍼터", "골프공"],
    seedKeywords: [
      "초보 골프채 풀세트 남성", "여성 골프채 하프세트 경량",
      "골프공 2피스 연습용 20개", "퍼터 말렛형 투볼 정렬",
      "골프 드라이버 시니어 고반발",
    ] },
  { id: "cp.sports.golf.wear", name: "골프웨어/액세서리", level: 3, parent: "cp.sports.golf",
    matchKeywords: ["골프웨어", "골프바지", "골프모자", "골프장갑", "거리측정기"],
    seedKeywords: [
      "여성 골프 치마 바지 기능성", "남성 골프 폴로셔츠 냉감",
      "골프 캡 모자 UV차단 여성", "레이저 골프 거리측정기",
      "양피 골프장갑 남성 왼손",
    ] },
  { id: "cp.sports.swimming", name: "수영", level: 2, parent: "cp.sports",
    matchKeywords: ["수영", "수영복", "래쉬가드", "물안경"],
    seedKeywords: [] },
  { id: "cp.sports.swimming.wear", name: "수영복/래쉬가드", level: 3, parent: "cp.sports.swimming",
    matchKeywords: ["수영복", "래쉬가드", "비키니", "남성수영복", "아동수영복"],
    seedKeywords: [
      "여성 래쉬가드 세트 UV차단", "남성 수영복 보드숏 5부",
      "비키니 세트 하이웨이스트", "원피스 수영복 체형커버",
      "아동 래쉬가드 세트 UV차단",
    ] },
  { id: "cp.sports.swimming.gear", name: "수영 용품", level: 3, parent: "cp.sports.swimming",
    matchKeywords: ["물안경", "수모", "킥판", "오리발", "스노클"],
    seedKeywords: [
      "김서림방지 수경 물안경", "실리콘 수모 수영모 귀보호",
      "킥판 수영 보드 훈련", "스노클링 마스크 세트 풀페이스",
      "수영 귀마개 코클립 세트",
    ] },
  { id: "cp.sports.cycling", name: "자전거", level: 2, parent: "cp.sports",
    matchKeywords: ["자전거", "MTB", "로드바이크", "전기자전거"],
    seedKeywords: [] },
  { id: "cp.sports.cycling.bike", name: "자전거 본체", level: 3, parent: "cp.sports.cycling",
    matchKeywords: ["자전거", "접이식자전거", "전기자전거", "MTB", "미니벨로"],
    seedKeywords: [
      "접이식 미니벨로 출퇴근 경량", "전기자전거 PAS 도심형",
      "MTB 산악자전거 26인치 시마노", "입문 로드바이크 알루미늄",
      "어린이 자전거 보조바퀴 16인치",
    ] },
  { id: "cp.sports.cycling.accessory", name: "자전거 용품", level: 3, parent: "cp.sports.cycling",
    matchKeywords: ["자전거헬멧", "라이트", "자전거락", "안장", "사이클복"],
    seedKeywords: [
      "경량 자전거 헬멧 LED 내장", "USB 충전 전후방 라이트세트",
      "자전거 와이어락 번호키", "쿠션 안장커버 젤 편한",
      "사이클 장갑 반장갑 여름용",
    ] },
  { id: "cp.sports.running", name: "런닝", level: 2, parent: "cp.sports",
    matchKeywords: ["러닝", "마라톤", "조깅", "런닝화"],
    seedKeywords: [] },
  { id: "cp.sports.running.shoes", name: "런닝화", level: 3, parent: "cp.sports.running",
    matchKeywords: ["러닝화", "조깅화", "마라톤화", "쿠셔닝", "경량런닝화"],
    seedKeywords: [
      "쿠셔닝 러닝화 남성 초보", "경량 마라톤화 카본플레이트",
      "여성 러닝화 가벼운 핑크", "트레일 러닝화 방수 겸용",
      "넓은발볼 러닝화 4E 남성",
    ] },
  { id: "cp.sports.running.gear", name: "런닝 용품", level: 3, parent: "cp.sports.running",
    matchKeywords: ["러닝벨트", "러닝워치", "암밴드", "무릎보호대"],
    seedKeywords: [
      "러닝벨트 힙색 물병수납", "GPS 러닝워치 심박측정",
      "스마트폰 암밴드 러닝 방수", "무릎보호대 스포츠 러닝",
      "러닝양말 쿠션 발목 5켤레",
    ] },

  // ── 출산/유아동 L3 확장 ──
  { id: "cp.baby.stroller", name: "유모차", level: 2, parent: "cp.baby",
    matchKeywords: ["유모차", "디럭스유모차", "휴대용유모차"],
    seedKeywords: [] },
  { id: "cp.baby.stroller.deluxe", name: "디럭스/절충형", level: 3, parent: "cp.baby.stroller",
    matchKeywords: ["디럭스유모차", "절충형", "양대면", "신생아유모차"],
    seedKeywords: [
      "양대면 디럭스 유모차 신생아용", "절충형 유모차 가벼운 6kg",
      "트래블시스템 유모차 카시트호환", "유모차 풋머프 겨울 방한",
      "유모차 모기장 방충망 여름",
    ] },
  { id: "cp.baby.stroller.light", name: "초경량/휴대용", level: 3, parent: "cp.baby.stroller",
    matchKeywords: ["초경량유모차", "휴대용유모차", "포켓유모차", "세컨유모차"],
    seedKeywords: [
      "초경량 유모차 5kg 이하 기내", "원터치 접이식 포켓유모차",
      "세컨 유모차 여행용 소형", "한손접이 경량 유모차",
      "유모차 레인커버 투명 방풍",
    ] },
  { id: "cp.baby.carseat", name: "카시트", level: 2, parent: "cp.baby",
    matchKeywords: ["카시트", "회전형카시트", "부스터", "ISOFIX"],
    seedKeywords: [] },
  { id: "cp.baby.carseat.infant", name: "신생아/회전형", level: 3, parent: "cp.baby.carseat",
    matchKeywords: ["신생아카시트", "회전형", "ISOFIX", "바구니카시트"],
    seedKeywords: [
      "360도 회전형 카시트 ISOFIX", "신생아 카시트 0~4세용",
      "바구니형 카시트 캐리어겸용", "올인원 카시트 0~12세",
      "카시트 보호매트 시트커버",
    ] },
  { id: "cp.baby.carseat.booster", name: "부스터/주니어", level: 3, parent: "cp.baby.carseat",
    matchKeywords: ["부스터시트", "주니어카시트", "등받이부스터"],
    seedKeywords: [
      "부스터시트 등받이형 3~12세", "휴대용 부스터 여행 경량",
      "주니어 카시트 컵홀더 팔걸이", "접이식 부스터 시트 간편",
      "카시트 쿨시트 여름 통풍",
    ] },
  { id: "cp.baby.toy", name: "장난감/교구", level: 2, parent: "cp.baby",
    matchKeywords: ["장난감", "블록", "인형", "교구"],
    seedKeywords: [] },
  { id: "cp.baby.toy.block", name: "블록/조립", level: 3, parent: "cp.baby.toy",
    matchKeywords: ["블록", "레고", "자석블록", "듀플로", "나노블록"],
    seedKeywords: [
      "자석블록 100피스 대형세트", "레고 호환 클래식 벽돌",
      "원목 블록 100개 무독성", "아기 소프트블록 12개월",
      "테크닉 레고 호환 자동차",
    ] },
  { id: "cp.baby.toy.doll", name: "인형/피규어", level: 3, parent: "cp.baby.toy",
    matchKeywords: ["인형", "봉제인형", "피규어", "애착인형", "캐릭터"],
    seedKeywords: [
      "대형 곰인형 120cm 선물", "아기 애착인형 오가닉",
      "실바니안 패밀리 세트", "공룡 피규어 12종 세트",
      "산리오 캐릭터 인형 시나모롤",
    ] },
  { id: "cp.baby.toy.outdoor", name: "실외놀이/킥보드", level: 3, parent: "cp.baby.toy",
    matchKeywords: ["킥보드", "세발자전거", "미끄럼틀", "모래놀이", "물놀이"],
    seedKeywords: [
      "접이식 킥보드 어린이 LED바퀴", "세발자전거 푸쉬바 12개월",
      "실내 미끄럼틀 그네세트", "모래놀이 양동이 세트",
      "물총 대형 여름 물놀이",
    ] },
  { id: "cp.baby.clothing", name: "유아 의류", level: 2, parent: "cp.baby",
    matchKeywords: ["아기옷", "유아의류", "바디슈트", "신생아옷"],
    seedKeywords: [] },
  { id: "cp.baby.clothing.newborn", name: "신생아 의류", level: 3, parent: "cp.baby.clothing",
    matchKeywords: ["배냇저고리", "바디슈트", "속싸개", "신생아옷", "우주복"],
    seedKeywords: [
      "순면 바디슈트 5장세트 신생아", "이중가제 속싸개 사계절",
      "배냇저고리 선물세트 출산", "아기 우주복 겨울 패딩",
      "손발싸개 모자 선물세트",
    ] },
  { id: "cp.baby.clothing.toddler", name: "유아 외출복", level: 3, parent: "cp.baby.clothing",
    matchKeywords: ["유아외출복", "아이상하의", "키즈패딩", "아동원피스"],
    seedKeywords: [
      "유아 상하세트 봄 면 3종", "키즈 경량 패딩 조끼",
      "아동 원피스 꽃무늬 봄", "유아 레깅스 편한 바지",
      "아이 잠옷 파자마 세트 면",
    ] },

  // ── 생활용품: 추가 ──
  { id: "cp.living.storage", name: "수납/정리", level: 2, parent: "cp.living",
    matchKeywords: ["수납", "정리함", "리빙박스", "옷걸이"],
    seedKeywords: [] },
  { id: "cp.living.storage.box", name: "수납함/리빙박스", level: 3, parent: "cp.living.storage",
    matchKeywords: ["리빙박스", "수납함", "정리함", "진공압축", "옷정리"],
    seedKeywords: [
      "리빙박스 투명 대형 60L 3개", "진공 압축팩 이불 의류 6매",
      "서랍 칸막이 정리함 속옷용", "다용도 접이식 수납박스",
      "옷걸이 논슬립 벨벳 50개",
    ] },
  { id: "cp.living.storage.hanger", name: "옷걸이/빨래용품", level: 3, parent: "cp.living.storage",
    matchKeywords: ["옷걸이", "빨래건조대", "세탁망", "빨래바구니"],
    seedKeywords: [
      "스텐 빨래건조대 접이식 X형", "세탁망 미세먼지 3종세트",
      "빨래바구니 접이식 대형 방수", "나무 옷걸이 원목 20개",
      "빨래집게 스텐 40개 녹슬지않는",
    ] },

  // ── 자동차용품 ──
  { id: "cp.auto", name: "자동차용품", level: 1, parent: null,
    matchKeywords: ["자동차", "차량용", "세차", "블랙박스", "카용품"],
    seedKeywords: [] },
  { id: "cp.auto.interior", name: "차량 실내용품", level: 2, parent: "cp.auto",
    matchKeywords: ["시트커버", "차량충전기", "거치대", "방향제"],
    seedKeywords: [] },
  { id: "cp.auto.interior.charger", name: "충전기/거치대", level: 3, parent: "cp.auto.interior",
    matchKeywords: ["차량충전기", "핸드폰거치대", "차량무선충전", "시거잭"],
    seedKeywords: [
      "차량용 고속충전기 PD 듀얼", "무선충전 핸드폰 거치대",
      "맥세이프 차량 거치대 자석", "시거잭 멀티 소켓 3구",
      "차량용 태블릿 뒷좌석 거치대",
    ] },
  { id: "cp.auto.interior.scent", name: "차량 방향제/시트", level: 3, parent: "cp.auto.interior",
    matchKeywords: ["차량방향제", "시트커버", "핸들커버", "차량쿠션"],
    seedKeywords: [
      "차량용 방향제 고급 우드향", "가죽 시트커버 쿠션 사계절",
      "핸들커버 가죽 미끄럼방지", "차량 목쿠션 메모리폼",
      "차량용 쓰레기통 차량휴지통",
    ] },
  { id: "cp.auto.exterior", name: "세차/외부용품", level: 2, parent: "cp.auto",
    matchKeywords: ["세차", "블랙박스", "코팅", "워셔액"],
    seedKeywords: [] },
  { id: "cp.auto.exterior.wash", name: "세차용품", level: 3, parent: "cp.auto.exterior",
    matchKeywords: ["세차", "카샴푸", "왁스", "코팅", "세차타월"],
    seedKeywords: [
      "셀프세차 폼건 세트 가정용", "유리막 코팅제 DIY",
      "극세사 세차타월 400g 대형", "카샴푸 중성 무스 세차",
      "휠 클리너 브레이크 먼지 제거",
    ] },
  { id: "cp.auto.exterior.dashcam", name: "블랙박스", level: 3, parent: "cp.auto.exterior",
    matchKeywords: ["블랙박스", "대시캠", "전후방", "주차모드"],
    seedKeywords: [
      "전후방 FHD 블랙박스 주차모드", "4K UHD 블랙박스 GPS",
      "2채널 블랙박스 설치 간편", "블랙박스 보조배터리 주차녹화",
      "블랙박스 GPS 안테나 외장",
    ] },

  // ── 문구/오피스 ──
  { id: "cp.office", name: "문구/오피스", level: 1, parent: null,
    matchKeywords: ["문구", "사무용품", "오피스", "필기구"],
    seedKeywords: [] },
  { id: "cp.office.pen", name: "필기구", level: 2, parent: "cp.office",
    matchKeywords: ["볼펜", "만년필", "형광펜", "샤프", "연필"],
    seedKeywords: [] },
  { id: "cp.office.pen.item", name: "펜/필기구", level: 3, parent: "cp.office.pen",
    matchKeywords: ["볼펜", "젤펜", "만년필", "형광펜", "연필", "샤프"],
    seedKeywords: [
      "제트스트림 볼펜 0.5 3색", "만년필 입문 컨버터 세트",
      "형광펜 파스텔 6색 세트", "무독성 연필 HB 12자루",
      "자동 샤프 0.5mm 제도용",
    ] },
  { id: "cp.office.note", name: "노트/다이어리", level: 2, parent: "cp.office",
    matchKeywords: ["노트", "다이어리", "플래너", "스프링노트"],
    seedKeywords: [] },
  { id: "cp.office.note.item", name: "노트/다이어리", level: 3, parent: "cp.office.note",
    matchKeywords: ["노트", "무지노트", "다이어리", "플래너", "바인더"],
    seedKeywords: [
      "6공 바인더 다이어리 리필세트", "무지 노트 A5 5권세트",
      "위클리 플래너 2026년도", "스프링 노트 B5 줄간격",
      "가죽 다이어리 커버 프리미엄",
    ] },
  { id: "cp.office.supply", name: "사무용품", level: 2, parent: "cp.office",
    matchKeywords: ["테이프", "가위", "풀", "스테이플러", "라벨"],
    seedKeywords: [] },
  { id: "cp.office.supply.item", name: "사무소모품", level: 3, parent: "cp.office.supply",
    matchKeywords: ["테이프", "스카치테이프", "포스트잇", "클리어파일", "라미네이터"],
    seedKeywords: [
      "포스트잇 76x76 알뜰팩 12개", "투명 스카치테이프 10개입",
      "클리어파일 20포켓 A4", "라벨프린터 라벨지 호환",
      "문서세단기 가정용 소형",
    ] },

  // ── 식품: 양념/소스 ──
  { id: "cp.food.sauce", name: "양념/소스", level: 2, parent: "cp.food",
    matchKeywords: ["간장", "고추장", "된장", "소스", "양념"],
    seedKeywords: [] },
  { id: "cp.food.sauce.jang", name: "장류", level: 3, parent: "cp.food.sauce",
    matchKeywords: ["간장", "고추장", "된장", "쌈장", "양조간장"],
    seedKeywords: [
      "양조간장 1.8L 대용량", "순창 고추장 국산 500g",
      "전통 재래식 된장 1kg", "쌈장 국산콩 500g",
      "진간장 골드 1L",
    ] },
  { id: "cp.food.sauce.oil", name: "식용유/오일", level: 3, parent: "cp.food.sauce",
    matchKeywords: ["참기름", "올리브유", "식용유", "들기름", "카놀라유"],
    seedKeywords: [
      "국산 참기름 320ml 냉압착", "엑스트라버진 올리브유 1L",
      "카놀라유 500ml 요리용", "들기름 국내산 생들기름",
      "아보카도오일 요리 스프레이",
    ] },
  { id: "cp.food.sauce.spice", name: "향신료/조미료", level: 3, parent: "cp.food.sauce",
    matchKeywords: ["고춧가루", "후추", "소금", "설탕", "맛소금", "다시다"],
    seedKeywords: [
      "태양초 고춧가루 500g 보통맛", "통후추 그라인더 세트",
      "천일염 굵은소금 3kg", "다시다 쇠고기맛 1kg",
      "다진마늘 국산 큐브 1kg",
    ] },

  // ── 식품: 김치/반찬 ──
  { id: "cp.food.side", name: "김치/반찬", level: 2, parent: "cp.food",
    matchKeywords: ["김치", "반찬", "젓갈", "밑반찬"],
    seedKeywords: [] },
  { id: "cp.food.side.kimchi", name: "김치", level: 3, parent: "cp.food.side",
    matchKeywords: ["김치", "배추김치", "포기김치", "깍두기", "총각김치"],
    seedKeywords: [
      "국내산 배추김치 5kg 로켓프레시", "전라도 맛김치 산지직송",
      "깍두기 2kg 시원한 냉장", "백김치 담백한 3kg",
      "총각김치 국내산 재료 2kg",
    ] },
  { id: "cp.food.side.banchan", name: "반찬/젓갈", level: 3, parent: "cp.food.side",
    matchKeywords: ["밑반찬", "젓갈", "장조림", "멸치볶음", "반찬배달"],
    seedKeywords: [
      "밑반찬 10종 세트 로켓배송", "새우젓 추젓 강경 1kg",
      "메추리알 장조림 맛간장", "멸치볶음 고추 5팩세트",
      "반찬 구독 세트 주간배달",
    ] },

  // ── 식품: 베이커리 ──
  { id: "cp.food.bakery", name: "베이커리/떡", level: 2, parent: "cp.food",
    matchKeywords: ["빵", "베이커리", "떡", "케이크", "쿠키"],
    seedKeywords: [] },
  { id: "cp.food.bakery.bread", name: "빵/베이커리", level: 3, parent: "cp.food.bakery",
    matchKeywords: ["식빵", "모닝빵", "크로와상", "베이글", "바게트"],
    seedKeywords: [
      "통밀 식빵 무설탕 저칼로리", "냉동 크로와상 에프 10개",
      "베이글 플레인 6개입 냉동", "모닝빵 미니 30개 대용량",
      "호밀빵 독일식 사워도우",
    ] },
  { id: "cp.food.bakery.tteok", name: "떡/약과", level: 3, parent: "cp.food.bakery",
    matchKeywords: ["떡", "인절미", "약과", "송편", "떡케이크"],
    seedKeywords: [
      "인절미 찹쌀떡 콩가루 1kg", "수제 꿀약과 50개 대용량",
      "영양찰떡 견과 10개입", "현미 가래떡 다이어트용",
      "떡케이크 백일상 돌 주문제작",
    ] },

  // ── 식품: 쌀/잡곡 ──
  { id: "cp.food.grain", name: "쌀/잡곡", level: 2, parent: "cp.food",
    matchKeywords: ["쌀", "잡곡", "현미", "오트밀"],
    seedKeywords: [] },
  { id: "cp.food.grain.rice", name: "쌀", level: 3, parent: "cp.food.grain",
    matchKeywords: ["쌀", "백미", "햅쌀", "즉석밥", "무농약쌀"],
    seedKeywords: [
      "이천 햅쌀 10kg 로켓배송", "무농약 현미 5kg 건강",
      "즉석밥 210g 24개 대용량", "찰현미 찹쌀현미 5kg",
      "유기농 쌀 GAP 10kg",
    ] },
  { id: "cp.food.grain.cereal", name: "시리얼/오트밀", level: 3, parent: "cp.food.grain",
    matchKeywords: ["시리얼", "오트밀", "그래놀라", "콘푸레이크", "귀리"],
    seedKeywords: [
      "퀵 오트밀 1kg 유기농 귀리", "그래놀라 무가당 견과 500g",
      "콘푸레이크 시리얼 대용량 1kg", "초코 시리얼 아이 아침간식",
      "프로틴 그래놀라 단백질 300g",
    ] },

  // ── 식품: 견과류 ──
  { id: "cp.food.nuts", name: "견과류", level: 2, parent: "cp.food",
    matchKeywords: ["견과류", "아몬드", "호두", "잣", "하루견과"],
    seedKeywords: [] },
  { id: "cp.food.nuts.mixed", name: "혼합견과/하루견과", level: 3, parent: "cp.food.nuts",
    matchKeywords: ["혼합견과", "하루견과", "매일견과", "믹스넛"],
    seedKeywords: [
      "하루견과 30봉 소분 대용량", "오리지널 혼합견과 1kg",
      "프리미엄 매일견과 60봉", "저염 무가염 견과 500g",
      "견과류 선물세트 명절용",
    ] },
  { id: "cp.food.nuts.single", name: "단일견과", level: 3, parent: "cp.food.nuts",
    matchKeywords: ["아몬드", "호두", "캐슈넛", "피스타치오", "마카다미아"],
    seedKeywords: [
      "구운 아몬드 무염 1kg", "허니버터 아몬드 대용량",
      "깐호두 국산 500g", "피스타치오 구운 소금",
      "마카다미아 무가염 프리미엄",
    ] },

  // ── 식품: 음료 확장 ──
  { id: "cp.food.drink.tea", name: "차/건강음료", level: 3, parent: "cp.food.drink",
    matchKeywords: ["녹차", "홍차", "허브차", "콤부차", "보이차"],
    seedKeywords: [
      "제주 녹차 티백 100개입", "콤부차 발효음료 대용량",
      "루이보스 허브차 카페인프리", "보이차 다이어트 티백",
      "캐모마일 수면차 릴렉스",
    ] },
  { id: "cp.food.drink.water", name: "생수/탄산수", level: 3, parent: "cp.food.drink",
    matchKeywords: ["생수", "미네랄워터", "탄산수", "2L생수", "정수기"],
    seedKeywords: [
      "생수 2L 12병 로켓배송", "제주 삼다수 500ml 20개",
      "탄산수 500ml 24캔 무라벨", "백산수 미네랄워터 2L",
      "어린이 미니 생수 200ml 24개",
    ] },
];
