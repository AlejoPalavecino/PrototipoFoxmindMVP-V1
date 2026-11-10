import type { FormEvent } from 'react';

export type AccountSubmit = (path: string, success: string, method?: string) => (event: FormEvent<HTMLFormElement>) => void;
