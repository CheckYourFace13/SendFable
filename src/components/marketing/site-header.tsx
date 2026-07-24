"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; description?: string };

type NavItem =
  | { type: "link"; label: string; href: string }
  | { type: "menu"; label: string; items: NavLink[]; columns?: 2 };

const PRODUCT_LINKS: NavLink[] = [
  {
    href: "/features#campaigns",
    label: "Email campaigns",
    description: "Plan, schedule, and send stories that feel personal.",
  },
  {
    href: "/features#audience",
    label: "Audience",
    description: "Lists, tags, segments, and clean imports.",
  },
  {
    href: "/features#builder",
    label: "Email builder",
    description: "Drag-and-drop blocks that survive every inbox.",
  },
  {
    href: "/features#forms",
    label: "Forms",
    description: "Hosted signup forms with double opt-in.",
  },
  {
    href: "/features#analytics",
    label: "Analytics",
    description: "Opens, clicks, bounces, and list health.",
  },
  {
    href: "/deliverability",
    label: "Deliverability",
    description: "SES delivery and From-rewrite for strict mailboxes.",
  },
];

const SOLUTION_LINKS: NavLink[] = [
  { href: "/solutions/restaurants", label: "Restaurants" },
  { href: "/solutions/breweries", label: "Breweries" },
  { href: "/solutions/real-estate", label: "Real estate" },
  { href: "/solutions/retail", label: "Retail" },
  { href: "/solutions/nonprofits", label: "Nonprofits" },
  { href: "/solutions/local-events", label: "Local events" },
];

const RESOURCE_LINKS: NavLink[] = [
  { href: "/email-marketing-guide", label: "Email marketing guide" },
  { href: "/deliverability", label: "Deliverability" },
  { href: "/migrate", label: "Migrate to Sendfable" },
  { href: "/changelog", label: "Changelog" },
  { href: "/resources", label: "Resources hub" },
];

const COMPARE_LINKS: NavLink[] = [
  { href: "/compare/mailchimp", label: "vs Mailchimp" },
  { href: "/compare/constant-contact", label: "vs Constant Contact" },
  { href: "/compare/brevo", label: "vs Brevo" },
  { href: "/compare/mailerlite", label: "vs MailerLite" },
  { href: "/compare/kit", label: "vs Kit" },
  { href: "/compare/beehiiv", label: "vs beehiiv" },
];

