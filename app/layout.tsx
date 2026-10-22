import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UNA Planner",
  description: "Conteúdo encaixado na rotina, não o contrário."
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
