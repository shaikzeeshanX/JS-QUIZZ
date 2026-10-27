export default function Marquee({ items }: { items: string[] }) {
  const line = items.map((t) => `${t} ★`).join("  ");
  return (
    <div className="marquee" aria-hidden="true">
      <div className="track">
        <span>{line}</span>
        <span>{line}</span>
      </div>
    </div>
  );
}
