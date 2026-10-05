'use client';
import { useState } from 'react';

/** Copies the address and says so for two seconds. */
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard refused: the mailto link stays */ }
  };
  return (
    <button type="button" onClick={copy} className="pill px-5 py-3 text-[15px] font-semibold">
      <span aria-live="polite">{copied ? 'Email copied' : 'Copy email'}</span>
    </button>
  );
}