const NAV: NavItem[] = [
  { type: "menu", label: "Product", items: PRODUCT_LINKS, columns: 2 },
  { type: "menu", label: "Solutions", items: SOLUTION_LINKS, columns: 2 },
  { type: "link", label: "Templates", href: "/templates" },
  { type: "link", label: "Pricing", href: "/pricing" },
  { type: "menu", label: "Resources", items: RESOURCE_LINKS },
  { type: "menu", label: "Compare", items: COMPARE_LINKS, columns: 2 },
];

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseId = useId();

  const closeMenus = useCallback(() => {
    setOpenMenu(null);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileSection(null);
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!headerRef.current?.contains(e.target as Node)) {
        closeMenus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [closeMenus]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mobileOpen) {
          e.preventDefault();
          closeMobile();
          return;
        }
        if (openMenu) {
          e.preventDefault();
          const btn = menuButtonRefs.current[openMenu];
          closeMenus();
          btn?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeMenus, closeMobile, mobileOpen, openMenu]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = mobilePanelRef.current;
    const focusables = panel ? getFocusable(panel) : [];
    focusables[0]?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!openMenu || !menuPanelRef.current) return;
    const links = getFocusable(menuPanelRef.current);
    links[0]?.focus();
  }, [openMenu]);

  function onMenuButtonKeyDown(label: string, e: ReactKeyboardEvent<HTMLButtonElement>) {
    const item = NAV.find((n) => n.type === "menu" && n.label === label);
    if (!item || item.type !== "menu") return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpenMenu(label);
    } else if (e.key === "ArrowUp" && openMenu === label) {
      e.preventDefault();
      closeMenus();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const menus = NAV.filter((n) => n.type === "menu");
      const idx = menus.findIndex((n) => n.label === label);
      if (idx < 0) return;
      const next =
        e.key === "ArrowRight"
          ? menus[(idx + 1) % menus.length]
          : menus[(idx - 1 + menus.length) % menus.length];
      e.preventDefault();
      setOpenMenu(next.label);
      menuButtonRefs.current[next.label]?.focus();
    }
  }

  function onMenuPanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!menuPanelRef.current || !openMenu) return;
    const focusables = getFocusable(menuPanelRef.current);
    if (!focusables.length) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = focusables.indexOf(current as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusables[(idx + 1 + focusables.length) % focusables.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (idx <= 0) {
        menuButtonRefs.current[openMenu]?.focus();
        return;
      }
      focusables[idx - 1]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      focusables[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      focusables[focusables.length - 1]?.focus();
    } else if (e.key === "Tab") {
      // Light focus trap: cycle within the open menu panel.
      if (e.shiftKey && (idx <= 0 || current === menuButtonRefs.current[openMenu])) {
        e.preventDefault();
        focusables[focusables.length - 1]?.focus();
      } else if (!e.shiftKey && idx === focusables.length - 1) {
        e.preventDefault();
        menuButtonRefs.current[openMenu]?.focus();
      }
    }
  }

  function onMobilePanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!mobilePanelRef.current || e.key !== "Tab") return;
    const focusables = getFocusable(mobilePanelRef.current);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-ink/10 bg-parchment/90 backdrop-blur-md supports-[backdrop-filter]:bg-parchment/80"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo variant="lockup" className="h-8 w-auto max-w-[9.5rem] sm:max-w-none" />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            if (item.type === "link") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-ink/80 transition hover:bg-page hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                >
                  {item.label}
                </Link>
              );
            }

            const expanded = openMenu === item.label;
            const panelId = `${baseId}-${item.label.toLowerCase()}-panel`;
            const buttonId = `${baseId}-${item.label.toLowerCase()}-button`;

            return (
              <div key={item.label} className="relative">
                <button
                  id={buttonId}
                  ref={(el) => {
                    menuButtonRefs.current[item.label] = el;
                  }}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                    expanded
                      ? "bg-page text-ink"
                      : "text-ink/80 hover:bg-page hover:text-ink"
                  )}
                  aria-expanded={expanded}
                  aria-haspopup="true"
                  aria-controls={panelId}
                  onClick={() => setOpenMenu(expanded ? null : item.label)}
                  onKeyDown={(e) => onMenuButtonKeyDown(item.label, e)}
                >
                  {item.label}
                  <ChevronDown
                    className={cn("h-4 w-4 transition", expanded && "rotate-180")}
                    aria-hidden
                  />
                </button>

                {expanded && (
                  <div
                    ref={menuPanelRef}
                    id={panelId}
                    role="menu"
                    aria-labelledby={buttonId}
                    className="absolute left-0 top-full z-50 mt-2 min-w-[18rem] rounded-xl border border-ink/10 bg-page p-2 shadow-lg shadow-ink/10"
                    onKeyDown={onMenuPanelKeyDown}
                  >
                    <div
                      className={cn(
                        "grid gap-1",
                        item.columns === 2 && "min-w-[28rem] sm:grid-cols-2"
                      )}
                    >
                      {item.items.map((link) => (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          role="menuitem"
                          className="rounded-lg px-3 py-2.5 text-left transition hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                          onClick={closeMenus}
                        >
                          <span className="block text-sm font-medium text-ink">
                            {link.label}
                          </span>
                          {link.description ? (
                            <span className="mt-0.5 block text-xs text-ink/60">
                              {link.description}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-11 items-center rounded-md px-3 text-sm font-medium text-ink/80 transition hover:text-ink lg:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="hidden min-h-11 items-center justify-center rounded-md bg-coral-solid px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-coral-hover lg:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
          >
            Start writing free
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink transition hover:bg-parchment lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
            aria-expanded={mobileOpen}
            aria-controls={`${baseId}-mobile-panel`}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => (mobileOpen ? closeMobile() : setMobileOpen(true))}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

    </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div
            ref={mobilePanelRef}
            id={`${baseId}-mobile-panel`}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-page shadow-xl"
            onKeyDown={onMobilePanelKeyDown}
          >
            <div className="flex h-16 items-center justify-between border-b border-ink/10 px-4">
              <Logo variant="wordmark" className="h-7 w-auto" />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                aria-label="Close menu"
                onClick={closeMobile}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile primary">
              <ul className="space-y-1">
                {NAV.map((item) => {
                  if (item.type === "link") {
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-ink hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                          onClick={closeMobile}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  }

                  const open = mobileSection === item.label;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-base font-medium text-ink hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                        aria-expanded={open}
                        onClick={() => setMobileSection(open ? null : item.label)}
                      >
                        {item.label}
                        <ChevronDown
                          className={cn("h-4 w-4 transition", open && "rotate-180")}
                          aria-hidden
                        />
                      </button>
                      {open && (
                        <ul className="mb-2 ml-2 space-y-1 border-l border-ink/10 pl-3">
                          {item.items.map((link) => (
                            <li key={link.href + link.label}>
                              <Link
                                href={link.href}
                                className="flex min-h-11 items-center rounded-lg px-3 text-sm text-ink/80 hover:bg-parchment hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                                onClick={closeMobile}
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="space-y-2 border-t border-ink/10 p-4">
              <Link
                href="/login"
                className="flex min-h-11 items-center justify-center rounded-md border border-ink/15 text-sm font-medium text-ink hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                onClick={closeMobile}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="flex min-h-11 items-center justify-center rounded-md bg-coral-solid text-sm font-semibold text-white hover:bg-coral-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
                onClick={closeMobile}
              >
                Start writing free
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
