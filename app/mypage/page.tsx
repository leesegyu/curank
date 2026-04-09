"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import PlatformCategoryPicker from "@/components/PlatformCategoryPicker";
import type { PlatformCategories } from "@/components/PlatformCategoryPicker";
import { SMARTSTORE_NODES } from "@/lib/ontology/smartstore";
import { COUPANG_NODES } from "@/lib/ontology/coupang";

const ALL_NODES = [...SMARTSTORE_NODES, ...COUPANG_NODES];
function getNodeName(id: string): string | null {
  const node = ALL_NODES.find((n) => n.id === id);
  return node?.name ?? null;
}

const CATEGORIES = [
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
];

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner:     "초보 (6개월 미만)",
  intermediate: "중급 (6개월~2년)",
  expert:       "고수 (2년 이상)",
};

const PLATFORM_LABELS: Record<string, string> = {
  coupang:    "쿠팡",
  smartstore: "스마트스토어",
  both:       "쿠팡 + 스마트스토어",
  other:      "기타",
};

const PLATFORM_OPTIONS = [
  { value: "coupang",    label: "쿠팡" },
  { value: "smartstore", label: "스마트스토어" },
  { value: "both",       label: "둘 다" },
  { value: "other",      label: "기타" },
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner",     label: "초보",   desc: "6개월 미만" },
  { value: "intermediate", label: "중급",   desc: "6개월~2년" },
  { value: "expert",       label: "고수",   desc: "2년 이상" },
];

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  selling_experience: string | null;
  main_categories: string[];
  main_platform: string | null;
  platform_categories: { smartstore?: string[]; coupang?: string[] } | null;
  oauth_provider: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface HistoryItem {
  keyword: string;
  ts: string;
}

export default function MyPage() {
  const [user, setUser]       = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // 편집 상태
  const [editName, setEditName]               = useState("");
  const [editExp, setEditExp]                 = useState("");
  const [editCategories, setEditCategories]   = useState<string[]>([]);
  const [editPlatform, setEditPlatform]       = useState("");
  const [editPlatformCats, setEditPlatformCats] = useState<PlatformCategories>({ smartstore: [], coupang: [] });

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/user/history").then((r) => r.json()),
    ]).then(([profileData, historyData]) => {
      if (profileData.user) {
        setUser(profileData.user);
        setEditName(profileData.user.name ?? "");
        setEditExp(profileData.user.selling_experience ?? "");
        setEditCategories(profileData.user.main_categories ?? []);
        setEditPlatform(profileData.user.main_platform ?? "");
        setEditPlatformCats(profileData.user.platform_categories ?? { smartstore: [], coupang: [] });
      }
      if (historyData.history) setHistory(historyData.history);
      setLoading(false);
    });
  }, []);

  function toggleEditCategory(code: string) {
    setEditCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName || null,
        selling_experience: editExp || null,
        main_categories: editCategories,
        main_platform: editPlatform || null,
        platform_categories: editPlatformCats,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setUser((prev) => prev ? {
        ...prev,
        name: editName || null,
        selling_experience: editExp || null,
        main_categories: editCategories,
        main_platform: editPlatform || null,
      } : prev);
      setEditing(false);
      setSaveMsg("저장됐어요!");
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-32" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-60 bg-gray-100 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/">
          <span
            className="text-2xl font-black"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            쿠랭크
          </span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          로그아웃
        </button>
      </div>

      {saveMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 font-medium">
          {saveMsg}
        </div>
      )}

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="프로필" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-black"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                {(user.name ?? user.email)[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-black text-gray-900">{user.name ?? "이름 없음"}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
              {user.oauth_provider && (
                <span className="text-xs text-blue-500">
                  {user.oauth_provider === "google" ? "Google" : "카카오"} 계정
                </span>
              )}
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 font-bold hover:text-blue-700"
            >
              편집
            </button>
          )}
        </div>

        {!editing ? (
          /* 프로필 보기 */
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-400">판매 경험</span>
              <span className="text-sm text-gray-700">
                {user.selling_experience ? EXPERIENCE_LABELS[user.selling_experience] : "미설정"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-400">주력 플랫폼</span>
              <span className="text-sm text-gray-700">
                {user.main_platform ? PLATFORM_LABELS[user.main_platform] : "미설정"}
              </span>
            </div>
            <div className="py-2">
              <span className="text-xs font-bold text-gray-400 block mb-1">관심 카테고리</span>
              <span className="text-[10px] text-gray-300 block mb-2">변경 시 홈 맞춤 피드에 반영됩니다</span>
              {(() => {
                const pc = user.platform_categories as { smartstore?: string[]; coupang?: string[] } | null;
                const ssIds = pc?.smartstore ?? [];
                const cpIds = pc?.coupang ?? [];
                const hasAny = ssIds.length > 0 || cpIds.length > 0;

                if (!hasAny) return <span className="text-sm text-gray-400">미설정</span>;

                return (
                  <div className="space-y-2">
                    {ssIds.length > 0 && (
                      <div>
                        <span className="text-[10px] text-green-600 font-bold">스마트스토어</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {ssIds.map((id) => {
                            const name = getNodeName(id);
                            return name ? (
                              <span key={id} className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                {name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {cpIds.length > 0 && (
                      <div>
                        <span className="text-[10px] text-blue-600 font-bold">쿠팡</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {cpIds.map((id) => {
                            const name = getNodeName(id);
                            return name ? (
                              <span key={id} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-bold text-gray-400">가입일</span>
              <span className="text-sm text-gray-500">
                {new Date(user.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
          </div>
        ) : (
          /* 프로필 편집 */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">이름</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">판매 경험</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditExp(opt.value === editExp ? "" : opt.value)}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      editExp === opt.value
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className="text-[10px] text-gray-400">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">주력 플랫폼</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditPlatform(opt.value === editPlatform ? "" : opt.value)}
                    className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                      editPlatform === opt.value
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">
                관심 카테고리 <span className="text-gray-300 font-normal">(L1 클릭 후 ▼로 세부 선택)</span>
              </label>
              <PlatformCategoryPicker
                platform={editPlatform || "both"}
                initialCategories={editPlatformCats}
                onChange={(cats) => {
                  setEditPlatformCats(cats);
                  setEditCategories([...cats.smartstore, ...cats.coupang]);
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditName(user.name ?? "");
                  setEditExp(user.selling_experience ?? "");
                  setEditCategories(user.main_categories ?? []);
                  setEditPlatform(user.main_platform ?? "");
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 분석 히스토리 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-700">최신기록</p>
          <span className="text-xs text-gray-400">최근 분석한 키워드 ({history.length}/30)</span>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">분석 기록이 없습니다</p>
        ) : (
          <div className="space-y-1">
            {history.map((item) => (
              <Link
                key={item.keyword + item.ts}
                href={`/analyze?keyword=${encodeURIComponent(item.keyword)}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm text-gray-700 font-medium group-hover:text-blue-600">
                  {item.keyword}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(item.ts).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
