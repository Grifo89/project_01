interface AvatarProps {
  displayName: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xs' | 'xl';
  className?: string;
}

export const Avatar = ({ displayName, photoUrl, size = 'md', className = "" }: AvatarProps) => {
  const sizes = {
    xs: "size-5 text-[8px]",
    sm: "size-6 text-[10px]",
    md: "size-8 text-xs",
    lg: "size-10 text-sm",
    xl: "size-20 text-2xl"
  };

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${sizes[size]} rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-primary flex items-center justify-center font-bold text-white shadow-sm ${className}`}>
      {photoUrl ? (
        <img src={photoUrl} alt={displayName} className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
