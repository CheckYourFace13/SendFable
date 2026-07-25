import type { ReactNode } from "react";

export function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-slate-700 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">{title}</h1>
      {children}
    </article>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return <h2 className="pt-6 text-2xl font-semibold text-slate-900">{children}</h2>;
}

export function LegalH3({ children }: { children: ReactNode }) {
  return <h3 className="pt-3 text-lg font-semibold text-slate-900">{children}</h3>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export function LegalA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="underline underline-offset-2 hover:text-slate-900" href={href}>
      {children}
    </a>
  );
}
