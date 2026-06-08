import Link from "next/link";

interface TopNavProps {
  email: string;
}

export function TopNav({ email }: TopNavProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-6 py-3 backdrop-blur-sm">
      <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold tracking-tight text-indigo-600 hover:text-indigo-700">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        Docs
      </Link>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {email.charAt(0).toUpperCase()}
          </div>
          <span className="hidden text-sm text-zinc-500 sm:block">{email}</span>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
