import Link from "next/link"

export function AuthBrandBar() {
  return (
    <header className="fixed top-0 z-50 w-full bg-[#f9f9f7]/80 px-6 py-6 backdrop-blur-xl md:px-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="font-manrope text-xl font-bold tracking-tighter text-primary"
        >
          Astro
        </Link>
        {/* BOUNDARY: auth-redesign-v1 ships a brand-only auth bar with no nav or marketing links. */}
        <span className="font-manrope hidden text-sm font-medium tracking-wide text-muted-foreground md:block">
          Manage your bookings with ease
        </span>
      </div>
    </header>
  )
}
