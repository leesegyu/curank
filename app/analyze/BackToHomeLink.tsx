"use client";

export default function BackToHomeLink() {
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "/";
        }
      }}
      className="cursor-pointer"
    >
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
    </button>
  );
}
