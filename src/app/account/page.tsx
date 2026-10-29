import Link from "next/link";

export const metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-[1440px] flex-col justify-center px-6 py-20">
      <p className="text-xs uppercase tracking-[0.22em] text-ink/50">Account</p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Sign in is coming</h1>
      <p className="mt-4 max-w-md text-ink/70">
        You can still add pieces to a cart on this browser. Accounts arrive with checkout.
      </p>
      <Link href="/shop" className="mt-8 w-fit rounded-full bg-ink px-6 py-3 text-sm text-white">
        Continue shopping
      </Link>
    </main>
  );
}
