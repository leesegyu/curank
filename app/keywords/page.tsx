import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ keyword?: string; platform?: string }>;
}

/** /keywords는 더 이상 사용하지 않음 → 분석 페이지로 리다이렉트 */
export default async function KeywordsRedirect({ searchParams }: PageProps) {
  const { keyword, platform } = await searchParams;
  const kw = keyword?.trim();
  if (kw) {
    redirect(`/analyze?keyword=${encodeURIComponent(kw)}&platform=${platform ?? "naver"}`);
  }
  redirect("/");
}
