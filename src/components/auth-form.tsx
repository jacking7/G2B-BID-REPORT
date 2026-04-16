"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

type AuthFormProps = {
  title: string;
  description: string;
  action: (
    state: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  submitLabel: string;
  fields: Array<{
    name: "name" | "email" | "password";
    label: string;
    type: string;
    placeholder: string;
  }>;
};

const initialState: AuthActionState = {};

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  fields,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="authForm">
      <div className="authHeader">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="fieldGroup">
        {fields.map((field) => (
          <label key={field.name} className="field">
            <span>{field.label}</span>
            <input
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              required
              minLength={field.name === "password" ? 8 : undefined}
            />
            {state.errors?.[field.name] ? (
              <small className="errorText">{state.errors[field.name]?.[0]}</small>
            ) : null}
          </label>
        ))}
      </div>

      {state.message ? <p className="formMessage">{state.message}</p> : null}

      <button className="primaryButton" type="submit" disabled={pending}>
        {pending ? "처리 중..." : submitLabel}
      </button>
    </form>
  );
}
