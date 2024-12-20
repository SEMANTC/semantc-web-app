// components/footer-text.tsx
import React from 'react';

import { cn } from '@/lib/utils';
import { ExternalLink } from '@/components/external-link';

export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-zinc-500 font-manrope',
        className
      )}
      {...props}
    >
      AI Assistant built with{' '}
      <ExternalLink href="https://semantc.com">Semantc Technology</ExternalLink>
    </p>
  );
}