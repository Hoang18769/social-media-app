import "./globals.css";
import ThemeProvider from "@/providers/ThemeProvider";
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-switcher"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem("theme");
                  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  const resolved = theme === "dark" || (theme === "system" && systemDark);
                  if (resolved) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        
          <>
            {children}
          </>
        
      </body>
    </html>
  );
}