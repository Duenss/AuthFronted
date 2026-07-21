import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "AuthRD - License & Auth Management",
  description: "Professional SaaS platform for authentication and license management",
  icons: { icon: "/logo.png" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>
        {/* Console & DevTools protection — only active in production */}
        <Script id="console-protection" strategy="beforeInteractive">{`
          (function() {
            if (typeof window === 'undefined') return;
            var isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            if (!isProd) return;

            // Override console methods
            var noop = function() {};
            var methods = ['log','debug','info','warn','error','table','dir','dirxml','group','groupEnd','trace','assert','profile','profileEnd'];
            methods.forEach(function(m) { try { console[m] = noop; } catch(e) {} });

            // Detect DevTools open via size diff
            var threshold = 160;
            var devtoolsOpen = false;
            setInterval(function() {
              var widthDiff  = window.outerWidth  - window.innerWidth  > threshold;
              var heightDiff = window.outerHeight - window.innerHeight > threshold;
              if ((widthDiff || heightDiff) && !devtoolsOpen) {
                devtoolsOpen = true;
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:sans-serif;font-size:1.2rem;">⛔ Acceso no autorizado</div>';
              }
            }, 1000);

            // Disable right-click
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

            // Disable common DevTools shortcuts
            document.addEventListener('keydown', function(e) {
              if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'U')
              ) { e.preventDefault(); }
            });
          })();
        `}</Script>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#06111e",
              border: "1px solid rgba(0,149,255,0.2)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(0,149,255,0.1)",
              borderRadius: "12px",
            },
            success: { iconTheme: { primary: "#22c55e", secondary: "#06111e" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#06111e" } },
          }}
        />
      </body>
    </html>
  );
}
