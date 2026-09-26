"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Разбирает ссылку из письма и передаёт её серверу (/auth/session), который ставит куки.
// Форматы: #access_token (implicit, встроенная почта Supabase), ?token_hash (свои шаблоны)
// и ?code (PKCE, если ссылку открыли в том же браузере).
function credentialsFromUrl() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) return { access_token: accessToken, refresh_token: refreshToken };

  const tokenHash = query.get("token_hash");
  if (tokenHash) return { token_hash: tokenHash };

  const code = query.get("code");
  if (code) return { code };

  return null;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Ссылка одноразовая: не обрабатываем её второй раз (StrictMode вызывает эффект дважды).
    if (started.current) return;
    started.current = true;

    const credentials = credentialsFromUrl();
    // Убираем токены из адресной строки, чтобы они не попали в историю и скриншоты.
    window.history.replaceState(null, "", window.location.pathname);

    const request = credentials
      ? fetch("/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        })
      : Promise.reject(new Error("no credentials in url"));

    request
      .then((res) => {
        if (!res.ok) throw new Error("sign-in failed");
        router.replace("/profile");
        router.refresh();
      })
      .catch(() => setFailed(true));
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      {failed ? (
        <>
          <h1 className="text-3xl font-bold">Ссылка не сработала</h1>
          <p className="max-w-sm text-muted-foreground">
            Она могла устареть (живёт 1 час) или уже использована. Запросите новую — это быстро.
          </p>
          <Button asChild size="lg" className="rounded-full">
            <Link href="/login">Получить новую ссылку</Link>
          </Button>
        </>
      ) : (
        <p className="animate-pulse text-lg text-muted-foreground">Открываем ворота в TWIN…</p>
      )}
    </main>
  );
}
