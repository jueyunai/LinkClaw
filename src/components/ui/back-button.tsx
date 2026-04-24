'use client';

import { useRouter } from '@/i18n/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="mb-6 flex size-9 items-center justify-center rounded-full border border-[#c8922a]/25 bg-[#fdf8f0] text-[#8a7060] shadow-sm transition-all hover:border-[#c8922a]/50 hover:bg-[#c8922a]/10 hover:text-[#c8922a] hover:shadow-md active:scale-95 cursor-pointer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
