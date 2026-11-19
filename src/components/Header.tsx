"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoginMenu, LinkPrompt } from "./LoginButtons";
import { useAuth, DEMO_MODE } from "./AuthProvider";

export function Header() {
  const { user, loading, signOut, error } = useAuth();
  const path = usePathname();
  const tabs: [string, string][] = [["/", "Home"]];
  if (user) tabs.push(["/train", "Training"], ["/mantra", "Mantra"], ["/studio", "Studio"]);
  const tab = ([href, label]: [string, string]) => (
    <Link
      key={href}
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${path === href ? "bg-ink text-paper" : "text-ink-2 hover:bg-card-2 hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <>
      {DEMO_MODE && <div className="bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">Preview mode: sample data stored in this browser only.</div>}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Tintinopedia" width={44} height={44} className="h-11 w-11" />
            <span className="leading-none">
              <span className="font-display block text-xl font-bold uppercase tracking-wide">Tintin</span>
              <span className="block text-[11px] text-muted">My Table Tennis Journal</span>
            </span>
          </Link>
          <nav className="no-scrollbar ml-2 hidden items-center gap-1 overflow-x-auto md:flex">{tabs.map(tab)}</nav>
          <div className="ml-auto flex items-center gap-2">
            {loading ? null : user ? (
              <>
                {user.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photo} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-table text-sm font-semibold text-white">T</span>
                )}
                <button onClick={signOut} className="btn btn-ghost !px-3 !py-1.5">
                  Sign out
                </button>
              </>
            ) : (
              <LoginMenu />
            )}
          </div>
        </div>
        {tabs.length > 1 && <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">{tabs.map(tab)}</nav>}
        {error && (
          <div className="bg-bad-soft px-4 py-2 text-center text-sm text-bad">
            {error}
            <LinkPrompt />
          </div>
        )}
      </header>
    </>
  );
}
