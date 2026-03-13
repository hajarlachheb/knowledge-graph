import Link from "next/link";

interface Props {
  tag: { id?: number; name: string; rex_count?: number };
  showCount?: boolean;
}

export default function TagBadge({ tag, showCount }: Props) {
  return (
    <Link
      href={`/feed?tag=${encodeURIComponent(tag.name)}`}
      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
    >
      {tag.name}
      {showCount && tag.rex_count != null && (
        <span className="text-brand-400">({tag.rex_count})</span>
      )}
    </Link>
  );
}
