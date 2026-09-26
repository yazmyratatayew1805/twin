import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE } from "@/lib/profile";

// Вход в режим проверки пары: запоминаем намерение, чтобы после анкеты вести
// сразу к коду, а не в общую выдачу. then — только из белого списка.
const ALLOWED = new Set(["/pair", "/quiz"]);

export function GET(request: NextRequest) {
  const then = request.nextUrl.searchParams.get("then") ?? "/pair";
  const response = NextResponse.redirect(new URL(ALLOWED.has(then) ? then : "/pair", request.url));
  response.cookies.set(NEXT_COOKIE, "pair", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return response;
}
