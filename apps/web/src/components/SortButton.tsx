interface Props {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function SortButton({ active, onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition-colors ${
        active ? 'bg-accent-purple text-white' : 'text-white/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
