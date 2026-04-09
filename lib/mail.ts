import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "쿠랭크 <onboarding@resend.dev>";

/**
 * 이메일 인증 메일 발송
 * Resend 무료 플랜: 100건/일, 3,000건/월
 */
export async function sendVerificationEmail(to: string, token: string) {
  const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "[쿠랭크] 이메일 인증을 완료해주세요",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <div style="text-align:center;padding:32px 0 16px">
          <span style="font-size:28px;font-weight:900;background:linear-gradient(135deg,#3b82f6,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent">쿠랭크</span>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111">이메일 인증</h2>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
            아래 버튼을 클릭하면 이메일 인증이 완료되고<br/>쿠랭크 서비스를 이용하실 수 있습니다.
          </p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700">
            이메일 인증하기
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
            이 링크는 24시간 동안 유효합니다.<br/>
            본인이 가입하지 않으셨다면 이 메일을 무시해주세요.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("[mail] sendVerificationEmail failed:", error);
    throw new Error("이메일 발송에 실패했습니다");
  }
}
