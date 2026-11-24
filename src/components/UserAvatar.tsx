import React, { useEffect, useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders a user's uploaded profile photo or a clean, minimalist Instagram-style
 * blank person silhouette inside a dark-gray frame (never initial letters).
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt,
  className = 'w-10 h-10 rounded-full',
  iconClassName = 'w-[58%] h-[58%]',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const cleanSrc = typeof src === 'string' ? src.trim() : '';

  if (cleanSrc && !failed) {
    return (
      <img
        src={cleanSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${className} object-cover bg-zinc-900`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`${className} bg-zinc-800/95 border border-white/10 flex items-center justify-center overflow-hidden select-none text-zinc-400`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className={iconClassName}
      >
        <circle cx="12" cy="8.25" r="4.1" />
        <path d="M4.2 20.4c0-3.85 3.49-6.65 7.8-6.65s7.8 2.8 7.8 6.65c0 .44-.36.8-.8.8H5c-.44 0-.8-.36-.8-.8Z" />
      </svg>
    </div>
  );
};
