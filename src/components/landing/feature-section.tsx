import type { ReactNode } from "react";
import Image from "next/image";

type FeatureSectionProps = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition: "left" | "right";
  children: ReactNode;
};

export function FeatureSection({
  title,
  description,
  imageSrc,
  imageAlt,
  imagePosition,
  children,
}: FeatureSectionProps) {
  const imageOrderClass = imagePosition === "left" ? "lg:order-1" : "lg:order-2";
  const textOrderClass = imagePosition === "left" ? "lg:order-2" : "lg:order-1";

  return (
    <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl ${imageOrderClass}`}>
        <Image src={imageSrc} alt={imageAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        {children}
      </div>

      <div className={textOrderClass}>
        <h3 className="mb-4 text-3xl font-bold text-white">{title}</h3>
        <p className="text-base leading-relaxed text-text-muted">{description}</p>
      </div>
    </div>
  );
}
