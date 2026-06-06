"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { googleLogin } from "../../features/auth/authSlice";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const decodeGoogleCredential = (credential: string) => {
  const [, payload] = credential.split(".");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(window.atob(normalized)) as {
    email?: string;
    name?: string;
    sub?: string;
  };
};

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const { isAuthenticated, status } = useAppSelector((state) => state.auth);
  const isSubmitting = status === "loading";
  const redirectTo = searchParams.get("from") || "/dashboard";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (!response.credential) {
            setAuthError("Google did not return an account credential.");
            return;
          }

          const profile = decodeGoogleCredential(response.credential);
          if (!profile.email) {
            setAuthError("Google account email is required.");
            return;
          }

          dispatch(
            googleLogin({
              email: profile.email,
              name: profile.name,
              googleId: profile.sub,
            })
          );
        },
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [dispatch, googleClientId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setAuthError("");
    if (!email.trim()) {
      setAuthError("Enter the email from your Google account.");
      return;
    }
    dispatch(googleLogin({ email: email.trim() }));
  };

  const handleGooglePrompt = () => {
    if (isSubmitting) return;
    setAuthError("");
    window.google?.accounts?.id?.prompt();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-dark-panel p-8 rounded border border-dark-border w-96">
        <h2 className="text-xl font-bold mb-4 text-text-light">
          Continue with Google
        </h2>
        {googleClientId && (
          <button
            type="button"
            onClick={handleGooglePrompt}
            disabled={isSubmitting}
            className="mb-4 w-full rounded border border-dark-border bg-dark-bg px-4 py-3 text-sm font-semibold text-text-light transition-colors hover:border-brand-green disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : "Use Google Account"}
          </button>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full p-2 bg-dark-bg border border-dark-border text-text-light rounded"
            placeholder="Google email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            disabled={isSubmitting}
            className="w-full bg-brand-green text-dark-bg font-bold py-2 rounded disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : "Continue"}
          </button>
        </form>
        {authError && <p className="mt-4 text-xs text-brand-red">{authError}</p>}
        <p className="mt-4 text-xs leading-5 text-text-muted">
          MetaMask connection is required after login before starter tokens are credited.
        </p>
      </div>
    </div>
  );
};

export default Login;
