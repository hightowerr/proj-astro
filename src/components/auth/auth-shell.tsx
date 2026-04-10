import Image from "next/image"
import { AuthBrandBar } from "@/components/auth/auth-brand-bar"

type AuthShellProps = {
  heroHeadline: string
  heroBody: string
  formTitle: string
  formSubtitle: string
  children: React.ReactNode
}

export function AuthShell({
  heroHeadline,
  heroBody,
  formTitle,
  formSubtitle,
  children,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col font-manrope md:flex-row">
      <AuthBrandBar />

      <div className="relative hidden overflow-hidden md:flex md:w-1/2 lg:w-3/5">
        <Image
          src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1920&q=80"
          alt="Hairstylist working in a bright salon"
          fill
          className="object-cover opacity-90 mix-blend-multiply grayscale-[20%]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 z-10 p-8 lg:p-12">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-primary-foreground lg:text-7xl">
            {heroHeadline}
          </h1>
          <p className="max-w-md text-lg leading-relaxed font-light text-primary-foreground opacity-90 lg:text-xl">
            {heroBody}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-8 pt-24 md:w-1/2 md:p-12 lg:w-2/5 lg:p-20">
        <div className="w-full max-w-sm">
          <h2 className="mb-2 text-3xl font-bold text-primary">{formTitle}</h2>
          <p className="mb-8 text-muted-foreground">{formSubtitle}</p>
          {/* BOUNDARY: auth-redesign-v1 rewires the shared shell only; Atelier input/button token pass ships in V2. */}
          {children}
        </div>
      </div>
    </div>
  )
}
