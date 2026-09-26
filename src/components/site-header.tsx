import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-4">
      <Link href="/" className="font-heading text-xl font-bold tracking-tight">
        TWIN
      </Link>
      <div className="flex items-center gap-1">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
