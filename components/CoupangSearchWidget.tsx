/**
 * 쿠팡 파트너스 검색 위젯
 * iframe 기반이므로 서버 컴포넌트에서도 동작
 */
export default function CoupangSearchWidget() {
  return (
    <div className="w-full my-6 flex flex-col items-center">
      <p className="text-xs text-gray-500 font-medium mb-2">
        🔍 쿠팡에서 상품 찾아보기
      </p>
      <div className="w-full max-w-xl">
        <iframe
          src="https://coupa.ng/cmkHu2"
          width="100%"
          height="75"
          frameBorder="0"
          scrolling="no"
          referrerPolicy="unsafe-url"
          // @ts-expect-error — browsingtopics는 experimental attribute
          browsingtopics=""
        />
      </div>
      <p className="mt-2 text-[10px] text-gray-400 text-center">
        ※ 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받을 수 있음
      </p>
    </div>
  );
}
