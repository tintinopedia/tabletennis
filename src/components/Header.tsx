"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, DEMO_MODE } from "./AuthProvider";

export function Header() {
  const { user, loading, signIn, signOut, error } = useAuth();
  const path = usePathname();
  const router = useRouter();
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
              <button
                onClick={async () => {
                  await signIn();
                  router.push("/train");
                }}
                className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink-2"
              >
                <GoogleG /> Login
              </button>
            )}
          </div>
        </div>
        {tabs.length > 1 && <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">{tabs.map(tab)}</nav>}
        {error && <div className="bg-bad-soft px-4 py-2 text-center text-sm text-bad">{error}</div>}
      </header>
    </>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
