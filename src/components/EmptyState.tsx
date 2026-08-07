interface EmptyStateProps {
  emoji: string;
  title: string;
  message: string;
}

export function EmptyState({ emoji, title, message }: EmptyStateProps) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-14 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="text-[16px] font-bold">{title}</p>
      <p className="max-w-[36ch] text-[14px] leading-snug text-muted">{message}</p>
    </div>
  );
}
