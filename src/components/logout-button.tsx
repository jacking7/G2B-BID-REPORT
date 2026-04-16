"use client";

import { useFormStatus } from "react-dom";

type LogoutButtonProps = {
  action: () => Promise<void>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="ghostButton" disabled={pending}>
      {pending ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}

export function LogoutButton({ action }: LogoutButtonProps) {
  return (
    <form action={action}>
      <SubmitButton />
    </form>
  );
}
