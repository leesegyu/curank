import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function applySecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

const authProxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // 온보딩 페이지 자체는 통과
  if (pathname === "/onboarding") {
    // 로그인 안 했으면 로그인으로
    if (!req.auth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // 이미 온보딩 완료한 사용자는 홈으로
    const user = req.auth.user as Record<string, unknown> | undefined;
    if (user?.onboardingComplete) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // 보호된 라우트: 로그인 필수
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  // 로그인은 됐지만 온보딩 미완료 → /onboarding으로 강제 이동
  const user = req.auth.user as Record<string, unknown> | undefined;
  if (!user?.onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return applySecurityHeaders(NextResponse.next());
});

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 인증이 필요한 라우트는 authProxy로 위임
  if (
    pathname.startsWith("/analyze") ||
    pathname.startsWith("/keywords") ||
    pathname.startsWith("/mypage") ||
    pathname === "/onboarding"
  ) {
    return (authProxy as (req: NextRequest) => Promise<NextResponse>)(request);
  }

  // 나머지 라우트: 보안 헤더만 적용
  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-512.png|icon-kakao.svg).*)",
  ],
};
