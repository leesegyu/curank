/**
 * 스마트스토어 전용 카테고리 온톨로지
 * 네이버 쇼핑 카테고리 체계 기반
 *
 * L1: 10개 대분류
 * L2: ~40개 중분류
 * L3: ~120개 소분류
 * L4: ~80개 세분류 (주요 카테고리만)
 */

import type { OntologyNode } from "./types";

export const SMARTSTORE_NODES: OntologyNode[] = [

  // ═══════════════════════════════════════════════════════════════
  // L1: 식품 (가장 깊은 온톨로지 — 사용자 요청 삼겹살 예시)
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.food", name: "식품", level: 1, parent: null,
    matchKeywords: ["식품", "음식", "먹거리", "식재료", "요리", "반찬"],
    seedKeywords: [] },

  // ── L2: 축산/육류 ──
  { id: "ss.food.meat", name: "축산/육류", level: 2, parent: "ss.food",
    matchKeywords: ["고기", "육류", "축산", "정육"],
    seedKeywords: [] },

  // L3: 돼지고기
  { id: "ss.food.meat.pork", name: "돼지고기", level: 3, parent: "ss.food.meat",
    matchKeywords: ["돼지고기", "돼지", "돈육"],
    seedKeywords: [] },
  // L4: 삼겹살 세분화
  { id: "ss.food.meat.pork.belly", name: "삼겹살", level: 4, parent: "ss.food.meat.pork",
    matchKeywords: ["삼겹살", "삼겹", "통삼겹", "벌집삼겹"],
    seedKeywords: [
      "국내산 냉장 삼겹살 1kg", "한돈 숙성 삼겹살",
      "대패 삼겹살 냉동 1kg", "벌집 삼겹살 에어프라이어",
    ] },
  { id: "ss.food.meat.pork.belly_camping", name: "캠핑용 삼겹살", level: 4, parent: "ss.food.meat.pork",
    matchKeywords: ["캠핑 삼겹살", "캠핑용 삼겹", "바베큐 삼겹", "아웃도어 삼겹"],
    seedKeywords: [
      "캠핑용 삼겹살 국내산 세트", "1인 캠핑 삼겹살 밀키트",
      "숯불 바베큐 삼겹살 패키지", "차박 삼겹살 한판 세트",
    ] },
  { id: "ss.food.meat.pork.belly_aged", name: "숙성/수비드 삼겹살", level: 4, parent: "ss.food.meat.pork",
    matchKeywords: ["숙성 삼겹", "수비드 삼겹", "드라이에이징 삼겹", "웻에이징"],
    seedKeywords: [
      "7일 숙성 국내산 삼겹살", "수비드 삼겹살 간편 조리",
      "드라이에이징 삼겹살 프리미엄", "저온 숙성 한돈 삼겹",
    ] },
  { id: "ss.food.meat.pork.belly_seasoned", name: "양념 삼겹살", level: 4, parent: "ss.food.meat.pork",
    matchKeywords: ["양념 삼겹", "갈비 양념", "간장 삼겹", "매콤 삼겹"],
    seedKeywords: [
      "양념 삼겹살 밀키트 2인분", "고추장 양념 삼겹 구이",
      "간장 숙성 삼겹살", "매콤 불삼겹살 세트",
    ] },
  // L4: 목살/특수부위
  { id: "ss.food.meat.pork.neck", name: "목살/항정살", level: 4, parent: "ss.food.meat.pork",
    matchKeywords: ["목살", "항정살", "갈매기살", "가브리살", "특수부위"],
    seedKeywords: [
      "한돈 목살 냉장 500g", "항정살 구이 특수부위",
      "갈매기살 냉동 모듬", "국내산 가브리살 한판",
    ] },
  { id: "ss.food.meat.pork.ribs", name: "돼지갈비", level: 4, parent: "ss.food.meat.pork",
    matchKeywords: ["돼지갈비", "돈갈비", "등갈비", "스페어립"],
    seedKeywords: [
      "양념 돼지갈비 냉동 1kg", "등갈비 바베큐 세트",
      "스페어립 에어프라이어용", "한돈 왕갈비 선물세트",
    ] },

  // L3: 소고기
  { id: "ss.food.meat.beef", name: "소고기", level: 3, parent: "ss.food.meat",
    matchKeywords: ["소고기", "한우", "호주산 소", "미국산 소"],
    seedKeywords: [] },
  { id: "ss.food.meat.beef.sirloin", name: "등심/안심", level: 4, parent: "ss.food.meat.beef",
    matchKeywords: ["등심", "안심", "꽃등심", "채끝", "스테이크"],
    seedKeywords: [
      "한우 등심 선물세트 1++", "꽃등심 스테이크 200g",
      "안심 스테이크 웻에이징", "채끝살 구이 냉장",
    ] },
  { id: "ss.food.meat.beef.ribs", name: "갈비/차돌", level: 4, parent: "ss.food.meat.beef",
    matchKeywords: ["갈비", "소갈비", "LA갈비", "차돌", "차돌박이"],
    seedKeywords: [
      "LA갈비 양념 냉동 1kg", "차돌박이 국내산 500g",
      "소갈비찜 밀키트 2인", "명절 소갈비 선물세트",
    ] },

  // L3: 닭고기
  { id: "ss.food.meat.chicken", name: "닭고기/가금류", level: 3, parent: "ss.food.meat",
    matchKeywords: ["닭고기", "닭", "오리", "닭가슴살", "닭발"],
    seedKeywords: [
      "저칼로리 훈제 닭가슴살 30팩", "냉동 닭가슴살 대용량",
      "오리로스 냉동 슬라이스", "삼계탕 세트 국내산",
    ] },

  // L3: 수산물
  { id: "ss.food.meat.seafood", name: "수산물/해산물", level: 3, parent: "ss.food.meat",
    matchKeywords: ["생선", "해산물", "수산", "새우", "오징어", "게", "굴"],
    seedKeywords: [
      "왕새우 냉동 대용량", "손질 오징어 통째로",
      "통영 굴 신선 1kg", "킹크랩 냉동 홈파티",
    ] },

  // ── L2: 건강식/다이어트 ──
  { id: "ss.food.health", name: "건강식/다이어트", level: 2, parent: "ss.food",
    matchKeywords: ["건강", "다이어트", "건강식", "영양"],
    seedKeywords: [] },
  { id: "ss.food.health.protein", name: "단백질/보충제", level: 3, parent: "ss.food.health",
    matchKeywords: ["프로틴", "단백질", "보충제", "쉐이크", "BCAA"],
    seedKeywords: [
      "저당 단백질 바 초코 20개", "유청 프로틴 파우더 2kg",
      "BCAA 아미노산 보충제", "단백질 쉐이크 바나나맛",
    ] },
  { id: "ss.food.health.diet", name: "다이어트 식품", level: 3, parent: "ss.food.health",
    matchKeywords: ["곤약", "저칼로리", "식이섬유", "포만감", "다이어트 간식"],
    seedKeywords: [
      "곤약 젤리 포만감 저칼로리", "곤약 쌀 즉석밥 10팩",
      "저칼로리 과자 간식", "식이섬유 보충제 정",
    ] },
  { id: "ss.food.health.organic", name: "유기농/자연식품", level: 3, parent: "ss.food.health",
    matchKeywords: ["유기농", "자연식", "무농약", "친환경", "천연"],
    seedKeywords: [
      "유기농 혼합 견과류 500g", "무농약 현미 잡곡밥 12팩",
      "아카시아 천연 꿀 500g", "무항생제 계란 30구",
    ] },

  // ── L2: 음료/커피 ──
  { id: "ss.food.drink", name: "음료/커피", level: 2, parent: "ss.food",
    matchKeywords: ["커피", "음료", "차", "주스"],
    seedKeywords: [] },
  { id: "ss.food.drink.coffee", name: "커피/원두", level: 3, parent: "ss.food.drink",
    matchKeywords: ["커피", "원두", "드립", "콜드브루", "에스프레소"],
    seedKeywords: [
      "핸드드립 원두 200g 과테말라", "콜드브루 커피 1L 페트",
      "에스프레소 캡슐 호환 50개", "스페셜티 싱글오리진 원두",
    ] },
  { id: "ss.food.drink.tea", name: "차/건강음료", level: 3, parent: "ss.food.drink",
    matchKeywords: ["녹차", "말차", "허브차", "콤부차", "보이차", "홍차"],
    seedKeywords: [
      "제주 녹차 말차 가루 100g", "콤부차 발효음료 국내산",
      "루이보스 허브차 티백 50개", "보이차 다이어트 차",
    ] },

  // ── L2: 가공식품/간편식 ──
  { id: "ss.food.processed", name: "가공식품/간편식", level: 2, parent: "ss.food",
    matchKeywords: ["간편식", "밀키트", "즉석", "레토르트", "냉동식품"],
    seedKeywords: [] },
  { id: "ss.food.processed.mealkit", name: "밀키트/간편쿡", level: 3, parent: "ss.food.processed",
    matchKeywords: ["밀키트", "간편식", "쿠킹", "요리 세트"],
    seedKeywords: [
      "김치찌개 밀키트 2인분", "떡볶이 밀키트 치즈",
      "부대찌개 밀키트 대용량", "마라탕 밀키트 가정용",
    ] },
  { id: "ss.food.processed.frozen", name: "냉동식품", level: 3, parent: "ss.food.processed",
    matchKeywords: ["냉동", "만두", "피자", "냉동밥", "볶음밥"],
    seedKeywords: [
      "왕교자 만두 냉동 1kg", "불고기 볶음밥 냉동 10개",
      "냉동 피자 치즈 대용량", "떡갈비 냉동 간편식",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 패션의류
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.fashion", name: "패션의류", level: 1, parent: null,
    matchKeywords: ["의류", "옷", "패션", "의상"],
    seedKeywords: [] },

  { id: "ss.fashion.tops", name: "상의", level: 2, parent: "ss.fashion",
    matchKeywords: ["상의", "티셔츠", "셔츠", "니트", "후드"],
    seedKeywords: [] },
  { id: "ss.fashion.tops.tshirt", name: "티셔츠/반팔", level: 3, parent: "ss.fashion.tops",
    matchKeywords: ["티셔츠", "반팔", "반팔티", "나시", "민소매"],
    seedKeywords: [
      "오버핏 반팔 티셔츠 남성", "기본 라운드넥 여성 반팔",
      "린넨 민소매 여름 나시", "슬럽 빈티지 반팔티",
    ] },
  { id: "ss.fashion.tops.shirt", name: "셔츠/블라우스", level: 3, parent: "ss.fashion.tops",
    matchKeywords: ["셔츠", "블라우스", "남방", "와이셔츠"],
    seedKeywords: [
      "린넨 셔츠 여성 오버핏", "옥스포드 남성 셔츠 기본",
      "시스루 블라우스 봄", "스트라이프 셔츠 캐주얼",
    ] },
  { id: "ss.fashion.tops.knit", name: "니트/가디건", level: 3, parent: "ss.fashion.tops",
    matchKeywords: ["니트", "가디건", "스웨터", "캐시미어"],
    seedKeywords: [
      "크루넥 니트 슬림핏", "오버핏 가디건 봄 여성",
      "캐시미어 혼방 가디건", "아가일 패턴 니트",
    ] },
  { id: "ss.fashion.tops.hoodie", name: "후드/맨투맨", level: 3, parent: "ss.fashion.tops",
    matchKeywords: ["후드", "맨투맨", "후디", "스웨트셔츠"],
    seedKeywords: [
      "무지 오버핏 후드티", "집업 기모 후드 겨울",
      "크롭 후드 여성", "레터링 맨투맨 커플",
    ] },

  { id: "ss.fashion.bottoms", name: "하의", level: 2, parent: "ss.fashion",
    matchKeywords: ["바지", "하의", "스커트", "치마"],
    seedKeywords: [] },
  { id: "ss.fashion.bottoms.jeans", name: "청바지/데님", level: 3, parent: "ss.fashion.bottoms",
    matchKeywords: ["청바지", "데님", "진", "와이드진"],
    seedKeywords: [
      "슬림핏 청바지 남성", "하이웨이스트 와이드 데님",
      "부츠컷 청바지 여성", "스키니진 스판 남성",
    ] },
  { id: "ss.fashion.bottoms.slacks", name: "슬랙스/면바지", level: 3, parent: "ss.fashion.bottoms",
    matchKeywords: ["슬랙스", "면바지", "치노", "캐주얼 바지"],
    seedKeywords: [
      "와이드 슬랙스 여성", "밴딩 면바지 남성 여름",
      "구김 방지 정장 슬랙스", "린넨 팬츠 여름 여성",
    ] },
  { id: "ss.fashion.bottoms.leggings", name: "레깅스", level: 3, parent: "ss.fashion.bottoms",
    matchKeywords: ["레깅스", "요가팬츠", "스패츠"],
    seedKeywords: [
      "하이웨이스트 레깅스 여성", "기모 레깅스 겨울",
      "요가 레깅스 논슬립", "압박 기능성 레깅스",
    ] },

  { id: "ss.fashion.outer", name: "아우터", level: 2, parent: "ss.fashion",
    matchKeywords: ["자켓", "코트", "아우터", "점퍼", "패딩"],
    seedKeywords: [] },
  { id: "ss.fashion.outer.jacket", name: "자켓/코트", level: 3, parent: "ss.fashion.outer",
    matchKeywords: ["자켓", "코트", "블레이저", "트렌치코트"],
    seedKeywords: [
      "오버핏 데님 자켓 봄", "울 코트 여성 겨울",
      "린넨 블레이저 남성", "트렌치코트 봄 여성",
    ] },
  { id: "ss.fashion.outer.padding", name: "패딩/다운", level: 3, parent: "ss.fashion.outer",
    matchKeywords: ["패딩", "다운", "경량패딩", "롱패딩"],
    seedKeywords: [
      "경량 패딩 조끼 남녀공용", "구스다운 롱패딩 여성",
      "숏패딩 겨울 여성", "울트라라이트 다운재킷",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 패션잡화
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.accessory", name: "패션잡화", level: 1, parent: null,
    matchKeywords: ["잡화", "가방", "신발", "지갑", "모자"],
    seedKeywords: [] },

  { id: "ss.accessory.bag", name: "가방", level: 2, parent: "ss.accessory",
    matchKeywords: ["가방", "백", "백팩", "토트"],
    seedKeywords: [] },
  { id: "ss.accessory.bag.backpack", name: "백팩", level: 3, parent: "ss.accessory.bag",
    matchKeywords: ["백팩", "배낭", "노트북 가방", "책가방"],
    seedKeywords: [
      "방수 경량 백팩 남성", "노트북 수납 직장인 백팩",
      "등산 백팩 30L 대용량", "캔버스 학생 책가방",
    ] },
  { id: "ss.accessory.bag.crossbody", name: "크로스백/숄더백", level: 3, parent: "ss.accessory.bag",
    matchKeywords: ["크로스백", "숄더백", "토트백", "에코백"],
    seedKeywords: [
      "미니 크로스백 여성 가죽", "캔버스 토트백 대형",
      "숄더백 가죽 출퇴근", "에코백 접이식 장바구니",
    ] },

  { id: "ss.accessory.shoes", name: "신발", level: 2, parent: "ss.accessory",
    matchKeywords: ["신발", "운동화", "구두", "샌들", "슬리퍼"],
    seedKeywords: [] },
  { id: "ss.accessory.shoes.sneakers", name: "스니커즈/운동화", level: 3, parent: "ss.accessory.shoes",
    matchKeywords: ["운동화", "스니커즈", "캔버스화", "슬립온"],
    seedKeywords: [
      "쿠셔닝 남성 러닝화", "올화이트 캔버스 스니커즈",
      "슬립온 편한 신발", "여성 웨지 스니커즈",
    ] },
  { id: "ss.accessory.shoes.sandals", name: "샌들/슬리퍼", level: 3, parent: "ss.accessory.shoes",
    matchKeywords: ["샌들", "슬리퍼", "플립플롭", "여름 신발"],
    seedKeywords: [
      "여성 스트랩 샌들 여름", "남성 슬리퍼 실내외겸용",
      "플랫폼 샌들 키높이", "쿠션 슬리퍼 발편한",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 화장품/미용
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.beauty", name: "화장품/미용", level: 1, parent: null,
    matchKeywords: ["화장품", "뷰티", "스킨케어", "미용", "메이크업"],
    seedKeywords: [] },

  { id: "ss.beauty.skincare", name: "스킨케어", level: 2, parent: "ss.beauty",
    matchKeywords: ["스킨케어", "기초화장", "세럼", "크림"],
    seedKeywords: [] },
  { id: "ss.beauty.skincare.moisture", name: "보습/수분", level: 3, parent: "ss.beauty.skincare",
    matchKeywords: ["수분", "보습", "크림", "에센스", "미스트"],
    seedKeywords: [
      "건성 피부 수분 크림", "히알루론산 보습 세럼",
      "수분 미스트 스프레이", "판테놀 진정 에센스",
    ] },
  { id: "ss.beauty.skincare.sun", name: "선케어", level: 3, parent: "ss.beauty.skincare",
    matchKeywords: ["선크림", "자외선차단", "SPF", "PA", "선스틱"],
    seedKeywords: [
      "순한 SPF50 자외선차단제", "무기자차 선크림 물리적",
      "휴대용 선스틱 PA+++", "톤업 선크림 보라색",
    ] },
  { id: "ss.beauty.skincare.cleanser", name: "클렌징/세안", level: 3, parent: "ss.beauty.skincare",
    matchKeywords: ["클렌징", "세안", "폼클렌저", "오일", "클렌징워터"],
    seedKeywords: [
      "저자극 클렌징 오일 순한", "약산성 폼클렌저",
      "미셀라 클렌징워터 대용량", "딥클렌징 각질제거",
    ] },

  { id: "ss.beauty.makeup", name: "색조화장", level: 2, parent: "ss.beauty",
    matchKeywords: ["색조", "립스틱", "파운데이션", "아이섀도"],
    seedKeywords: [] },
  { id: "ss.beauty.makeup.base", name: "베이스", level: 3, parent: "ss.beauty.makeup",
    matchKeywords: ["쿠션", "파운데이션", "BB", "CC", "프라이머"],
    seedKeywords: [
      "커버력 쿠션 팩트 리필", "자연스러운 비비크림",
      "세미매트 파운데이션", "모공 프라이머",
    ] },
  { id: "ss.beauty.makeup.lips", name: "립 메이크업", level: 3, parent: "ss.beauty.makeup",
    matchKeywords: ["립스틱", "립밤", "틴트", "립글로스"],
    seedKeywords: [
      "촉촉한 립밤 무향", "매트 립스틱 레드",
      "데일리 립틴트 피치", "수분 광택 립글로스",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 디지털/가전
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.digital", name: "디지털/가전", level: 1, parent: null,
    matchKeywords: ["전자", "가전", "디지털", "IT", "전자기기"],
    seedKeywords: [] },

  { id: "ss.digital.audio", name: "음향/오디오", level: 2, parent: "ss.digital",
    matchKeywords: ["이어폰", "헤드폰", "스피커", "음향"],
    seedKeywords: [] },
  { id: "ss.digital.audio.earphone", name: "이어폰/헤드폰", level: 3, parent: "ss.digital.audio",
    matchKeywords: ["이어폰", "헤드폰", "에어팟", "무선이어폰", "TWS", "노이즈캔슬링"],
    seedKeywords: [
      "노이즈캔슬링 무선 이어폰", "유선 고음질 이어폰",
      "오픈형 무선 이어폰", "게이밍 헤드셋 7.1",
    ] },
  { id: "ss.digital.audio.speaker", name: "스피커", level: 3, parent: "ss.digital.audio",
    matchKeywords: ["스피커", "블루투스 스피커", "사운드바"],
    seedKeywords: [
      "방수 블루투스 스피커 캠핑", "미니 탁상용 스피커",
      "360도 서라운드 스피커", "TV 사운드바 무선",
    ] },

  { id: "ss.digital.peripheral", name: "PC주변기기", level: 2, parent: "ss.digital",
    matchKeywords: ["키보드", "마우스", "모니터", "웹캠"],
    seedKeywords: [] },
  { id: "ss.digital.peripheral.keyboard", name: "키보드", level: 3, parent: "ss.digital.peripheral",
    matchKeywords: ["키보드", "기계식", "텐키리스", "무선키보드"],
    seedKeywords: [
      "기계식 키보드 적축 텐키리스", "저소음 무선 키보드",
      "폴더블 블루투스 키보드", "게이밍 RGB 기계식",
    ] },
  { id: "ss.digital.peripheral.mouse", name: "마우스", level: 3, parent: "ss.digital.peripheral",
    matchKeywords: ["마우스", "무선마우스", "게이밍마우스", "트랙볼"],
    seedKeywords: [
      "경량 게이밍 무선 마우스", "인체공학 사무용 마우스",
      "조용한 무선 마우스 저소음", "트랙볼 마우스 손목보호",
    ] },

  { id: "ss.digital.mobile", name: "모바일 액세서리", level: 2, parent: "ss.digital",
    matchKeywords: ["보조배터리", "충전기", "케이스", "거치대"],
    seedKeywords: [] },
  { id: "ss.digital.mobile.battery", name: "보조배터리/충전기", level: 3, parent: "ss.digital.mobile",
    matchKeywords: ["보조배터리", "충전기", "고속충전", "케이블"],
    seedKeywords: [
      "보조배터리 20000mAh 대용량", "C타입 고속충전기 65W",
      "3in1 무선충전기 패드", "USB-C 케이블 고속",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 가구/인테리어
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.furniture", name: "가구/인테리어", level: 1, parent: null,
    matchKeywords: ["가구", "인테리어", "소파", "책상", "선반"],
    seedKeywords: [] },

  { id: "ss.furniture.living", name: "거실가구", level: 2, parent: "ss.furniture",
    matchKeywords: ["소파", "거실", "티테이블", "TV장"],
    seedKeywords: [] },
  { id: "ss.furniture.living.sofa", name: "소파", level: 3, parent: "ss.furniture.living",
    matchKeywords: ["소파", "쇼파", "1인소파", "리클라이너"],
    seedKeywords: [
      "1인 패브릭 암체어 원룸", "3인 코너 소파 세트",
      "리클라이너 전동 소파", "벨벳 소파 인테리어",
    ] },
  { id: "ss.furniture.living.storage", name: "수납/선반", level: 3, parent: "ss.furniture.living",
    matchKeywords: ["선반", "수납", "책장", "서랍장"],
    seedKeywords: [
      "벽걸이 원목 선반 3단", "이동식 바퀴 수납장",
      "패브릭 접이식 수납함", "아크릴 투명 서랍장",
    ] },

  { id: "ss.furniture.lighting", name: "조명", level: 2, parent: "ss.furniture",
    matchKeywords: ["조명", "스탠드", "무드등", "LED"],
    seedKeywords: [] },
  { id: "ss.furniture.lighting.stand", name: "스탠드/무드등", level: 3, parent: "ss.furniture.lighting",
    matchKeywords: ["스탠드", "독서등", "무드등", "수면등"],
    seedKeywords: [
      "LED 독서 스탠드 눈보호", "USB 무드등 수면 터치",
      "클립형 침대 독서등", "캠핑 랜턴 무드등",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 스포츠/레저
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.sports", name: "스포츠/레저", level: 1, parent: null,
    matchKeywords: ["스포츠", "운동", "레저", "피트니스"],
    seedKeywords: [] },

  { id: "ss.sports.fitness", name: "피트니스/헬스", level: 2, parent: "ss.sports",
    matchKeywords: ["헬스", "피트니스", "홈트", "웨이트"],
    seedKeywords: [] },
  { id: "ss.sports.fitness.yoga", name: "요가/필라테스", level: 3, parent: "ss.sports.fitness",
    matchKeywords: ["요가", "필라테스", "요가매트", "스트레칭"],
    seedKeywords: [
      "TPE 두꺼운 요가매트 8mm", "논슬립 요가 타월",
      "필라테스 링 소도구 세트", "밸런스 보수 반구",
    ] },
  { id: "ss.sports.fitness.gym", name: "헬스/웨이트", level: 3, parent: "ss.sports.fitness",
    matchKeywords: ["덤벨", "바벨", "케틀벨", "헬스장갑", "폼롤러"],
    seedKeywords: [
      "가정용 조절 덤벨 24kg", "저항밴드 5단계 세트",
      "폼롤러 근막이완 마사지", "힙업 밴드 스쿼트",
    ] },

  { id: "ss.sports.camping", name: "캠핑", level: 2, parent: "ss.sports",
    matchKeywords: ["캠핑", "아웃도어", "텐트", "캠핑장비"],
    seedKeywords: [] },
  { id: "ss.sports.camping.gear", name: "캠핑장비", level: 3, parent: "ss.sports.camping",
    matchKeywords: ["텐트", "캠핑의자", "캠핑테이블", "타프"],
    seedKeywords: [
      "경량 폴딩 캠핑의자 1인", "원터치 팝업텐트 2인용",
      "알루미늄 접이식 테이블", "차박 에어매트 SUV",
    ] },
  { id: "ss.sports.camping.cook", name: "캠핑쿠킹", level: 3, parent: "ss.sports.camping",
    matchKeywords: ["캠핑그릴", "버너", "코펠", "바베큐"],
    seedKeywords: [
      "소형 휴대용 캠핑그릴", "스텐 코펠 세트 1인",
      "부탄 가스 버너 접이식", "숯불 바베큐 그릴",
    ] },

  { id: "ss.sports.outdoor", name: "등산/아웃도어", level: 2, parent: "ss.sports",
    matchKeywords: ["등산", "트레킹", "아웃도어"],
    seedKeywords: [] },
  { id: "ss.sports.outdoor.hiking", name: "등산장비", level: 3, parent: "ss.sports.outdoor",
    matchKeywords: ["등산화", "트레킹화", "등산스틱", "등산배낭"],
    seedKeywords: [
      "여성 경량 방수 등산화", "카본 등산스틱 2개세트",
      "방수 등산배낭 30L", "고어텍스 트레킹화 남성",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 생활/건강
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.health", name: "생활/건강", level: 1, parent: null,
    matchKeywords: ["건강", "생활용품", "건강기기", "의료"],
    seedKeywords: [] },

  { id: "ss.health.massage", name: "안마/마사지", level: 2, parent: "ss.health",
    matchKeywords: ["마사지", "안마기", "마사지건"],
    seedKeywords: [] },
  { id: "ss.health.massage.device", name: "마사지기기", level: 3, parent: "ss.health.massage",
    matchKeywords: ["마사지건", "안마기", "눈마사지기", "발마사지"],
    seedKeywords: [
      "미니 마사지건 충전식", "목어깨 온열 안마기",
      "눈 마사지기 온열 진동", "발바닥 지압 마사지기",
    ] },

  { id: "ss.health.air", name: "공기/온습도", level: 2, parent: "ss.health",
    matchKeywords: ["공기청정기", "가습기", "제습기"],
    seedKeywords: [] },
  { id: "ss.health.air.purifier", name: "공기청정기", level: 3, parent: "ss.health.air",
    matchKeywords: ["공기청정기", "HEPA", "필터"],
    seedKeywords: [
      "원룸 소형 공기청정기 HEPA", "차량용 공기청정기 미니",
      "공기청정기 교체필터 세트", "침실용 저소음 공기청정기",
    ] },
  { id: "ss.health.air.humidity", name: "가습기/제습기", level: 3, parent: "ss.health.air",
    matchKeywords: ["가습기", "제습기", "초음파"],
    seedKeywords: [
      "무소음 초음파 가습기 대용량", "소형 제습기 원룸",
      "자연기화 에어워셔", "미니 USB 가습기 사무실",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 출산/육아
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.baby", name: "출산/육아", level: 1, parent: null,
    matchKeywords: ["아기", "육아", "신생아", "유아", "출산"],
    seedKeywords: [] },

  { id: "ss.baby.newborn", name: "신생아용품", level: 2, parent: "ss.baby",
    matchKeywords: ["신생아", "출생", "배냇"],
    seedKeywords: [] },
  { id: "ss.baby.newborn.clothing", name: "신생아의류", level: 3, parent: "ss.baby.newborn",
    matchKeywords: ["신생아옷", "바디슈트", "배냇저고리", "속싸개"],
    seedKeywords: [
      "순면 바디슈트 5장세트", "이중가제 속싸개 신생아",
      "배냇저고리 선물세트", "손발싸개 모자 세트",
    ] },

  { id: "ss.baby.feeding", name: "수유/이유식", level: 2, parent: "ss.baby",
    matchKeywords: ["수유", "젖병", "이유식", "빨대컵"],
    seedKeywords: [] },
  { id: "ss.baby.feeding.bottle", name: "젖병/컵", level: 3, parent: "ss.baby.feeding",
    matchKeywords: ["젖병", "빨대컵", "물병", "이유식용기"],
    seedKeywords: [
      "누수방지 아기 빨대컵", "흡착식판 이유식 용기 세트",
      "PPSU 젖병 신생아용", "아기물병 온도표시",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // L1: 여가/생활편의
  // ═══════════════════════════════════════════════════════════════
  { id: "ss.leisure", name: "여가/생활편의", level: 1, parent: null,
    matchKeywords: ["취미", "여가", "문구", "여행", "DIY"],
    seedKeywords: [] },

  { id: "ss.leisure.hobby", name: "취미/공예", level: 2, parent: "ss.leisure",
    matchKeywords: ["취미", "공예", "DIY", "만들기"],
    seedKeywords: [] },
  { id: "ss.leisure.hobby.art", name: "미술/드로잉", level: 3, parent: "ss.leisure.hobby",
    matchKeywords: ["그림", "수채화", "드로잉", "스케치", "색연필"],
    seedKeywords: [
      "수채화 36색 입문세트", "드로잉 태블릿 보급형",
      "색연필 72색 전문가용", "아크릴 물감 세트",
    ] },
  { id: "ss.leisure.hobby.craft", name: "공예/DIY", level: 3, parent: "ss.leisure.hobby",
    matchKeywords: ["뜨개질", "레진", "자수", "비즈", "마크라메"],
    seedKeywords: [
      "뜨개질 실 입문세트", "레진 DIY 키트 투명",
      "마크라메 월행잉 세트", "비즈 공예 키트",
    ] },

  { id: "ss.leisure.travel", name: "여행", level: 2, parent: "ss.leisure",
    matchKeywords: ["여행", "캐리어", "여행가방", "트래블"],
    seedKeywords: [] },
  { id: "ss.leisure.travel.luggage", name: "캐리어/파우치", level: 3, parent: "ss.leisure.travel",
    matchKeywords: ["캐리어", "여행파우치", "여권지갑"],
    seedKeywords: [
      "기내반입 20인치 캐리어", "여행용 화장품 파우치 세트",
      "압축 파우치 의류정리", "여권 지갑 케이스",
    ] },

  // ═══════════════════════════════════════════════════════════════
  // 확장 노드 시작 — 기존 노드 이후 append
  // ═══════════════════════════════════════════════════════════════

  // ── 식품 L3 확장: 과일 ──
  { id: "ss.food.fruit", name: "과일", level: 2, parent: "ss.food",
    matchKeywords: ["과일", "사과", "딸기", "포도", "귤"],
    seedKeywords: [] },
  { id: "ss.food.fruit.apple", name: "사과/배", level: 3, parent: "ss.food.fruit",
    matchKeywords: ["사과", "배", "청사과", "홍로", "부사", "신고배"],
    seedKeywords: [
      "경북 부사 사과 5kg 가정용", "꿀사과 청송 산지직송",
      "나주 배 선물세트 7.5kg", "홍로 사과 꿀당도",
      "유기농 사과즙 120포",
    ] },
  { id: "ss.food.fruit.berry", name: "딸기/베리류", level: 3, parent: "ss.food.fruit",
    matchKeywords: ["딸기", "블루베리", "라즈베리", "체리", "베리"],
    seedKeywords: [
      "논산 딸기 생딸기 1kg", "냉동 블루베리 미국산 1kg",
      "칠레산 생체리 2kg 항공직송", "유기농 라즈베리 냉동",
      "딸기 세척 설향 500g",
    ] },
  { id: "ss.food.fruit.citrus", name: "감귤/귤", level: 3, parent: "ss.food.fruit",
    matchKeywords: ["귤", "감귤", "한라봉", "천혜향", "레드향", "오렌지"],
    seedKeywords: [
      "제주 감귤 산지직송 5kg", "한라봉 선물세트 3kg",
      "천혜향 제주 가정용", "레드향 프리미엄 로열과",
      "제주 유기농 귤 10kg",
    ] },
  { id: "ss.food.fruit.melon", name: "수박/멜론/참외", level: 3, parent: "ss.food.fruit",
    matchKeywords: ["수박", "멜론", "참외", "성주참외", "애플망고"],
    seedKeywords: [
      "성주 참외 산지직송 3kg", "머스크 멜론 선물세트",
      "애플망고 제주산 1kg", "미니 수박 당도선별",
      "꿀참외 가정용 5kg",
    ] },
  { id: "ss.food.fruit.grape", name: "포도/샤인머스켓", level: 3, parent: "ss.food.fruit",
    matchKeywords: ["포도", "샤인머스켓", "거봉", "캠벨", "청포도"],
    seedKeywords: [
      "샤인머스켓 프리미엄 2kg", "거봉 포도 당도선별 2kg",
      "국산 캠벨포도 산지직송", "청포도 씨없는 2kg",
      "샤인머스켓 선물세트 고급",
    ] },

  // ── 식품 L3 확장: 견과류 ──
  { id: "ss.food.nuts", name: "견과류/건과", level: 2, parent: "ss.food",
    matchKeywords: ["견과류", "호두", "아몬드", "잣", "캐슈넛"],
    seedKeywords: [] },
  { id: "ss.food.nuts.mixed", name: "혼합견과", level: 3, parent: "ss.food.nuts",
    matchKeywords: ["혼합견과", "하루견과", "매일견과", "넛츠", "믹스넛"],
    seedKeywords: [
      "하루견과 30봉 소분 선물", "오리지널 혼합견과 1kg",
      "프리미엄 매일견과 60봉", "유기농 하루견과 선물세트",
      "저염 무가염 혼합견과 500g",
    ] },
  { id: "ss.food.nuts.almond", name: "아몬드/캐슈넛", level: 3, parent: "ss.food.nuts",
    matchKeywords: ["아몬드", "캐슈넛", "마카다미아", "피스타치오"],
    seedKeywords: [
      "구운 아몬드 무염 1kg", "허니버터 아몬드 대용량",
      "캐슈넛 볶음 500g", "마카다미아 무가염 프리미엄",
      "피스타치오 군것질 간식",
    ] },
  { id: "ss.food.nuts.walnut", name: "호두/잣", level: 3, parent: "ss.food.nuts",
    matchKeywords: ["호두", "잣", "피칸", "브라질넛"],
    seedKeywords: [
      "국산 호두 깐호두 500g", "가평 잣 백잣 100g",
      "피칸 무염 대용량 1kg", "브라질넛 셀레늄 200g",
      "호두 강정 선물세트",
    ] },

  // ── 식품 L3 확장: 김치/반찬 ──
  { id: "ss.food.side", name: "김치/반찬", level: 2, parent: "ss.food",
    matchKeywords: ["김치", "반찬", "젓갈", "장아찌", "밑반찬"],
    seedKeywords: [] },
  { id: "ss.food.side.kimchi", name: "김치", level: 3, parent: "ss.food.side",
    matchKeywords: ["김치", "배추김치", "총각김치", "깍두기", "열무김치", "포기김치"],
    seedKeywords: [
      "국내산 배추김치 5kg 가정용", "전라도 맛김치 산지직송",
      "포기김치 10kg 냉장 택배", "백김치 담백한 3kg",
      "총각김치 국산재료 2kg",
    ] },
  { id: "ss.food.side.banchan", name: "밑반찬/젓갈", level: 3, parent: "ss.food.side",
    matchKeywords: ["밑반찬", "젓갈", "장아찌", "멸치볶음", "반찬세트"],
    seedKeywords: [
      "밑반찬 10종 세트 배달", "강경 새우젓 추젓 1kg",
      "장아찌 모음 5종 선물", "맛간장 메추리알 장조림",
      "수제 오이소박이 1kg",
    ] },
  { id: "ss.food.side.pickled", name: "장아찌/절임", level: 3, parent: "ss.food.side",
    matchKeywords: ["장아찌", "피클", "절임", "마늘장아찌", "고추장아찌"],
    seedKeywords: [
      "마늘장아찌 국산 500g", "양파장아찌 대용량 1kg",
      "깻잎장아찌 간장 절임", "수제 피클 오이 모둠",
      "고추장아찌 매콤 500g",
    ] },

  // ── 식품 L3 확장: 떡/간식 ──
  { id: "ss.food.snack", name: "떡/간식", level: 2, parent: "ss.food",
    matchKeywords: ["떡", "과자", "간식", "한과", "전통떡"],
    seedKeywords: [] },
  { id: "ss.food.snack.tteok", name: "떡/전통떡", level: 3, parent: "ss.food.snack",
    matchKeywords: ["떡", "절편", "인절미", "송편", "떡케이크", "백설기"],
    seedKeywords: [
      "인절미 찹쌀떡 콩가루 1kg", "백일떡 백설기 맞춤 주문",
      "꿀떡 모듬떡 선물세트", "현미 가래떡 다이어트",
      "영양찰떡 견과떡 10개입",
    ] },
  { id: "ss.food.snack.cookie", name: "쿠키/과자", level: 3, parent: "ss.food.snack",
    matchKeywords: ["쿠키", "과자", "크래커", "비스킷", "뻥튀기"],
    seedKeywords: [
      "수제 마카롱 12개입 선물", "버터쿠키 대용량 1kg 틴케이스",
      "통밀 크래커 저칼로리 간식", "아기 과자 쌀뻥튀기",
      "글루텐프리 쿠키 비건",
    ] },
  { id: "ss.food.snack.hangwa", name: "한과/약과", level: 3, parent: "ss.food.snack",
    matchKeywords: ["한과", "약과", "유과", "강정", "전통과자"],
    seedKeywords: [
      "수제 약과 꿀약과 선물세트", "유과 세트 설 명절",
      "견과 강정 수제 간식", "전통 한과 모둠 선물",
      "미니약과 대용량 50개입",
    ] },

  // ── 식품 L3 확장: 장류/양념 ──
  { id: "ss.food.sauce", name: "장류/양념", level: 2, parent: "ss.food",
    matchKeywords: ["된장", "간장", "고추장", "양념", "소스", "장류"],
    seedKeywords: [] },
  { id: "ss.food.sauce.jang", name: "된장/고추장/간장", level: 3, parent: "ss.food.sauce",
    matchKeywords: ["된장", "고추장", "간장", "쌈장", "재래식", "전통장"],
    seedKeywords: [
      "전통 재래식 된장 1kg", "순창 고추장 국산 고춧가루",
      "양조간장 진간장 1.8L", "쌈장 국산콩 500g",
      "천일염 된장 3년숙성",
    ] },
  { id: "ss.food.sauce.oil", name: "식용유/참기름", level: 3, parent: "ss.food.sauce",
    matchKeywords: ["참기름", "들기름", "올리브유", "식용유", "아보카도오일"],
    seedKeywords: [
      "국산 참기름 320ml 냉압착", "들기름 국내산 생들기름",
      "엑스트라버진 올리브유 1L", "아보카도 오일 스프레이",
      "코코넛오일 유기농 500ml",
    ] },
  { id: "ss.food.sauce.spice", name: "향신료/소스", level: 3, parent: "ss.food.sauce",
    matchKeywords: ["고춧가루", "후추", "카레", "소스", "마늘", "생강"],
    seedKeywords: [
      "영양 고춧가루 태양초 500g", "통후추 그라인더 세트",
      "스리라차 칠리소스 대용량", "다진마늘 국산 1kg",
      "강황가루 울금 100% 분말",
    ] },

  // ── 패션 L3 확장: 원피스/드레스 ──
  { id: "ss.fashion.dress", name: "원피스/드레스", level: 2, parent: "ss.fashion",
    matchKeywords: ["원피스", "드레스", "롱원피스", "미니원피스"],
    seedKeywords: [] },
  { id: "ss.fashion.dress.casual", name: "캐주얼 원피스", level: 3, parent: "ss.fashion.dress",
    matchKeywords: ["캐주얼원피스", "데일리원피스", "면원피스", "셔츠원피스", "린넨원피스"],
    seedKeywords: [
      "린넨 셔츠 원피스 여름 롱", "면 데일리 원피스 루즈핏",
      "A라인 캐주얼 원피스 봄", "스트라이프 셔츠원피스 허리끈",
      "오버사이즈 티셔츠 원피스",
    ] },
  { id: "ss.fashion.dress.party", name: "파티/정장 드레스", level: 3, parent: "ss.fashion.dress",
    matchKeywords: ["파티드레스", "칵테일드레스", "하객룩", "하객원피스", "정장원피스"],
    seedKeywords: [
      "하객룩 원피스 결혼식 레이스", "칵테일 드레스 세미포멀",
      "블랙 파티 드레스 미니", "쉬폰 플리츠 하객 원피스",
      "오피스 정장 원피스 무릎",
    ] },
  { id: "ss.fashion.dress.summer", name: "여름 원피스", level: 3, parent: "ss.fashion.dress",
    matchKeywords: ["여름원피스", "비치원피스", "플라워원피스", "바캉스원피스", "리조트룩"],
    seedKeywords: [
      "플라워 쉬폰 롱원피스 여름", "바캉스 리조트 원피스 나시",
      "라탄 비치 커버업 원피스", "스모크 밴딩 원피스 오프숄더",
      "보헤미안 맥시 원피스 여름",
    ] },

  // ── 패션 L3 확장: 정장 ──
  { id: "ss.fashion.suit", name: "정장/오피스룩", level: 2, parent: "ss.fashion",
    matchKeywords: ["정장", "수트", "오피스룩", "비즈니스", "포멀"],
    seedKeywords: [] },
  { id: "ss.fashion.suit.mens", name: "남성 정장", level: 3, parent: "ss.fashion.suit",
    matchKeywords: ["남성정장", "남자수트", "양복", "남성슬랙스", "정장셋업"],
    seedKeywords: [
      "남성 슬림핏 정장 세트 네이비", "양복 상하의 세트 면접용",
      "구김방지 남성 정장바지", "캐주얼 블레이저 남성 봄가을",
      "면접 정장 세트 남성 블랙",
    ] },
  { id: "ss.fashion.suit.womens", name: "여성 정장", level: 3, parent: "ss.fashion.suit",
    matchKeywords: ["여성정장", "여성수트", "투피스", "여성블레이저", "오피스룩셋업"],
    seedKeywords: [
      "여성 투피스 정장 세트 봄", "오버핏 블레이저 여성 오피스",
      "하이웨이스트 정장바지 여성", "면접 정장 여성 단정한",
      "크롭 자켓 셋업 여성 봄",
    ] },

  // ── 패션 L3 확장: 운동복/트레이닝 ──
  { id: "ss.fashion.active", name: "운동복/트레이닝", level: 2, parent: "ss.fashion",
    matchKeywords: ["운동복", "트레이닝", "애슬레저", "짐웨어", "조깅복"],
    seedKeywords: [] },
  { id: "ss.fashion.active.training", name: "트레이닝 세트", level: 3, parent: "ss.fashion.active",
    matchKeywords: ["트레이닝세트", "츄리닝", "조거세트", "운동복세트", "짐웨어"],
    seedKeywords: [
      "남성 트레이닝 세트 기모", "여성 조거팬츠 세트 봄",
      "커플 츄리닝 세트 오버핏", "짐웨어 반팔 반바지 세트",
      "냉감 운동복 세트 여름",
    ] },
  { id: "ss.fashion.active.yoga", name: "요가복/필라테스복", level: 3, parent: "ss.fashion.active",
    matchKeywords: ["요가복", "필라테스복", "스포츠브라", "운동레깅스", "애슬레저"],
    seedKeywords: [
      "하이웨스트 요가 레깅스 여성", "필라테스 브라탑 세트",
      "스포츠브라 미디엄 서포트", "요가복 상하세트 여성 봄",
      "메쉬 통기성 운동 레깅스",
    ] },

  // ── 패션 L3 확장: 속옷/양말 ──
  { id: "ss.fashion.underwear", name: "속옷/양말", level: 2, parent: "ss.fashion",
    matchKeywords: ["속옷", "팬티", "브라", "양말", "런닝"],
    seedKeywords: [] },
  { id: "ss.fashion.underwear.bra", name: "브래지어/속옷세트", level: 3, parent: "ss.fashion.underwear",
    matchKeywords: ["브라", "브래지어", "노와이어", "속옷세트", "여성속옷", "스포츠브라"],
    seedKeywords: [
      "노와이어 브라 편한 면", "원피스 브라렛 심리스",
      "여성 속옷세트 5매입", "볼륨업 누드브라 실리콘",
      "수면브라 코튼 무봉제",
    ] },
  { id: "ss.fashion.underwear.panties", name: "팬티/사각팬티", level: 3, parent: "ss.fashion.underwear",
    matchKeywords: ["팬티", "사각팬티", "남성팬티", "여성팬티", "드로즈", "트렁크"],
    seedKeywords: [
      "남성 사각팬티 5매 면 세트", "여성 면팬티 10매 대용량",
      "드로즈 남성 기능성 통기", "쿨링 여름 팬티 냉감",
      "레이스 여성 팬티 세트",
    ] },
  { id: "ss.fashion.underwear.socks", name: "양말", level: 3, parent: "ss.fashion.underwear",
    matchKeywords: ["양말", "발목양말", "덧신", "스타킹", "압박스타킹"],
    seedKeywords: [
      "남성 발목양말 10켤레 세트", "여성 덧신 실리콘 미끄럼방지",
      "등산 양말 두꺼운 쿠션", "무지 면 양말 기본 20켤레",
      "압박 스타킹 다리부종",
    ] },

  // ── 뷰티 L3 확장: 헤어케어 ──
  { id: "ss.beauty.hair", name: "헤어케어", level: 2, parent: "ss.beauty",
    matchKeywords: ["샴푸", "린스", "헤어", "트리트먼트", "염색"],
    seedKeywords: [] },
  { id: "ss.beauty.hair.shampoo", name: "샴푸/린스", level: 3, parent: "ss.beauty.hair",
    matchKeywords: ["샴푸", "린스", "컨디셔너", "두피샴푸", "탈모샴푸", "약산성샴푸"],
    seedKeywords: [
      "탈모방지 두피 샴푸 1000ml", "약산성 아미노산 샴푸",
      "손상모 영양 컨디셔너", "비듬 가려움 두피케어 샴푸",
      "무실리콘 자연유래 샴푸",
    ] },
  { id: "ss.beauty.hair.treatment", name: "트리트먼트/에센스", level: 3, parent: "ss.beauty.hair",
    matchKeywords: ["트리트먼트", "헤어팩", "헤어에센스", "헤어오일", "손상모"],
    seedKeywords: [
      "손상모 집중 헤어팩 200ml", "아르간 헤어오일 경량",
      "열보호 헤어에센스 드라이전", "단백질 트리트먼트 복구",
      "코코넛 헤어마스크 팩",
    ] },
  { id: "ss.beauty.hair.dye", name: "염색/펌", level: 3, parent: "ss.beauty.hair",
    matchKeywords: ["염색", "새치염색", "헤어컬러", "탈색", "염색약"],
    seedKeywords: [
      "새치 커버 셀프 염색약", "애쉬브라운 거품 염색",
      "식물성 천연 헤나 염색", "블리치 탈색제 셀프",
      "컬러 샴푸 보라색 유지",
    ] },
  { id: "ss.beauty.hair.styling", name: "스타일링", level: 3, parent: "ss.beauty.hair",
    matchKeywords: ["왁스", "스프레이", "젤", "포마드", "고데기", "헤어드라이어"],
    seedKeywords: [
      "매트 왁스 남성 내추럴", "볼륨 스프레이 뿌리",
      "미니 고데기 여행용 휴대", "음이온 헤어드라이기 접이식",
      "컬링 아이론 봉고데기 32mm",
    ] },

  // ── 뷰티 L3 확장: 바디케어 ──
  { id: "ss.beauty.body", name: "바디케어", level: 2, parent: "ss.beauty",
    matchKeywords: ["바디로션", "바디워시", "입욕제", "각질제거", "핸드크림"],
    seedKeywords: [] },
  { id: "ss.beauty.body.wash", name: "바디워시/비누", level: 3, parent: "ss.beauty.body",
    matchKeywords: ["바디워시", "비누", "샤워젤", "클렌징바", "천연비누"],
    seedKeywords: [
      "보습 바디워시 1000ml 대용량", "약산성 민감성 바디워시",
      "천연 수제비누 선물세트", "아토피 순한 바디클렌저",
      "향기좋은 샤워젤 프리미엄",
    ] },
  { id: "ss.beauty.body.lotion", name: "바디로션/크림", level: 3, parent: "ss.beauty.body",
    matchKeywords: ["바디로션", "바디크림", "바디버터", "보습크림", "핸드크림"],
    seedKeywords: [
      "시어버터 바디크림 대용량", "아토피 세라마이드 로션",
      "핸드크림 선물세트 미니", "바디밀크 촉촉한 향기",
      "요소 크림 건조 갈라짐",
    ] },
  { id: "ss.beauty.body.scrub", name: "각질/제모", level: 3, parent: "ss.beauty.body",
    matchKeywords: ["각질제거", "스크럽", "제모", "왁싱", "바디스크럽"],
    seedKeywords: [
      "솔트 바디스크럽 각질제거", "AHA 필링 젤 얼굴 바디",
      "왁싱 스트립 다리 제모", "풋필링 발각질 팩",
      "슈가 스크럽 입술 각질",
    ] },

  // ── 뷰티 L3 확장: 네일 ──
  { id: "ss.beauty.nail", name: "네일", level: 2, parent: "ss.beauty",
    matchKeywords: ["네일", "매니큐어", "젤네일", "네일아트", "네일스티커"],
    seedKeywords: [] },
  { id: "ss.beauty.nail.polish", name: "네일폴리시/젤", level: 3, parent: "ss.beauty.nail",
    matchKeywords: ["매니큐어", "젤네일", "젤폴리시", "셀프젤네일", "탑코트"],
    seedKeywords: [
      "셀프 젤네일 세트 LED램프", "원스텝 젤폴리시 인기색",
      "빠른건조 매니큐어 누드톤", "네일 탑코트 광택 지속",
      "수성 어린이 매니큐어 무독성",
    ] },
  { id: "ss.beauty.nail.art", name: "네일아트/스티커", level: 3, parent: "ss.beauty.nail",
    matchKeywords: ["네일스티커", "네일아트", "네일팁", "젤스티커", "프렌치네일"],
    seedKeywords: [
      "젤네일 스티커 붙이는 세미큐어", "프렌치 네일팁 셀프",
      "글리터 네일아트 파츠 세트", "크리스마스 네일 스티커",
      "풀커버 네일팁 투명 500매",
    ] },

  // ── 뷰티 L3 확장: 향수 ──
  { id: "ss.beauty.perfume", name: "향수/디퓨저", level: 2, parent: "ss.beauty",
    matchKeywords: ["향수", "퍼퓸", "디퓨저", "방향제", "향기"],
    seedKeywords: [] },
  { id: "ss.beauty.perfume.fragrance", name: "향수", level: 3, parent: "ss.beauty.perfume",
    matchKeywords: ["향수", "오드퍼퓸", "오드뚜왈렛", "니치향수", "데일리향수"],
    seedKeywords: [
      "여성 데일리 향수 플로럴", "남성 우디 향수 시트러스",
      "니치 향수 유니섹스 50ml", "미니 향수 세트 선물용",
      "가성비 향수 지속력 좋은",
    ] },
  { id: "ss.beauty.perfume.diffuser", name: "디퓨저/캔들", level: 3, parent: "ss.beauty.perfume",
    matchKeywords: ["디퓨저", "캔들", "향초", "차량방향제", "섬유향수"],
    seedKeywords: [
      "리드 디퓨저 200ml 거실", "소이캔들 향초 선물세트",
      "차량용 방향제 송풍구", "섬유향수 옷 스프레이",
      "인센스 스틱 백단향 명상",
    ] },

  // ── 디지털 L3 확장: 카메라 ──
  { id: "ss.digital.camera", name: "카메라", level: 2, parent: "ss.digital",
    matchKeywords: ["카메라", "미러리스", "DSLR", "액션캠", "폴라로이드"],
    seedKeywords: [] },
  { id: "ss.digital.camera.mirrorless", name: "미러리스/DSLR", level: 3, parent: "ss.digital.camera",
    matchKeywords: ["미러리스", "DSLR", "렌즈", "바디", "풀프레임", "APS-C"],
    seedKeywords: [
      "입문용 미러리스 카메라 세트", "풀프레임 미러리스 바디",
      "단렌즈 50mm F1.8 인물용", "번들킷 렌즈 포함 미러리스",
      "카메라 가방 숄더백 방수",
    ] },
  { id: "ss.digital.camera.action", name: "액션캠/브이로그", level: 3, parent: "ss.digital.camera",
    matchKeywords: ["액션캠", "고프로", "짐벌", "브이로그", "셀카봉", "삼각대"],
    seedKeywords: [
      "4K 액션캠 방수 브이로그", "스마트폰 짐벌 3축 안정화",
      "무선 셀카봉 삼각대 겸용", "고프로 마운트 액세서리",
      "브이로그 카메라 소형 경량",
    ] },
  { id: "ss.digital.camera.instant", name: "즉석카메라/필름", level: 3, parent: "ss.digital.camera",
    matchKeywords: ["폴라로이드", "즉석카메라", "인스탁스", "필름카메라", "감성카메라"],
    seedKeywords: [
      "인스탁스 미니 즉석카메라", "폴라로이드 필름 20매입",
      "필름카메라 입문 수동 35mm", "즉석카메라 선물세트 케이스",
      "감성 다회용 필름카메라",
    ] },

  // ── 디지털 L3 확장: 노트북 ──
  { id: "ss.digital.laptop", name: "노트북", level: 2, parent: "ss.digital",
    matchKeywords: ["노트북", "랩탑", "맥북", "그램", "갤럭시북"],
    seedKeywords: [] },
  { id: "ss.digital.laptop.ultrabook", name: "울트라북/사무용", level: 3, parent: "ss.digital.laptop",
    matchKeywords: ["울트라북", "사무용노트북", "경량노트북", "그램", "슬림노트북"],
    seedKeywords: [
      "경량 14인치 노트북 1kg 이하", "대학생 노트북 가성비",
      "사무용 노트북 i5 16GB", "맥북에어 M시리즈 최신",
      "LG그램 15인치 초경량",
    ] },
  { id: "ss.digital.laptop.gaming", name: "게이밍 노트북", level: 3, parent: "ss.digital.laptop",
    matchKeywords: ["게이밍노트북", "RTX", "고사양노트북", "게임용노트북"],
    seedKeywords: [
      "RTX 게이밍 노트북 16인치", "고사양 게이밍 노트북 144Hz",
      "가성비 게이밍 노트북 학생", "17인치 대화면 게이밍",
      "게이밍 노트북 쿨링패드 세트",
    ] },
  { id: "ss.digital.laptop.accessory", name: "노트북 액세서리", level: 3, parent: "ss.digital.laptop",
    matchKeywords: ["노트북거치대", "노트북파우치", "노트북쿨러", "키스킨", "모니터암"],
    seedKeywords: [
      "알루미늄 노트북 거치대 접이식", "노트북 파우치 15.6인치 슬림",
      "USB 노트북 쿨링패드 팬", "모니터암 듀얼 책상 클램프",
      "노트북 키스킨 실리콘 범용",
    ] },

  // ── 디지털 L3 확장: 태블릿 ──
  { id: "ss.digital.tablet", name: "태블릿", level: 2, parent: "ss.digital",
    matchKeywords: ["태블릿", "아이패드", "갤럭시탭", "전자책"],
    seedKeywords: [] },
  { id: "ss.digital.tablet.ipad", name: "아이패드/갤럭시탭", level: 3, parent: "ss.digital.tablet",
    matchKeywords: ["아이패드", "갤럭시탭", "태블릿PC", "안드로이드태블릿"],
    seedKeywords: [
      "아이패드 최신 WiFi 모델", "갤럭시탭 S시리즈 최신",
      "가성비 태블릿 영상용 10인치", "학생용 태블릿 필기",
      "아이패드 미니 휴대용",
    ] },
  { id: "ss.digital.tablet.accessory", name: "태블릿 액세서리", level: 3, parent: "ss.digital.tablet",
    matchKeywords: ["태블릿케이스", "애플펜슬", "펜슬", "태블릿거치대", "키보드케이스"],
    seedKeywords: [
      "아이패드 키보드 케이스 세트", "애플펜슬 호환 터치펜",
      "태블릿 거치대 각도조절", "갤럭시탭 북커버 케이스",
      "종이질감 필름 태블릿 필기용",
    ] },

  // ── 디지털 L3 확장: 스마트홈 ──
  { id: "ss.digital.smarthome", name: "스마트홈", level: 2, parent: "ss.digital",
    matchKeywords: ["스마트홈", "IoT", "AI스피커", "홈캠", "스마트플러그"],
    seedKeywords: [] },
  { id: "ss.digital.smarthome.speaker", name: "AI스피커/허브", level: 3, parent: "ss.digital.smarthome",
    matchKeywords: ["AI스피커", "스마트스피커", "허브", "클로바", "알렉사", "구글홈"],
    seedKeywords: [
      "AI 스마트 스피커 음성인식", "스마트홈 허브 통합 컨트롤",
      "미니 AI 스피커 침실용", "디스플레이 스마트 스피커",
      "블루투스 겸용 AI 스피커",
    ] },
  { id: "ss.digital.smarthome.security", name: "홈캠/도어락", level: 3, parent: "ss.digital.smarthome",
    matchKeywords: ["홈캠", "CCTV", "도어락", "현관카메라", "베이비캠", "IP카메라"],
    seedKeywords: [
      "가정용 홈캠 360도 회전", "스마트 도어락 지문인식",
      "야간 적외선 IP 카메라", "베이비캠 양방향 음성",
      "현관 비디오 도어벨 무선",
    ] },
  { id: "ss.digital.smarthome.plug", name: "스마트 플러그/조명", level: 3, parent: "ss.digital.smarthome",
    matchKeywords: ["스마트플러그", "스마트전구", "IoT조명", "타이머콘센트", "LED스트립"],
    seedKeywords: [
      "WiFi 스마트 플러그 음성제어", "LED 스마트 전구 색변환",
      "간접조명 LED 스트립 5m", "스마트 멀티탭 원격제어",
      "센서 자동 조명 현관 LED",
    ] },

  // ── 가구 L3 확장: 침실가구 ──
  { id: "ss.furniture.bedroom", name: "침실가구", level: 2, parent: "ss.furniture",
    matchKeywords: ["침대", "매트리스", "옷장", "화장대", "협탁"],
    seedKeywords: [] },
  { id: "ss.furniture.bedroom.bed", name: "침대/프레임", level: 3, parent: "ss.furniture.bedroom",
    matchKeywords: ["침대", "침대프레임", "저상침대", "이층침대", "접이식침대"],
    seedKeywords: [
      "퀸 저상 침대프레임 원목", "슈퍼싱글 수납 침대",
      "이층침대 아이방 철제", "접이식 간이침대 원룸",
      "호텔식 침대 헤드보드 포함",
    ] },
  { id: "ss.furniture.bedroom.closet", name: "옷장/행거", level: 3, parent: "ss.furniture.bedroom",
    matchKeywords: ["옷장", "워드로브", "행거", "옷걸이", "드레스룸"],
    seedKeywords: [
      "조립식 옷장 대형 800L", "스틸 행거 이동식 튼튼한",
      "파이프 드레스룸 조립 DIY", "원목 옷장 슬라이딩 도어",
      "커버 행거 먼지방지 대형",
    ] },
  { id: "ss.furniture.bedroom.dresser", name: "화장대/협탁", level: 3, parent: "ss.furniture.bedroom",
    matchKeywords: ["화장대", "협탁", "사이드테이블", "콘솔", "좌식화장대"],
    seedKeywords: [
      "LED 거울 화장대 수납형", "미니 협탁 침대 사이드",
      "좌식 화장대 원룸 소형", "서랍형 콘솔 테이블",
      "스틸 사이드테이블 모던",
    ] },

  // ── 가구 L3 확장: 주방가구 ──
  { id: "ss.furniture.kitchen", name: "주방가구", level: 2, parent: "ss.furniture",
    matchKeywords: ["식탁", "주방수납", "렌지대", "식기건조대", "주방가구"],
    seedKeywords: [] },
  { id: "ss.furniture.kitchen.table", name: "식탁/테이블", level: 3, parent: "ss.furniture.kitchen",
    matchKeywords: ["식탁", "식탁세트", "접이식테이블", "바테이블", "식탁의자"],
    seedKeywords: [
      "4인용 원목 식탁 세트 의자포함", "접이식 식탁 2인 소형",
      "아일랜드 바 테이블 주방", "대리석상판 식탁 모던",
      "확장형 식탁 6인 8인",
    ] },
  { id: "ss.furniture.kitchen.rack", name: "주방 수납/렌지대", level: 3, parent: "ss.furniture.kitchen",
    matchKeywords: ["렌지대", "주방선반", "식기건조대", "양념선반", "냉장고선반"],
    seedKeywords: [
      "스텐 식기건조대 2단 싱크대", "전자레인지 렌지대 선반",
      "냉장고 옆 틈새수납장", "양념 선반 벽걸이 주방",
      "밥솥 수납장 이동식 바퀴",
    ] },

  // ── 가구 L3 확장: 욕실 ──
  { id: "ss.furniture.bath", name: "욕실인테리어", level: 2, parent: "ss.furniture",
    matchKeywords: ["욕실", "화장실", "샤워", "세면대", "욕실선반"],
    seedKeywords: [] },
  { id: "ss.furniture.bath.storage", name: "욕실 수납/선반", level: 3, parent: "ss.furniture.bath",
    matchKeywords: ["욕실선반", "욕실수납", "코너선반", "욕실장", "부착식선반"],
    seedKeywords: [
      "스텐 욕실 코너 선반 3단", "부착식 욕실 수납장 벽걸이",
      "자석 비누받침 부착형", "욕실 틈새 수납장 이동식",
      "샴푸디스펜서 벽부착 3구",
    ] },
  { id: "ss.furniture.bath.shower", name: "샤워용품/수전", level: 3, parent: "ss.furniture.bath",
    matchKeywords: ["샤워기", "샤워헤드", "수전", "필터샤워기", "샤워커튼"],
    seedKeywords: [
      "녹물제거 필터 샤워헤드", "절수 샤워기 수압상승",
      "샤워커튼 방수 곰팡이방지", "온도표시 LED 샤워헤드",
      "욕조 반신욕 접이식 간이",
    ] },

  // ── 가구 L3 확장: 커튼/블라인드 ──
  { id: "ss.furniture.curtain", name: "커튼/블라인드", level: 2, parent: "ss.furniture",
    matchKeywords: ["커튼", "블라인드", "롤스크린", "암막커튼", "레이스커튼"],
    seedKeywords: [] },
  { id: "ss.furniture.curtain.blackout", name: "암막/방한 커튼", level: 3, parent: "ss.furniture.curtain",
    matchKeywords: ["암막커튼", "방한커튼", "차광커튼", "단열커튼", "방음커튼"],
    seedKeywords: [
      "100% 암막 커튼 거실 대형", "3중 방한 단열 커튼 겨울",
      "창문 방음 암막커튼 원룸", "그레이 암막커튼 세트",
      "맞춤 제작 암막커튼 사이즈",
    ] },
  { id: "ss.furniture.curtain.blind", name: "블라인드/롤스크린", level: 3, parent: "ss.furniture.curtain",
    matchKeywords: ["블라인드", "롤스크린", "콤비블라인드", "우드블라인드", "허니콤"],
    seedKeywords: [
      "콤비 블라인드 맞춤 제작", "우드 블라인드 원목 거실",
      "무타공 롤스크린 부착형", "허니콤 블라인드 단열",
      "미니 블라인드 창문 사무실",
    ] },

  // ── 스포츠 L3 확장: 수영 ──
  { id: "ss.sports.swimming", name: "수영", level: 2, parent: "ss.sports",
    matchKeywords: ["수영", "수영복", "물안경", "수모", "아쿠아"],
    seedKeywords: [] },
  { id: "ss.sports.swimming.wear", name: "수영복", level: 3, parent: "ss.sports.swimming",
    matchKeywords: ["수영복", "래쉬가드", "비키니", "원피스수영복", "남성수영복"],
    seedKeywords: [
      "여성 래쉬가드 세트 자외선차단", "남성 수영복 5부 보드숏",
      "비키니 세트 바캉스 여름", "원피스 수영복 체형커버",
      "아동 래쉬가드 세트 UV차단",
    ] },
  { id: "ss.sports.swimming.gear", name: "수영 용품", level: 3, parent: "ss.sports.swimming",
    matchKeywords: ["물안경", "수모", "수영모", "킥판", "스노클", "귀마개"],
    seedKeywords: [
      "김서림방지 물안경 수경", "실리콘 수영모 귀보호",
      "수영 귀마개 코클립 세트", "킥판 수영 훈련 보드",
      "스노클링 세트 마스크 오리발",
    ] },

  // ── 스포츠 L3 확장: 골프 ──
  { id: "ss.sports.golf", name: "골프", level: 2, parent: "ss.sports",
    matchKeywords: ["골프", "골프채", "골프웨어", "골프백", "스크린골프"],
    seedKeywords: [] },
  { id: "ss.sports.golf.club", name: "골프채/용품", level: 3, parent: "ss.sports.golf",
    matchKeywords: ["골프채", "드라이버", "아이언", "퍼터", "웨지", "골프공"],
    seedKeywords: [
      "초보 골프채 풀세트 남성", "여성 골프채 하프세트",
      "골프공 2피스 연습용 20개", "퍼터 말렛형 투볼",
      "골프 드라이버 고반발 시니어",
    ] },
  { id: "ss.sports.golf.wear", name: "골프웨어", level: 3, parent: "ss.sports.golf",
    matchKeywords: ["골프웨어", "골프바지", "골프셔츠", "골프치마", "골프모자"],
    seedKeywords: [
      "여성 골프 치마 바지 기능성", "남성 골프 폴로셔츠 냉감",
      "골프 캡 모자 UV차단 여성", "골프 기능성 바지 남성 스판",
      "방풍 골프 자켓 바람막이 봄",
    ] },
  { id: "ss.sports.golf.accessory", name: "골프 액세서리", level: 3, parent: "ss.sports.golf",
    matchKeywords: ["골프백", "캐디백", "골프장갑", "골프우산", "거리측정기"],
    seedKeywords: [
      "골프백 캐디백 경량 바퀴", "양피 골프장갑 남성 왼손",
      "레이저 골프 거리측정기", "골프 우산 대형 자동 이중",
      "골프 파우치 미니 보냉백",
    ] },

  // ── 스포츠 L3 확장: 자전거 ──
  { id: "ss.sports.cycling", name: "자전거", level: 2, parent: "ss.sports",
    matchKeywords: ["자전거", "싸이클", "MTB", "로드바이크", "전기자전거"],
    seedKeywords: [] },
  { id: "ss.sports.cycling.bike", name: "자전거 본체", level: 3, parent: "ss.sports.cycling",
    matchKeywords: ["자전거", "MTB", "로드바이크", "하이브리드", "접이식자전거", "전기자전거"],
    seedKeywords: [
      "입문 로드바이크 시마노변속", "접이식 미니벨로 출퇴근",
      "전기자전거 PAS 삼륜", "MTB 산악자전거 26인치",
      "어린이 자전거 보조바퀴 18인치",
    ] },
  { id: "ss.sports.cycling.accessory", name: "자전거 용품", level: 3, parent: "ss.sports.cycling",
    matchKeywords: ["자전거헬멧", "자전거라이트", "자전거락", "사이클링복", "자전거안장"],
    seedKeywords: [
      "경량 자전거 헬멧 LED 후미등", "USB 충전 자전거 라이트",
      "자전거 락 와이어 번호키", "쿠션 안장 커버 젤 편한",
      "사이클 장갑 반장갑 여름",
    ] },

  // ── 스포츠 L3 확장: 런닝 ──
  { id: "ss.sports.running", name: "런닝/마라톤", level: 2, parent: "ss.sports",
    matchKeywords: ["러닝", "마라톤", "조깅", "런닝화", "러닝머신"],
    seedKeywords: [] },
  { id: "ss.sports.running.shoes", name: "런닝화", level: 3, parent: "ss.sports.running",
    matchKeywords: ["러닝화", "조깅화", "마라톤화", "쿠셔닝러닝화", "경량러닝화"],
    seedKeywords: [
      "쿠셔닝 러닝화 초보 추천", "경량 마라톤화 카본 플레이트",
      "여성 러닝화 핑크 가벼운", "트레일 러닝화 방수 등산겸용",
      "넓은발볼 러닝화 남성 4E",
    ] },
  { id: "ss.sports.running.gear", name: "런닝 용품", level: 3, parent: "ss.sports.running",
    matchKeywords: ["러닝벨트", "러닝워치", "스포츠밴드", "러닝아대", "암밴드"],
    seedKeywords: [
      "러닝벨트 힙색 물병 수납", "GPS 러닝워치 심박측정",
      "스마트폰 암밴드 러닝용", "무릎보호대 런닝 스포츠",
      "러닝양말 쿠션 발목 5켤레",
    ] },

  // ── 생활 L3 확장: 욕실용품 ──
  { id: "ss.health.bath", name: "욕실용품", level: 2, parent: "ss.health",
    matchKeywords: ["욕실", "칫솔", "치약", "수건", "욕실매트"],
    seedKeywords: [] },
  { id: "ss.health.bath.toothcare", name: "구강용품", level: 3, parent: "ss.health.bath",
    matchKeywords: ["칫솔", "치약", "전동칫솔", "치실", "가글", "구강청결제"],
    seedKeywords: [
      "전동칫솔 음파진동 교체형", "미백 치약 불소 120g 3개",
      "치실 왁스 50m 3개세트", "가글 구강청결제 대용량",
      "혀클리너 스텐 구강관리",
    ] },
  { id: "ss.health.bath.towel", name: "수건/타월", level: 3, parent: "ss.health.bath",
    matchKeywords: ["수건", "타월", "목욕타월", "세면타월", "극세사"],
    seedKeywords: [
      "호텔식 대형 목욕수건 5장", "극세사 헤어타월 빠른건조",
      "무형광 순면 세면수건 10장", "미용실 수건 40수 벌크",
      "와플 면 타월 주방 행주용",
    ] },
  { id: "ss.health.bath.mat", name: "욕실매트/발매트", level: 3, parent: "ss.health.bath",
    matchKeywords: ["욕실매트", "발매트", "규조토", "미끄럼방지", "흡수매트"],
    seedKeywords: [
      "규조토 발매트 빠른흡수", "실리콘 미끄럼방지 욕실매트",
      "메모리폼 발매트 현관용", "세탁가능 욕실매트 대형",
      "마이크로 흡수매트 물빠짐",
    ] },

  // ── 생활 L3 확장: 세탁/청소 ──
  { id: "ss.health.cleaning", name: "세탁/청소", level: 2, parent: "ss.health",
    matchKeywords: ["세탁", "청소", "세제", "빨래", "걸레"],
    seedKeywords: [] },
  { id: "ss.health.cleaning.detergent", name: "세제/세탁", level: 3, parent: "ss.health.cleaning",
    matchKeywords: ["세탁세제", "섬유유연제", "표백제", "드럼세제", "캡슐세제"],
    seedKeywords: [
      "고농축 세탁세제 캡슐 50개", "섬유유연제 은은한향 3L",
      "아기 세탁세제 순한 무향", "산소계 표백제 가루",
      "찌든때 전용 세탁세제",
    ] },
  { id: "ss.health.cleaning.mop", name: "청소용품", level: 3, parent: "ss.health.cleaning",
    matchKeywords: ["물걸레", "밀대", "청소기", "먼지떨이", "유리세정제"],
    seedKeywords: [
      "스프레이 물걸레 밀대 극세사", "무선 핸디 청소기 경량",
      "창문 유리 세정제 스프레이", "화장실 곰팡이 제거 스프레이",
      "일회용 정전기 먼지떨이 30매",
    ] },
  { id: "ss.health.cleaning.organize", name: "정리/수납", level: 3, parent: "ss.health.cleaning",
    matchKeywords: ["수납", "정리함", "리빙박스", "진공압축", "옷정리"],
    seedKeywords: [
      "리빙박스 투명 대형 3개", "진공 압축팩 이불 의류",
      "서랍 칸막이 정리함 속옷", "옷걸이 논슬립 벨벳 50개",
      "다용도 접이식 수납박스",
    ] },

  // ── 생활 L3 확장: 주방용품/음료용품 ──
  { id: "ss.health.kitchen", name: "주방용품", level: 2, parent: "ss.health",
    matchKeywords: ["주방용품", "텀블러", "물병", "보온병", "보온컵", "머그컵", "컵", "잔", "도시락통", "밀폐용기", "냄비", "프라이팬", "칼", "도마", "식기"],
    seedKeywords: [] },
  { id: "ss.health.kitchen.tumbler", name: "텀블러/보온병", level: 3, parent: "ss.health.kitchen",
    matchKeywords: ["텀블러", "보온병", "보온컵", "아이스컵", "스테인리스컵", "트래블머그", "빨대컵", "이중진공"],
    seedKeywords: [
      "스테인리스 텀블러 보온 500ml", "아이스 텀블러 빨대 대용량",
      "보온병 등산 캠핑 1L", "트래블머그 차량용 흘림방지",
      "직장인 사무실 텀블러 선물", "미니 텀블러 휴대용 350ml",
    ] },
  { id: "ss.health.kitchen.bottle", name: "물병/워터보틀", level: 3, parent: "ss.health.kitchen",
    matchKeywords: ["물병", "워터보틀", "트라이탄", "헬스물병", "등산물병"],
    seedKeywords: [
      "트라이탄 물병 1L BPA프리", "원터치 물병 헬스 운동",
      "빨대 물병 대용량 2L", "어린이 물병 캐릭터 350ml",
    ] },
  { id: "ss.health.kitchen.lunchbox", name: "도시락/밀폐용기", level: 3, parent: "ss.health.kitchen",
    matchKeywords: ["도시락", "도시락통", "밀폐용기", "반찬통", "유리용기", "스텐도시락"],
    seedKeywords: [
      "스텐 도시락통 2단 보온", "유리 밀폐용기 세트 4개",
      "전자레인지 도시락 직장인", "반찬통 소형 냉장고용",
    ] },
  { id: "ss.health.kitchen.cookware", name: "냄비/프라이팬", level: 3, parent: "ss.health.kitchen",
    matchKeywords: ["냄비", "프라이팬", "웍", "궁중팬", "주물냄비", "압력솥", "인덕션냄비"],
    seedKeywords: [
      "인덕션 프라이팬 28cm 코팅", "스텐 냄비 세트 3종",
      "주물 궁중팬 대형 볶음", "1인 편수냄비 라면 16cm",
    ] },
  { id: "ss.health.kitchen.cutlery", name: "칼/도마/식기", level: 3, parent: "ss.health.kitchen",
    matchKeywords: ["칼", "도마", "식기", "수저", "젓가락", "접시", "그릇", "컵세트"],
    seedKeywords: [
      "항균 도마 대형 논슬립", "스텐 수저 세트 4인용",
      "캠핑 식기 세트 경량", "세라믹 그릇 세트 북유럽",
    ] },

  // ── 생활 L3 확장: 수면/침구 ──
  { id: "ss.health.sleep", name: "수면/침구", level: 2, parent: "ss.health",
    matchKeywords: ["침구", "이불", "베개", "매트리스", "수면"],
    seedKeywords: [] },
  { id: "ss.health.sleep.blanket", name: "이불/이불커버", level: 3, parent: "ss.health.sleep",
    matchKeywords: ["이불", "이불커버", "여름이불", "차렵이불", "솜이불", "구스이불"],
    seedKeywords: [
      "여름 시어서커 이불 시원한", "극세사 겨울이불 퀸사이즈",
      "차렵이불 4계절 면 더블", "화이트구스 다운이불 프리미엄",
      "이불커버 순면 200수 호텔식",
    ] },
  { id: "ss.health.sleep.pillow", name: "베개/쿠션", level: 3, parent: "ss.health.sleep",
    matchKeywords: ["베개", "경추베개", "메모리폼", "라텍스베개", "바디필로우"],
    seedKeywords: [
      "메모리폼 경추베개 낮은높은", "천연 라텍스 베개 목편한",
      "구스다운 호텔 베개 푹신", "바디필로우 긴 베개 임산부",
      "쿨링 여름 베개 냉감 소재",
    ] },
  { id: "ss.health.sleep.mattress", name: "매트리스/토퍼", level: 3, parent: "ss.health.sleep",
    matchKeywords: ["매트리스", "토퍼", "매트리스토퍼", "접이식매트리스", "라텍스매트리스"],
    seedKeywords: [
      "메모리폼 토퍼 7cm 퀸", "접이식 매트리스 원룸 3단",
      "라텍스 매트리스 허리 지지", "양면 사계절 매트리스",
      "캠핑 에어매트 자충식",
    ] },

  // ── 육아 L3 확장: 유모차 ──
  { id: "ss.baby.stroller", name: "유모차", level: 2, parent: "ss.baby",
    matchKeywords: ["유모차", "디럭스유모차", "휴대용유모차", "절충형"],
    seedKeywords: [] },
  { id: "ss.baby.stroller.deluxe", name: "디럭스/절충형 유모차", level: 3, parent: "ss.baby.stroller",
    matchKeywords: ["디럭스유모차", "절충형유모차", "양대면유모차", "신생아유모차"],
    seedKeywords: [
      "양대면 디럭스 유모차 신생아", "절충형 유모차 가벼운 6kg",
      "여행용 경량 유모차 접이식", "유모차 풋머프 겨울용",
      "트래블시스템 유모차 카시트 호환",
    ] },
  { id: "ss.baby.stroller.light", name: "휴대용/초경량 유모차", level: 3, parent: "ss.baby.stroller",
    matchKeywords: ["초경량유모차", "휴대용유모차", "포켓유모차", "세컨유모차"],
    seedKeywords: [
      "초경량 유모차 5kg 이하 기내반입", "원터치 접이식 포켓 유모차",
      "세컨 유모차 여행용 소형", "한손 접이 경량 유모차",
      "유모차 레인커버 방풍 투명",
    ] },

  // ── 육아 L3 확장: 카시트 ──
  { id: "ss.baby.carseat", name: "카시트", level: 2, parent: "ss.baby",
    matchKeywords: ["카시트", "부스터", "회전형카시트", "신생아카시트"],
    seedKeywords: [] },
  { id: "ss.baby.carseat.infant", name: "신생아/영아 카시트", level: 3, parent: "ss.baby.carseat",
    matchKeywords: ["신생아카시트", "바구니카시트", "회전형카시트", "ISOFIX카시트"],
    seedKeywords: [
      "360도 회전형 카시트 신생아", "ISOFIX 카시트 0~4세",
      "바구니형 카시트 캐리어겸용", "신생아 카시트 측면보호",
      "올인원 카시트 신생아~12세",
    ] },
  { id: "ss.baby.carseat.booster", name: "주니어/부스터 카시트", level: 3, parent: "ss.baby.carseat",
    matchKeywords: ["부스터시트", "주니어카시트", "등받이부스터", "휴대용카시트"],
    seedKeywords: [
      "부스터시트 등받이형 3~12세", "휴대용 부스터 여행 경량",
      "주니어 카시트 팔걸이 컵홀더", "접이식 부스터 시트 간편",
      "카시트 보호매트 시트커버",
    ] },

  // ── 육아 L3 확장: 장난감/교구 ──
  { id: "ss.baby.toy", name: "장난감/교구", level: 2, parent: "ss.baby",
    matchKeywords: ["장난감", "교구", "놀이", "블록", "인형"],
    seedKeywords: [] },
  { id: "ss.baby.toy.block", name: "블록/레고", level: 3, parent: "ss.baby.toy",
    matchKeywords: ["블록", "레고", "듀플로", "나노블록", "자석블록", "조립"],
    seedKeywords: [
      "대형 자석블록 100피스 세트", "레고 호환 클래식 벽돌",
      "나무 원목 블록 100개 무독성", "아기 소프트블록 감각놀이",
      "닌자고 레고 최신 세트",
    ] },
  { id: "ss.baby.toy.doll", name: "인형/피규어", level: 3, parent: "ss.baby.toy",
    matchKeywords: ["인형", "피규어", "봉제인형", "애착인형", "바비", "실바니안"],
    seedKeywords: [
      "대형 곰인형 120cm 선물", "아기 애착인형 오가닉 토끼",
      "실바니안 패밀리 하우스 세트", "공룡 피규어 세트 12종",
      "산리오 쿠로미 캐릭터 인형",
    ] },
  { id: "ss.baby.toy.edu", name: "교육 완구/교구", level: 3, parent: "ss.baby.toy",
    matchKeywords: ["교구", "퍼즐", "학습", "한글교구", "수학교구", "보드게임"],
    seedKeywords: [
      "원목 퍼즐 유아 한글 숫자", "자석 한글 냉장고 교구",
      "코딩 로봇 교육 완구 초등", "과학 실험 키트 어린이",
      "어린이 보드게임 가족 7세이상",
    ] },
  { id: "ss.baby.toy.outdoor", name: "실외놀이/킥보드", level: 3, parent: "ss.baby.toy",
    matchKeywords: ["킥보드", "자전거", "그네", "미끄럼틀", "모래놀이", "물놀이"],
    seedKeywords: [
      "접이식 킥보드 어린이 LED", "세발자전거 푸쉬바 12개월",
      "실내 미끄럼틀 그네 세트", "모래놀이 세트 양동이",
      "물총 대용량 여름 물놀이",
    ] },

  // ── 여가 L3 확장: 문구 ──
  { id: "ss.leisure.stationery", name: "문구", level: 2, parent: "ss.leisure",
    matchKeywords: ["문구", "펜", "노트", "플래너", "다이어리"],
    seedKeywords: [] },
  { id: "ss.leisure.stationery.pen", name: "펜/필기구", level: 3, parent: "ss.leisure.stationery",
    matchKeywords: ["볼펜", "만년필", "젤펜", "형광펜", "샤프", "연필"],
    seedKeywords: [
      "제트스트림 볼펜 0.5 3색", "만년필 입문 컨버터 세트",
      "형광펜 파스텔 6색 세트", "자동 샤프 0.5mm 제도용",
      "모나미 볼펜 153 대용량",
    ] },
  { id: "ss.leisure.stationery.note", name: "노트/다이어리", level: 3, parent: "ss.leisure.stationery",
    matchKeywords: ["노트", "다이어리", "플래너", "스프링노트", "줄노트"],
    seedKeywords: [
      "6공 바인더 다이어리 리필", "무지 노트 A5 5권세트",
      "위클리 플래너 2026년", "아이패드 감성 스프링 노트",
      "가죽 다이어리 커버 프리미엄",
    ] },
  { id: "ss.leisure.stationery.desk", name: "데스크 정리", level: 3, parent: "ss.leisure.stationery",
    matchKeywords: ["필통", "펜꽂이", "데스크오거나이저", "북엔드", "파일함"],
    seedKeywords: [
      "원목 데스크 오거나이저 펜꽂이", "대용량 필통 파우치 학생",
      "서류정리함 3단 트레이", "모니터 받침대 수납형",
      "아크릴 메모보드 데스크",
    ] },

  // ── 여가 L3 확장: 악기 ──
  { id: "ss.leisure.music", name: "악기", level: 2, parent: "ss.leisure",
    matchKeywords: ["악기", "기타", "피아노", "우쿨렐레", "드럼"],
    seedKeywords: [] },
  { id: "ss.leisure.music.guitar", name: "기타/우쿨렐레", level: 3, parent: "ss.leisure.music",
    matchKeywords: ["기타", "어쿠스틱기타", "일렉기타", "우쿨렐레", "베이스기타"],
    seedKeywords: [
      "입문 어쿠스틱 기타 풀패키지", "콘서트 우쿨렐레 마호가니",
      "일렉기타 입문세트 앰프포함", "기타 카포 튜너 세트",
      "기타 스트랩 가죽 패딩",
    ] },
  { id: "ss.leisure.music.keyboard", name: "피아노/건반", level: 3, parent: "ss.leisure.music",
    matchKeywords: ["피아노", "전자피아노", "키보드", "건반", "디지털피아노", "미디"],
    seedKeywords: [
      "디지털피아노 88건반 해머액션", "접이식 전자 피아노 휴대용",
      "미디 키보드 25건반 작곡", "어린이 피아노 37건반 장난감",
      "전자 키보드 61건반 교육용",
    ] },
  { id: "ss.leisure.music.drum", name: "드럼/타악기", level: 3, parent: "ss.leisure.music",
    matchKeywords: ["드럼", "전자드럼", "카혼", "젬베", "타악기", "드럼패드"],
    seedKeywords: [
      "전자드럼 입문 메쉬패드", "휴대용 드럼패드 연습",
      "카혼 드럼 입문 수제", "젬베 아프리카 타악기",
      "드럼스틱 히코리 5A 2쌍",
    ] },

  // ── 여가 L3 확장: 보드게임 ──
  { id: "ss.leisure.boardgame", name: "보드게임", level: 2, parent: "ss.leisure",
    matchKeywords: ["보드게임", "카드게임", "퍼즐", "마피아", "할리갈리"],
    seedKeywords: [] },
  { id: "ss.leisure.boardgame.family", name: "가족 보드게임", level: 3, parent: "ss.leisure.boardgame",
    matchKeywords: ["가족보드게임", "할리갈리", "루미큐브", "젠가", "우노", "블록커스"],
    seedKeywords: [
      "할리갈리 컵스 가족게임", "루미큐브 클래식 4인",
      "젠가 클래식 나무블록", "우노 카드게임 정품",
      "블록커스 4인 전략 게임",
    ] },
  { id: "ss.leisure.boardgame.strategy", name: "전략 보드게임", level: 3, parent: "ss.leisure.boardgame",
    matchKeywords: ["전략보드게임", "카탄", "스플렌더", "티켓투라이드", "코드네임"],
    seedKeywords: [
      "카탄 한글판 3~4인", "스플렌더 보석 전략게임",
      "티켓투라이드 유럽 한글판", "코드네임 한국어판 팀게임",
      "아줄 타일놓기 보드게임",
    ] },
  { id: "ss.leisure.boardgame.puzzle", name: "퍼즐", level: 3, parent: "ss.leisure.boardgame",
    matchKeywords: ["퍼즐", "직소퍼즐", "1000피스", "3D퍼즐", "큐브"],
    seedKeywords: [
      "직소퍼즐 1000피스 명화", "3D 입체퍼즐 건축물",
      "스피드큐브 3x3 루빅스", "나무 퍼즐 두뇌 퍼즐",
      "액자형 퍼즐 완성 후 인테리어",
    ] },

  // ── 여가 L3 확장: 원예/가드닝 ──
  { id: "ss.leisure.garden", name: "원예/가드닝", level: 2, parent: "ss.leisure",
    matchKeywords: ["원예", "가드닝", "화분", "식물", "정원", "텃밭"],
    seedKeywords: [] },
  { id: "ss.leisure.garden.plant", name: "식물/화분", level: 3, parent: "ss.leisure.garden",
    matchKeywords: ["화분", "관엽식물", "다육", "선인장", "공기정화식물", "꽃"],
    seedKeywords: [
      "몬스테라 공기정화식물 대형", "다육이 모듬 세트 10종",
      "스투키 공기정화 개업 화분", "미니 화분 선인장 책상용",
      "율마 수경재배 식물 세트",
    ] },
  { id: "ss.leisure.garden.tool", name: "원예 도구/용품", level: 3, parent: "ss.leisure.garden",
    matchKeywords: ["원예도구", "모종삽", "분무기", "화분받침", "분갈이흙"],
    seedKeywords: [
      "원예 도구 세트 모종삽 5종", "분갈이흙 배양토 10L",
      "자동 급수 화분 자가관수", "텃밭 세트 베란다 키트",
      "미니 분무기 식물 물주기",
    ] },
  { id: "ss.leisure.garden.outdoor", name: "정원/테라스", level: 3, parent: "ss.leisure.garden",
    matchKeywords: ["정원", "테라스", "데크", "조경", "잔디", "정원가구"],
    seedKeywords: [
      "정원 태양광 LED 조명 세트", "인조잔디 베란다 테라스",
      "야외 정원 의자 2인 세트", "데크 타일 조립식 DIY",
      "화단 울타리 조경 펜스",
    ] },

  // ── 패션잡화 L3 확장: 지갑/벨트 ──
  { id: "ss.accessory.wallet", name: "지갑/벨트", level: 2, parent: "ss.accessory",
    matchKeywords: ["지갑", "벨트", "카드지갑", "장지갑", "머니클립"],
    seedKeywords: [] },
  { id: "ss.accessory.wallet.wallet", name: "지갑", level: 3, parent: "ss.accessory.wallet",
    matchKeywords: ["반지갑", "장지갑", "카드지갑", "동전지갑", "머니클립"],
    seedKeywords: [
      "남성 소가죽 반지갑 슬림", "여성 장지갑 지퍼형 대용량",
      "카드지갑 슬림 RFID 차단", "동전지갑 미니 가죽 키링",
      "머니클립 자석형 카드수납",
    ] },
  { id: "ss.accessory.wallet.belt", name: "벨트", level: 3, parent: "ss.accessory.wallet",
    matchKeywords: ["벨트", "남성벨트", "여성벨트", "자동벨트", "가죽벨트"],
    seedKeywords: [
      "남성 자동벨트 소가죽 정장용", "여성 가죽벨트 골드버클",
      "캐주얼 캔버스 벨트 남녀공용", "정장 벨트 선물세트 박스",
      "밴딩 고무벨트 등산 아웃도어",
    ] },

  // ── 패션잡화 L3 확장: 모자/선글라스 ──
  { id: "ss.accessory.hat", name: "모자/선글라스", level: 2, parent: "ss.accessory",
    matchKeywords: ["모자", "캡", "비니", "선글라스", "버킷햇"],
    seedKeywords: [] },
  { id: "ss.accessory.hat.cap", name: "모자/캡", level: 3, parent: "ss.accessory.hat",
    matchKeywords: ["볼캡", "비니", "버킷햇", "벙거지", "밀짚모자", "썬캡"],
    seedKeywords: [
      "볼캡 자수 로고 남녀공용", "니트 비니 겨울 방한 모자",
      "버킷햇 린넨 여름 벙거지", "골프 썬캡 자외선차단",
      "라탄 밀짚모자 여름 리조트",
    ] },
  { id: "ss.accessory.hat.sunglasses", name: "선글라스", level: 3, parent: "ss.accessory.hat",
    matchKeywords: ["선글라스", "편광", "틴트안경", "자외선차단안경", "미러렌즈"],
    seedKeywords: [
      "편광 선글라스 운전용 남성", "여성 오버사이즈 선글라스",
      "스포츠 선글라스 자전거 등산", "레트로 라운드 틴트안경",
      "클립온 선글라스 안경위 착용",
    ] },

  // ── 패션잡화 L3 확장: 시계/쥬얼리 ──
  { id: "ss.accessory.watch", name: "시계/쥬얼리", level: 2, parent: "ss.accessory",
    matchKeywords: ["시계", "손목시계", "목걸이", "귀걸이", "반지", "팔찌"],
    seedKeywords: [] },
  { id: "ss.accessory.watch.watch", name: "손목시계", level: 3, parent: "ss.accessory.watch",
    matchKeywords: ["손목시계", "메탈시계", "가죽시계", "스마트워치", "다이버시계"],
    seedKeywords: [
      "남성 메탈 손목시계 클래식", "여성 가죽밴드 시계 빈티지",
      "스마트워치 밴드 교체형", "패션 시계 골드 여성",
      "다이버 시계 방수 200m",
    ] },
  { id: "ss.accessory.watch.jewelry", name: "쥬얼리/액세서리", level: 3, parent: "ss.accessory.watch",
    matchKeywords: ["목걸이", "귀걸이", "반지", "팔찌", "은목걸이", "진주귀걸이"],
    seedKeywords: [
      "실버 925 목걸이 체인", "진주 귀걸이 담수 14K",
      "커플 반지 실버 이니셜", "팔찌 체인 레이어드",
      "귀걸이 세트 데일리 5쌍",
    ] },

  // ── 생활/건강 L3 확장: 건강기기/영양제 ──
  { id: "ss.health.supplement", name: "건강기능식품", level: 2, parent: "ss.health",
    matchKeywords: ["영양제", "비타민", "유산균", "오메가3", "건강기능식품"],
    seedKeywords: [] },
  { id: "ss.health.supplement.vitamin", name: "비타민/미네랄", level: 3, parent: "ss.health.supplement",
    matchKeywords: ["비타민C", "비타민D", "종합비타민", "칼슘", "마그네슘", "아연"],
    seedKeywords: [
      "종합비타민 멀티 365일분", "비타민D 5000IU 90캡슐",
      "마그네슘 수면 근육 90정", "비타민C 1000mg 대용량",
      "칼슘 마그네슘 아연 뼈건강",
    ] },
  { id: "ss.health.supplement.omega", name: "오메가3/루테인", level: 3, parent: "ss.health.supplement",
    matchKeywords: ["오메가3", "루테인", "크릴오일", "눈영양제", "지방산"],
    seedKeywords: [
      "rTG 오메가3 고함량 180캡슐", "크릴오일 남극 인지질",
      "루테인 지아잔틴 눈건강", "식물성 오메가3 아마씨유",
      "눈 영양제 빌베리 블루베리",
    ] },
  { id: "ss.health.supplement.probiotics", name: "유산균", level: 3, parent: "ss.health.supplement",
    matchKeywords: ["유산균", "프로바이오틱스", "장건강", "모유유산균"],
    seedKeywords: [
      "모유유산균 여성 질건강 60캡슐", "100억 장용성 유산균 30포",
      "어린이 유산균 츄어블 딸기맛", "김치 유산균 식물성",
      "프리바이오틱스 프로 복합",
    ] },
  { id: "ss.health.supplement.collagen", name: "콜라겐/히알루론산", level: 3, parent: "ss.health.supplement",
    matchKeywords: ["콜라겐", "히알루론산", "저분자콜라겐", "피쉬콜라겐", "이너뷰티"],
    seedKeywords: [
      "저분자 피쉬콜라겐 스틱 30포", "히알루론산 이너뷰티 캡슐",
      "콜라겐 젤리 석류맛 맛있는", "먹는 콜라겐 분말 100g",
      "엘라스틴 콜라겐 복합 30일분",
    ] },

  // ── 식품 추가 L3: 유제품 ──
  { id: "ss.food.dairy", name: "유제품", level: 2, parent: "ss.food",
    matchKeywords: ["우유", "요거트", "치즈", "버터", "유제품"],
    seedKeywords: [] },
  { id: "ss.food.dairy.milk", name: "우유/두유", level: 3, parent: "ss.food.dairy",
    matchKeywords: ["우유", "두유", "귀리우유", "아몬드밀크", "오트밀크"],
    seedKeywords: [
      "매일 소화가 잘되는 우유 1L", "무첨가 두유 190ml 24팩",
      "오트밀크 귀리우유 바리스타", "아몬드밀크 무가당 1L",
      "유기농 우유 팩 900ml",
    ] },
  { id: "ss.food.dairy.yogurt", name: "요거트", level: 3, parent: "ss.food.dairy",
    matchKeywords: ["요거트", "요거", "그릭요거트", "요플레", "발효유"],
    seedKeywords: [
      "그릭 요거트 무가당 플레인", "프로바이오틱스 발효유 30개",
      "그래놀라 토핑 요거트 컵", "유기농 요거트 아이간식",
      "단백질 그릭요거트 100g 10개",
    ] },
  { id: "ss.food.dairy.cheese", name: "치즈/버터", level: 3, parent: "ss.food.dairy",
    matchKeywords: ["치즈", "모짜렐라", "크림치즈", "버터", "슬라이스치즈"],
    seedKeywords: [
      "모짜렐라 치즈 슈레드 1kg", "크림치즈 200g 베이킹",
      "무염 버터 450g 국산", "슬라이스 치즈 36매",
      "그라나파다노 파마산 블록",
    ] },

  // ── 식품 추가 L3: 쌀/잡곡 ──
  { id: "ss.food.grain", name: "쌀/잡곡", level: 2, parent: "ss.food",
    matchKeywords: ["쌀", "잡곡", "현미", "찹쌀", "귀리", "오트밀"],
    seedKeywords: [] },
  { id: "ss.food.grain.rice", name: "쌀", level: 3, parent: "ss.food.grain",
    matchKeywords: ["쌀", "백미", "햅쌀", "이천쌀", "무농약쌀"],
    seedKeywords: [
      "이천 햅쌀 10kg 산지직송", "무농약 현미 5kg",
      "유기농 쌀 GAP 인증 10kg", "찰현미 찹쌀현미 5kg",
      "즉석밥 햇반 210g 24개",
    ] },
  { id: "ss.food.grain.cereal", name: "잡곡/시리얼", level: 3, parent: "ss.food.grain",
    matchKeywords: ["잡곡", "오트밀", "귀리", "퀴노아", "시리얼", "그래놀라"],
    seedKeywords: [
      "유기농 오트밀 퀵오츠 1kg", "그래놀라 무가당 견과 500g",
      "혼합 잡곡 16곡 1kg", "퀴노아 무농약 500g",
      "콘푸레이크 시리얼 대용량",
    ] },

  // ── 디지털 추가: 생활가전 ──
  { id: "ss.digital.appliance", name: "생활가전", level: 2, parent: "ss.digital",
    matchKeywords: ["로봇청소기", "에어프라이어", "전기밥솥", "식기세척기"],
    seedKeywords: [] },
  { id: "ss.digital.appliance.kitchen", name: "주방가전", level: 3, parent: "ss.digital.appliance",
    matchKeywords: ["에어프라이어", "전기밥솥", "믹서기", "전기포트", "토스터"],
    seedKeywords: [
      "에어프라이어 대용량 5.5L", "IH 전기밥솥 6인용",
      "초고속 진공 믹서기 블렌더", "전기포트 무선 1.7L 스텐",
      "토스터 오븐 12L 가정용",
    ] },
  { id: "ss.digital.appliance.cleaning", name: "청소가전", level: 3, parent: "ss.digital.appliance",
    matchKeywords: ["로봇청소기", "무선청소기", "스팀청소기", "건조기"],
    seedKeywords: [
      "로봇청소기 물걸레 자동비움", "경량 무선청소기 핸디형",
      "스팀 물걸레 청소기 살균", "의류건조기 히트펌프 9kg",
      "핸드형 무선 청소기 차량겸용",
    ] },
  { id: "ss.digital.appliance.beauty", name: "뷰티가전", level: 3, parent: "ss.digital.appliance",
    matchKeywords: ["고데기", "헤어드라이기", "제모기", "피부관리기", "LED마스크"],
    seedKeywords: [
      "음이온 헤어드라이기 대풍량", "세라믹 고데기 온도조절",
      "IPL 가정용 제모기 전신용", "LED마스크 피부관리 가정용",
      "갈바닉 페이스 마사지기",
    ] },

  // ── 추가 가구: 사무/학생가구 ──
  { id: "ss.furniture.office", name: "사무/학생가구", level: 2, parent: "ss.furniture",
    matchKeywords: ["책상", "의자", "사무용", "컴퓨터책상", "학생"],
    seedKeywords: [] },
  { id: "ss.furniture.office.desk", name: "책상", level: 3, parent: "ss.furniture.office",
    matchKeywords: ["컴퓨터책상", "서재책상", "스탠딩데스크", "게이밍데스크", "어린이책상"],
    seedKeywords: [
      "전동 스탠딩 데스크 높이조절", "L자형 컴퓨터 책상 코너",
      "어린이 높이조절 책상 의자세트", "1인 미니책상 원룸 접이식",
      "게이밍 데스크 RGB 조명",
    ] },
  { id: "ss.furniture.office.chair", name: "의자", level: 3, parent: "ss.furniture.office",
    matchKeywords: ["사무용의자", "메쉬의자", "게이밍체어", "인체공학의자", "좌식의자"],
    seedKeywords: [
      "메쉬 사무용 의자 허리받침", "인체공학 의자 요추 서포트",
      "게이밍 체어 발받침 리클라이닝", "좌식 등받이 의자 쿠션",
      "학생 의자 높이조절 바퀴",
    ] },

  // ── 추가: 반려동물 ──
  { id: "ss.pet", name: "반려동물", level: 1, parent: null,
    matchKeywords: ["반려동물", "강아지", "고양이", "펫", "애견"],
    seedKeywords: [] },
  { id: "ss.pet.dog", name: "강아지", level: 2, parent: "ss.pet",
    matchKeywords: ["강아지", "반려견", "개", "퍼피"],
    seedKeywords: [] },
  { id: "ss.pet.dog.food", name: "강아지 사료/간식", level: 3, parent: "ss.pet.dog",
    matchKeywords: ["강아지사료", "애견간식", "개사료", "닭가슴살간식", "덴탈껌"],
    seedKeywords: [
      "소형견 사료 6kg 오리", "강아지 간식 덴탈껌 대용량",
      "그레인프리 연어사료 반려견", "강아지 수제간식 닭가슴살",
      "노견 사료 시니어 관절",
    ] },
  { id: "ss.pet.dog.supply", name: "강아지 용품", level: 3, parent: "ss.pet.dog",
    matchKeywords: ["배변패드", "하네스", "강아지옷", "이동장", "강아지침대"],
    seedKeywords: [
      "강아지 배변패드 200매 대용량", "소형견 하네스 가슴줄 세트",
      "강아지 이동장 캐리어 기내반입", "반려견 침대 쿠션 방석",
      "강아지 겨울옷 패딩 조끼",
    ] },
  { id: "ss.pet.cat", name: "고양이", level: 2, parent: "ss.pet",
    matchKeywords: ["고양이", "캣", "묘", "냥이"],
    seedKeywords: [] },
  { id: "ss.pet.cat.food", name: "고양이 사료/간식", level: 3, parent: "ss.pet.cat",
    matchKeywords: ["고양이사료", "캣사료", "츄르", "습식캔", "고양이간식"],
    seedKeywords: [
      "고양이 사료 전연령 6kg", "츄르 고양이 간식 30개입",
      "그레인프리 연어 캣사료", "습식 고양이캔 참치 24개",
      "동결건조 간식 고양이 닭가슴살",
    ] },
  { id: "ss.pet.cat.supply", name: "고양이 용품", level: 3, parent: "ss.pet.cat",
    matchKeywords: ["고양이모래", "캣타워", "스크래처", "고양이화장실", "고양이장난감"],
    seedKeywords: [
      "두부 고양이 모래 7L 3개", "캣타워 대형 천장형 원목",
      "골판지 스크래처 리필 세트", "고양이 자동 화장실 셀프클린",
      "고양이 낚싯대 장난감 깃털",
    ] },

  // ── 추가 생활: 자동차용품 ──
  { id: "ss.health.car", name: "자동차용품", level: 2, parent: "ss.health",
    matchKeywords: ["자동차", "차량용", "카용품", "세차", "블랙박스"],
    seedKeywords: [] },
  { id: "ss.health.car.interior", name: "차량 실내용품", level: 3, parent: "ss.health.car",
    matchKeywords: ["시트커버", "차량방향제", "핸들커버", "차량수납", "차량충전기"],
    seedKeywords: [
      "차량용 고속충전기 PD 듀얼", "가죽 시트커버 자동차 쿠션",
      "차량용 방향제 고급 우드", "핸들커버 사계절 가죽",
      "차량용 핸드폰 거치대 무선충전",
    ] },
  { id: "ss.health.car.exterior", name: "세차/외부용품", level: 3, parent: "ss.health.car",
    matchKeywords: ["세차", "코팅", "워셔액", "블랙박스", "차량커버"],
    seedKeywords: [
      "셀프세차 폼건 세트 가정용", "유리막 코팅제 차량용",
      "블랙박스 전후방 FHD 주차", "차량 반커버 앞유리 성에",
      "타이어 왁스 광택 보호",
    ] },

  // ── 추가 레저: 낚시 ──
  { id: "ss.sports.fishing", name: "낚시", level: 2, parent: "ss.sports",
    matchKeywords: ["낚시", "바다낚시", "루어", "릴", "낚싯대"],
    seedKeywords: [] },
  { id: "ss.sports.fishing.rod", name: "낚싯대/릴", level: 3, parent: "ss.sports.fishing",
    matchKeywords: ["낚싯대", "릴", "루어낚시", "원투낚시", "바다낚싯대"],
    seedKeywords: [
      "루어 낚싯대 입문 세트", "원투 낚시 릴 세트 바다",
      "텔레스코픽 낚싯대 휴대용", "바다 찌낚시 세트 초보",
      "캐스팅릴 3000번 스피닝",
    ] },
  { id: "ss.sports.fishing.gear", name: "낚시 용품", level: 3, parent: "ss.sports.fishing",
    matchKeywords: ["낚시가방", "태클박스", "뜰채", "낚시의자", "미끼"],
    seedKeywords: [
      "낚시 루어 세트 100개 모음", "멀티 태클박스 수납 대형",
      "낚시 보조가방 다용도 허리", "미니 접이식 낚시의자 경량",
      "아이스박스 낚시용 보냉 25L",
    ] },
];
