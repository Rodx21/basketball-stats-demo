import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

// MUI is only used on the live game screen; enableCssLayer keeps its styles
// in a cascade layer so Tailwind utilities elsewhere still win.
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <AppRouterCacheProvider options={{ enableCssLayer: true }}>{children}</AppRouterCacheProvider>;
}
