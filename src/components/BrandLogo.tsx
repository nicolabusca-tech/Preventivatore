import Image from "next/image";

export function BrandLogo({
  className,
  size = "md",
  priority,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}) {
  const height = size === "sm" ? 22 : size === "lg" ? 34 : 28;

  return (
    <span className={["mc-brand-logo", className].filter(Boolean).join(" ")} aria-label="Metodo Cantiere">
      <Image
        src="/brand/metodo-cantiere-light.png"
        alt="Metodo Cantiere"
        width={220}
        height={height}
        className="mc-brand-logo__light"
        priority={priority}
      />
      <Image
        src="/brand/metodo-cantiere-dark.png"
        alt="Metodo Cantiere"
        width={220}
        height={height}
        className="mc-brand-logo__dark"
        priority={priority}
      />
    </span>
  );
}

