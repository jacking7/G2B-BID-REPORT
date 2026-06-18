"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="systemErrorShell">
      <section className="systemErrorPanel" aria-label="오류 발생">
        <span className="eyebrow">500</span>
        <h1>요청을 처리하지 못했습니다.</h1>
        <p>일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
        <div className="systemErrorActions">
          <button type="button" onClick={() => unstable_retry()}>
            다시 시도
          </button>
          <Link href="/login">로그인으로 이동</Link>
        </div>
      </section>
    </main>
  );
}
