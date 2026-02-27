interface AvatarProps {
  name: string;
  initials?: string | null;
  colour?: string;
  size?: number;
  avatarUrl?: string | null;
}

export function Avatar({ name, initials, colour = '#4186E0', size = 28, avatarUrl }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const displayInitials = initials || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-medium shrink-0"
      style={{ width: size, height: size, backgroundColor: colour, fontSize: size * 0.4 }}
      title={name}
    >
      {displayInitials}
    </div>
  );
}
