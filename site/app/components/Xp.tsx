import type { ReactNode } from "react";
import "./xp.css";

type Link = { href: string; label: string };

// Where you are: a group label, an optional parent link, then the current page. Mirrors breadcrumbSchema.
export function PageTop({ group, parent, current }: { group?: string; parent?: Link; current: string }) {
  return (
    <>
      <div className="xp-progress" aria-hidden="true" />
      <nav className="xp-crumbs meta" aria-label="Breadcrumb">
        {group ? <span>{group}</span> : null}
        {parent ? <a href={parent.href}>{parent.label}</a> : null}
        <span aria-current="page">{current}</span>
      </nav>
    </>
  );
}

// Jump links for a long page: you see the whole shape and reach any part in one click.
export function Toc({ items, label = "On this page" }: { items: Link[]; label?: string }) {
  return (
    <nav className="xp-toc" aria-label={label}>
      {items.map((i) => (
        <a key={i.href} href={i.href}>{i.label}</a>
      ))}
    </nav>
  );
}

// The one ending of every content page: one primary action, one quiet secondary, then a ruled list.
export function Next({
  title,
  lead,
  primary,
  secondary,
  related = [],
}: {
  title: string;
  lead?: ReactNode;
  primary: Link;
  secondary?: Link;
  related?: Link[];
}) {
  return (
    <section className="xp-next">
      <h2>{title}</h2>
      {lead ? <p className="xp-next-lead">{lead}</p> : null}
      <div className="xp-next-act">
        <a className="btn btn-primary" href={primary.href}>
          {primary.label} <span className="arw">→</span>
        </a>
        {secondary ? <a className="btn btn-ghost" href={secondary.href}>{secondary.label}</a> : null}
      </div>
      {related.length ? (
        <ul className="xp-rel">
          {related.map((l) => (
            <li key={l.href}>
              <a href={l.href}>
                <span>{l.label}</span>
                <span className="arw" aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function Sources({ children, count }: { children: ReactNode; count: number }) {
  return (
    <details className="xp-src">
      <summary>Sources ({count})</summary>
      <div className="srcs" aria-label="Sources">{children}</div>
    </details>
  );
}
