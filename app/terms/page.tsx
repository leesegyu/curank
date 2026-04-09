import Link from "next/link";

export const metadata = {
  title: "이용약관 - 쿠랭크",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">이용약관</h1>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">제1조 (목적)</h2>
          <p>
            본 약관은 쿠랭크(이하 &quot;서비스&quot;)가 제공하는 키워드 분석 및 추천
            서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 기타
            필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">제2조 (서비스 내용)</h2>
          <p>서비스는 다음과 같은 기능을 제공합니다:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>쿠팡 및 네이버 키워드 경쟁 분석</li>
            <li>검색 트렌드 및 인구통계 분석</li>
            <li>Blue Ocean 키워드 추천</li>
            <li>AI 기반 시장 분석 리포트</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">제3조 (이용자의 의무)</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>서비스를 부정한 목적으로 이용하지 않아야 합니다.</li>
            <li>타인의 개인정보를 도용하거나 부정하게 수집하지 않아야 합니다.</li>
            <li>서비스의 정상적인 운영을 방해하는 행위를 하지 않아야 합니다.</li>
            <li>자동화된 수단(봇, 크롤러 등)을 이용하여 서비스에 접근하지 않아야 합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">제4조 (서비스 제한 및 중단)</h2>
          <p>
            서비스는 시스템 점검, 장애 발생, 기타 불가피한 사유로 인해 일시적으로
            중단될 수 있으며, 이에 대해 별도의 보상을 하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">제5조 (면책사항)</h2>
          <p>
            서비스에서 제공하는 분석 데이터 및 추천 키워드는 참고 자료이며,
            이를 기반으로 한 투자 또는 사업 의사결정에 대한 책임은 이용자에게
            있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">제6조 (약관의 변경)</h2>
          <p>
            본 약관은 서비스 운영상 필요한 경우 변경될 수 있으며, 변경 사항은
            서비스 내 공지를 통해 안내합니다.
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
