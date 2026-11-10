import * as React from 'react';
import { cn } from '../class-names.ts';
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('field-label block', className)} {...props} />;
}
