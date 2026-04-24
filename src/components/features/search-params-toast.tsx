'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRouter, usePathname } from '@/i18n/navigation';

/**
 * Reads `error` / `success` from URL searchParams,
 * fires a toast, then silently strips the params from the URL.
 */
export function SearchParamsToast({
  error,
  success,
  successMessages,
}: {
  error?: string;
  success?: string;
  successMessages: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    if (error) {
      fired.current = true;
      toast.error(error);
      router.replace(pathname, { scroll: false });
    } else if (success && successMessages[success]) {
      fired.current = true;
      toast.success(successMessages[success]);
      router.replace(pathname, { scroll: false });
    }
  }, [error, success, successMessages, router, pathname]);

  return null;
}
