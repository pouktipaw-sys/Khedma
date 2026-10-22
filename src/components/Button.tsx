import { useRef } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';
import { useMagnetic } from '../hooks/useMagnetic';

interface Props {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'bracket';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  external?: boolean;
  download?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  magnetic?: boolean;
  className?: string;
  title?: string;
  'aria-label'?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}

const base =
  'inline-flex items-center justify-center gap-2 font-mono font-medium uppercase tracking-[0.12em] select-none whitespace-nowrap transition-[background,color,border-color,box-shadow] duration-200 will-change-transform';
const sizes = {
  sm: 'text-[11px] px-3 py-2 rounded-md',
  md: 'text-xs px-4 py-3 rounded-lg',
  lg: 'text-sm px-6 py-4 rounded-xl',
};
const variants = {
  primary:
    'bg-accent text-bg hover:shadow-[0_0_0_4px_var(--accent-glow),0_10px_40px_-8px_rgba(163,255,18,0.55)] font-semibold',
  ghost: 'border border-white/15 text-ink hover:border-accent hover:text-accent bg-white/[0.02]',
  bracket: 'text-ink hover:text-accent border border-transparent',
};

/** Link or button with an optional magnetic hover. Renders an <a> whenever `href` is set. */
export function Button({
  children,
  variant = 'ghost',
  size = 'md',
  href,
  external,
  download,
  onClick,
  magnetic = true,
  className = '',
  ...rest
}: Props) {
  const ref = useRef<HTMLElement>(null);
  useMagnetic(ref as React.RefObject<HTMLElement>, magnetic ? 0.28 : 0);
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={cls}
        onClick={onClick}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...(download ? { download } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <button ref={ref as React.RefObject<HTMLButtonElement>} type="button" className={cls} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
