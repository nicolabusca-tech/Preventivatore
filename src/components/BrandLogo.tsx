import Image from "next/image";

export function BrandLogo({
  className,
  size = "md",
  priority,
  variant = "auto",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  variant?: "auto" | "always-dark";
}) {
  const height = size === "sm" ? 22 : size === "lg" ? 34 : 28;

  return (
    <span
      className={["mc-brand-logo", className].filter(Boolean).join(" ")}
      aria-label="Metodo Cantiere"
      style={{ ["--mc-logo-h" as any]: `${height}px` }}
    >
      {variant === "always-dark" ? (
        <Image
          src="/brand/metodo-cantiere-navbar-transparent-v2.png"
          alt="Metodo Cantiere"
          width={220}
          height={height}
          priority={priority}
          style={{ height: "100%", width: "auto" }}
        />
      ) : (
        <>
          <img
            src="/brand/metodo-cantiere-light.svg"
            alt="Metodo Cantiere"
            width={220}
            height={height}
            className="mc-brand-logo__light"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            style={{ height: "100%", width: "auto" }}
          />
          <Image
            src="/brand/metodo-cantiere-dark.png"
            alt="Metodo Cantiere"
            width={220}
            height={height}
            className="mc-brand-logo__dark"
            priority={priority}
            style={{ height: "100%", width: "auto" }}
          />
        </>
      )}
    </span>
  );
}

