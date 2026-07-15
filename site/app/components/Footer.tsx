export function Footer({ note = "one JSON, one video" }: { note?: string }) {
  return (
    <footer className="foot wrap">
      <span>
        © 2026 Vawe ·{" "}
        <a href="https://github.com/Vandit1604/vawe/blob/main/LICENSE">Vawe Company License</a> · free for teams ≤ 3
      </span>
      <span className="mono">{note}</span>
    </footer>
  );
}
