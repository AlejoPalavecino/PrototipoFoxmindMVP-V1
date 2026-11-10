import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../class-names.ts';

const buttonVariants = cva('button inline-flex items-center justify-center disabled:cursor-not-allowed', {
  variants: { variant: { default: 'button-primary', outline: 'button-outline', ghost: 'button-ghost' } },
  defaultVariants: { variant: 'default' },
});
export function Button({ className, variant, type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
