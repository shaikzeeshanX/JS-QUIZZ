import { motion } from "framer-motion";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

/**
 * SLAM BUTTON — the site's one-and-only action button.
 * A brutal coral block with an ink offset shadow, marching diagonal
 * stripes and a sweeping sheen. Stamps down when you hit it.
 * (Replaces the old WebGL venom effect — same slot, on-theme colors.)
 */
export default function SlamButton({
  label,
  onClick,
  size = 56,
  font,
  disabled = false,
  width,
}: {
  label: string;
  onClick?: () => void;
  /** roughly the button height in px */
  size?: number;
  font?: CSSProperties;
  disabled?: boolean;
  width?: number | string;
}) {
  const stamp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    // ripple-free micro "ink splat" feedback via scale is handled by whileTap;
    // this is just a hook point if we ever want sound/haptics.
    void e;
  };

  return (
    <motion.button
      type="button"
      className="slam-btn"
      onClick={onClick}
      onPointerDown={stamp}
      disabled={disabled}
      style={{
        minHeight: size,
        padding: `0 ${Math.round(size * 0.6)}px`,
        width,
        ...(font ?? {}),
      }}
      whileHover={disabled ? undefined : { x: -3, y: -3 }}
      whileTap={disabled ? undefined : { x: 3, y: 3, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
    >
      <span className="slam-stripes" aria-hidden="true" />
      <span className="slam-label">{label}</span>
    </motion.button>
  );
}
