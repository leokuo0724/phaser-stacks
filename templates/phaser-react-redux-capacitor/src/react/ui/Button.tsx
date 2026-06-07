import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className,
  ...rest
}: ButtonProps) {
  const cls = ["btn", `btn--${variant}`, className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
