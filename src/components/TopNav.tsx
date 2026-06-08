import Link from "next/link";

interface TopNavProps {
  email: string;
}

export function TopNav({ email }: TopNavProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
      <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-zinc-900">
        Docs
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-500">{email}</span>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
