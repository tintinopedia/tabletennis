"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoginMenu, LinkPrompt } from "./LoginButtons";
import { useAuth, DEMO_MODE } from "./AuthProvider";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/* ------------------------------ icons ------------------------------ */
const I = ({ children }: { children: ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const ICONS: Record<string, ReactNode> = {
  "/": (
    <I>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </I>
  ),
  "/train": (
    <I>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13 13 6.5 6.5" />
      <circle cx="18.5" cy="5.5" r="2" />
    </I>
  ),
  "/blog": (
    <I>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </I>
  ),
  "/mantra": (
    <I>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </I>
  ),
  "/studio": (
    <I>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </I>
  ),
};

export function Header() {
  const { user, loading, signOut, error } = useAuth();
  const path = usePathname();
  const tabs: [string, string][] = [["/", "Home"], ["/blog", "Blog"]];
  if (user) tabs.push(["/train", "Training"], ["/mantra", "Mantra"], ["/studio", "Studio"]);
  const tab = ([href, label]: [string, string]) => (
    <Link
      key={href}
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${isActive(path, href) ? "bg-ink text-paper" : "text-ink-2 hover:bg-card-2 hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <>
      {DEMO_MODE && <div className="bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">Preview mode: sample data stored in this browser only.</div>}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6 md:py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Tintinopedia" width={44} height={44} className="h-9 w-9 md:h-11 md:w-11" />
            <span className="leading-none">
              <span className="font-display block text-lg font-bold uppercase tracking-wide md:text-xl">Tintin</span>
              <span className="block text-[11px] text-muted">My Table Tennis Journal</span>
            </span>
          </Link>
          <nav className="no-scrollbar ml-2 hidden items-center gap-1 overflow-x-auto md:flex">{tabs.map(tab)}</nav>
          <div className="ml-auto flex items-center gap-2">
            {loading ? null : user ? (
              <>
                <span className="hidden items-center gap-2 md:flex">
                  <Avatar photo={user.photo} />
                  <button onClick={signOut} className="btn btn-ghost !px-3 !py-1.5">
                    Sign out
                  </button>
                </span>
                <span className="md:hidden">
                  <AccountMenu photo={user.photo} name={user.name} onSignOut={signOut} />
                </span>
              </>
            ) : (
              <LoginMenu />
            )}
          </div>
        </div>
        {error && (
          <div className="bg-bad-soft px-4 py-2 text-center text-sm text-bad">
            {error}
            <LinkPrompt />
          </div>
        )}
      </header>
      <BottomNav tabs={tabs} path={path} />
    </>
  );
}

function Avatar({ photo }: { photo: string | null }) {
  return photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-table text-sm font-semibold text-white">T</span>
  );
}

function AccountMenu({ photo, name, onSignOut }: { photo: string | null; name: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Account" aria-expanded={open} className="rounded-full ring-2 ring-transparent transition active:ring-table">
        <Avatar photo={photo} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-52 rounded-2xl border border-line-2 bg-card p-2 shadow-2xl shadow-black/60">
          <p className="truncate px-3 py-2 text-sm font-semibold">{name}</p>
          <button onClick={onSignOut} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-bad hover:bg-card-2">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** App-style tab bar for phones */
function BottomNav({ tabs, path }: { tabs: [string, string][]; path: string }) {
  const order = ["/", "/train", "/blog", "/mantra", "/studio"];
  const sorted = [...tabs].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main">
      <div className="mx-auto flex max-w-md">
        {sorted.map(([href, label]) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} className={`relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-medium transition ${on ? "text-ink" : "text-muted"}`}>
              {on && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ball" />}
              <span className={on ? "text-ball" : ""}>{ICONS[href]}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
