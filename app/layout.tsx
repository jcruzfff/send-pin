import { Oxanium } from 'next/font/google';
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/lib/context/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ scrollBehavior: 'auto' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body 
        className={`${oxanium.className} dark:bg-background dark:text-foreground`}
        style={{ overscrollBehavior: 'none' }}
      >
        <AuthProvider>
          <ProtectedRoute>
            <div className="relative min-h-screen">
              <Navigation />
              {children}
            </div>
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
