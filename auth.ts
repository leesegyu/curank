import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { notifyNewSignup } from "@/lib/signup-notify";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type DbUser = {
  id: string;
  email: string;
  name: string | null;
  selling_experience: string | null;
  main_categories: string[];
  main_platform: string | null;
  platform_categories: { smartstore?: string[]; coupang?: string[] } | null;
};

/** platform_categories에 1개 이상 항목이 있으면 온보딩 완료 */
function isOnboardingComplete(user: DbUser): boolean {
  const pc = user.platform_categories;
  if (!pc) return false;
  return (pc.smartstore?.length ?? 0) + (pc.coupang?.length ?? 0) > 0;
}

const USER_SELECT = "id, email, name, selling_experience, main_categories, main_platform, platform_categories, oauth_providers";

/** OAuth 로그인 시 users 테이블 upsert — 크로스 OAuth 다중 프로바이더 지원 */
async function upsertOAuthUser(params: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  oauthId: string;
}): Promise<DbUser | null> {
  const { email, name, avatarUrl, provider, oauthId } = params;
  const newEntry = { provider, id: oauthId };

  // 1) oauth_providers JSONB 배열에서 같은 provider+id가 있는지 검색
  const { data: byOAuth } = await supabaseAdmin
    .from("users")
    .select(USER_SELECT)
    .contains("oauth_providers", [newEntry])
    .single();

  if (byOAuth) return byOAuth;

  // 1-b) 레거시 호환: 아직 마이그레이션 안 된 기존 계정
  const { data: byLegacy } = await supabaseAdmin
    .from("users")
    .select(USER_SELECT)
    .eq("oauth_provider", provider)
    .eq("oauth_id", oauthId)
    .single();

  if (byLegacy) {
    // 레거시 → oauth_providers로 마이그레이션
    const existing = Array.isArray(byLegacy.oauth_providers) ? byLegacy.oauth_providers : [];
    if (!existing.some((e: { provider: string; id: string }) => e.provider === provider && e.id === oauthId)) {
      existing.push(newEntry);
    }
    await supabaseAdmin
      .from("users")
      .update({ oauth_providers: existing })
      .eq("id", byLegacy.id);
    return byLegacy;
  }

  // 2) 같은 이메일로 가입된 계정이 있으면 → 크로스 OAuth 연결 (핵심!)
  const { data: byEmail } = await supabaseAdmin
    .from("users")
    .select(USER_SELECT)
    .eq("email", email.toLowerCase())
    .single();

  if (byEmail) {
    const existing = Array.isArray(byEmail.oauth_providers) ? byEmail.oauth_providers : [];
    if (!existing.some((e: { provider: string; id: string }) => e.provider === provider && e.id === oauthId)) {
      existing.push(newEntry);
    }
    await supabaseAdmin
      .from("users")
      .update({
        oauth_provider: provider,
        oauth_id: oauthId,
        oauth_providers: existing,
        avatar_url: avatarUrl,
        email_verified: true, // OAuth 이메일은 이미 검증됨
      })
      .eq("id", byEmail.id);
    return byEmail;
  }

  // 3) 신규 가입
  const { data: created, error } = await supabaseAdmin
    .from("users")
    .insert({
      email: email.toLowerCase(),
      name: name ?? email.split("@")[0],
      oauth_provider: provider,
      oauth_id: oauthId,
      oauth_providers: [newEntry],
      avatar_url: avatarUrl,
      email_verified: true, // OAuth 이메일은 이미 검증됨
    })
    .select(USER_SELECT)
    .single();

  if (error) {
    console.error("[auth] upsertOAuthUser insert error:", error.message, error.details);
    return null;
  }

  // OAuth 신규 가입 텔레그램 알림
  if (created) {
    notifyNewSignup(created.email, created.name).catch(() => {});
  }

  return created;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // ── 이메일 + 비밀번호 ──────────────────────────────────────
    Credentials({
      credentials: {
        email:    { label: "이메일",   type: "email"    },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user } = await supabaseAdmin
          .from("users")
          .select("id, email, name, password_hash, selling_experience, main_categories, main_platform, platform_categories, email_verified")
          .eq("email", (credentials.email as string).toLowerCase())
          .single();

        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        // 1단계: 이메일 미인증 시 로그인 차단
        if (!user.email_verified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id:    user.id,
          email: user.email,
          name:  user.name ?? user.email,
          sellingExperience:  user.selling_experience,
          mainCategories:     user.main_categories ?? [],
          mainPlatform:       user.main_platform,
          onboardingComplete: isOnboardingComplete(user as unknown as DbUser),
        };
      },
    }),

    // ── Google OAuth ──────────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Kakao OAuth ───────────────────────────────────────────
    Kakao({
      clientId:     process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
    }),
  ],

  session: { strategy: "jwt", maxAge: 2 * 60 * 60 },   // 최대 2시간
  pages: { signIn: "/login" },

  callbacks: {
    // OAuth 로그인 시 users 테이블에 upsert
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "kakao") {
        const rawEmail = user.email
          ?? (profile as { kakao_account?: { email?: string } })?.kakao_account?.email
          ?? (profile as { email?: string })?.email;

        // 2단계: 카카오 이메일 미동의 시 가입 차단
        if (!rawEmail) {
          console.error("[auth] OAuth signIn: 이메일 미동의 차단 (provider:", account.provider, ")");
          return "/login?error=EMAIL_REQUIRED";
        }

        const dbUser = await upsertOAuthUser({
          email:     rawEmail,
          name:      user.name ?? null,
          avatarUrl: user.image ?? null,
          provider:  account.provider,
          oauthId:   account.providerAccountId,
        });

        if (!dbUser) {
          console.error("[auth] OAuth signIn: upsertOAuthUser returned null");
          return false;
        }

        // JWT에 넘길 수 있도록 user 객체에 추가
        user.id = dbUser.id;
        (user as Record<string, unknown>).sellingExperience  = dbUser.selling_experience;
        (user as Record<string, unknown>).mainCategories     = dbUser.main_categories ?? [];
        (user as Record<string, unknown>).mainPlatform       = dbUser.main_platform;
        (user as Record<string, unknown>).onboardingComplete = isOnboardingComplete(dbUser);
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id                 = user.id;
        token.sellingExperience  = (user as Record<string, unknown>).sellingExperience as string | null;
        token.mainCategories     = (user as Record<string, unknown>).mainCategories as string[];
        token.mainPlatform       = (user as Record<string, unknown>).mainPlatform as string | null;
        token.onboardingComplete = (user as Record<string, unknown>).onboardingComplete as boolean;
      }

      // 기존 세션에 onboardingComplete 없으면 DB에서 1회 로드
      if (token.onboardingComplete === undefined && token.id) {
        const { data: existing } = await supabaseAdmin
          .from("users")
          .select("platform_categories")
          .eq("id", token.id)
          .single();
        if (existing) {
          token.onboardingComplete = isOnboardingComplete(existing as DbUser);
        } else {
          token.onboardingComplete = false;
        }
      }

      // 세션 갱신 요청 시 DB에서 최신 상태 다시 로드
      if (trigger === "update" && token.id) {
        const { data: fresh } = await supabaseAdmin
          .from("users")
          .select("selling_experience, main_categories, main_platform, platform_categories")
          .eq("id", token.id)
          .single();
        if (fresh) {
          token.sellingExperience  = fresh.selling_experience;
          token.mainCategories     = fresh.main_categories ?? [];
          token.mainPlatform       = fresh.main_platform;
          token.onboardingComplete = isOnboardingComplete(fresh as DbUser);
        }
      }

      // ── 비활동 2시간 만료 (sliding session) ──
      const now = Math.floor(Date.now() / 1000);
      const IDLE_LIMIT = 2 * 60 * 60; // 2시간

      if (!token.lastActive) {
        token.lastActive = now;
      } else if (now - (token.lastActive as number) > IDLE_LIMIT) {
        // 비활동 2시간 초과 → 토큰 무효화
        return { ...token, id: undefined, expired: true };
      }
      token.lastActive = now; // 요청마다 갱신 (sliding)

      return token;
    },

    async session({ session, token }) {
      // 비활동 만료된 토큰이면 세션 무효 처리
      if (token?.expired) {
        session.user = undefined as unknown as typeof session.user;
        return session;
      }

      if (token) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id                 = token.id;
        u.sellingExperience  = token.sellingExperience;
        u.mainCategories     = token.mainCategories;
        u.mainPlatform       = token.mainPlatform;
        u.onboardingComplete = token.onboardingComplete;
      }
      return session;
    },
  },
});
