import React from 'react';
import './globals.css';
import { CivicAuthProvider } from "@civic/auth/nextjs";
import RetroNav from "./RetroNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CivicAuthProvider>
          <RetroNav />
          {children}
        </CivicAuthProvider>
      </body>
    </html>
  );
}
