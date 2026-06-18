import { z } from "zod";

export const passwordPolicyMessage =
  "비밀번호는 12자 이상이며 영문 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다.";

export function isStrongPassword(value: string) {
  return (
    value.length >= 12 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export const strongPasswordSchema = z.string().superRefine((value, context) => {
  if (!isStrongPassword(value)) {
    context.addIssue({
      code: "custom",
      message: passwordPolicyMessage,
    });
  }
});
