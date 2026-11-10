import * as React from 'react';
import { cn } from '../class-names.ts';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input block w-full', className)} {...props} />;
});
