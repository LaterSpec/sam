import type { CSSProperties } from "react";

type SamBrandIconProps = {
  color?: string;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
};

const SAM_BRAND_MASK_SRC = "/icons/sam_logo.png";

export function SamBrandIcon({
  color = "currentColor",
  size = 27,
  className,
  style,
}: SamBrandIconProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      aria-hidden="true"
      className={`sam-brand-icon${className ? ` ${className}` : ""}`}
      style={{
        width: dimension,
        height: dimension,
        flex: "0 0 auto",
        display: "inline-grid",
        placeItems: "center",
        backgroundColor: color,
        WebkitMaskImage: `url(${JSON.stringify(SAM_BRAND_MASK_SRC)})`,
        maskImage: `url(${JSON.stringify(SAM_BRAND_MASK_SRC)})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
    />
  );
}
