import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

// MUI renders the live-tracking dashboard; enableCssLayer keeps its styles
// in a cascade layer so Tailwind utilities elsewhere still win.
export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <AppRouterCacheProvider options={{ enableCssLayer: true }}>{children}</AppRouterCacheProvider>;
}
