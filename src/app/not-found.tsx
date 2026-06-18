import Link from "next/link";

export default function NotFound() {
  return (
    <main className="systemErrorShell">
      <section className="systemErrorPanel" aria-label="페이지를 찾을 수 없음">
        <span className="eyebrow">404</span>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <p>요청한 주소가 변경됐거나 접근할 수 없는 경로입니다.</p>
        <div className="systemErrorActions">
          <Link href="/login">로그인으로 이동</Link>
          <Link href="/manual">매뉴얼 보기</Link>
        </div>
      </section>
    </main>
  );
}
