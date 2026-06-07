import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.phaserstacks.reactredux",
  appName: "Phaser Stacks",
  // Capacitor wraps the same Vite production build — no architecture changes.
  webDir: "dist",
};

export default config;
