import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 - 쿠랭크",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">개인정보처리방침</h1>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. 수집하는 개인정보 항목</h2>
          <p>서비스는 회원가입 및 서비스 이용을 위해 다음 정보를 수집합니다:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>필수: 이메일 주소, 비밀번호(암호화 저장)</li>
            <li>선택: 이름, 프로필 이미지(소셜 로그인 시)</li>
            <li>자동 수집: 서비스 이용 기록, 키워드 검색 이력</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>회원 식별 및 본인 인증</li>
            <li>서비스 제공 및 개인화된 키워드 추천</li>
            <li>이용 현황 분석 및 서비스 개선</li>
            <li>공지사항 및 고객 지원</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            회원 탈퇴 시 수집된 개인정보는 지체 없이 파기합니다. 단, 관련 법령에
            의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>전자상거래법에 따른 계약/거래 기록: 5년</li>
            <li>통신비밀보호법에 따른 로그 기록: 3개월</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. 개인정보의 제3자 제공</h2>
          <p>
            서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만, 법률에 의한 요청이 있는 경우 예외로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. 개인정보의 안전성 확보 조치</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>비밀번호는 bcrypt 알고리즘으로 단방향 암호화하여 저장</li>
            <li>HTTPS를 통한 데이터 전송 암호화</li>
            <li>접근 권한 관리 및 접근 통제</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. 이용자의 권리</h2>
          <p>
            이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있으며,
            회원 탈퇴를 통해 개인정보 처리 정지를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. 개인정보 보호책임자</h2>
          <p>
            개인정보 처리에 관한 문의는 서비스 내 문의 기능을 통해
            연락해 주시기 바랍니다.
          </p>
        </section>

        <p className="text-gray-400 mt-8">시행일: 2026년 4월 9일</p>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          &larr; 홈으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
