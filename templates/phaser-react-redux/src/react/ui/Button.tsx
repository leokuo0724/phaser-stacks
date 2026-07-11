import { ButtonHTMLAttributes, MouseEvent } from "react";

import { playUiClick } from "~/shared/audio/sfx";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className,
  onClick,
  ...rest
}: ButtonProps) {
  const cls = ["btn", `btn--${variant}`, className].filter(Boolean).join(" ");

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    playUiClick(); // the click is a user gesture — also what unlocks audio on first use
    onClick?.(event);
  };

  return (
    <button
      className={cls}
      onClick={handleClick}
      data-xray-label="Button"
      {...rest}
    />
  );
}
