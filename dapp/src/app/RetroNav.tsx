"use client";
import { useUser } from "@civic/auth/react";
import Link from "next/link";

export default function RetroNav() {
  const { user } = useUser();
  if (!user) return null;
  return (
    <nav style={{
      width: "100%",
      background: "#bfae9e",
      padding: "12px 0",
      display: "flex",
      justifyContent: "center",
      gap: 32,
      fontFamily: "'Press Start 2P', 'Courier New', Courier, monospace",
      fontSize: 16,
      color: "#fffbe6",
      borderBottom: "3px solid #3a2c1a",
    }}>
      <Link href="/dashboard" style={{ color: "#fffbe6", textDecoration: "none" }}>Dashboard</Link>
      <Link href="/content-submission" style={{ color: "#fffbe6", textDecoration: "none" }}>Submit Content</Link>
      <Link href="/profile" style={{ color: "#fffbe6", textDecoration: "none" }}>Profile</Link>
    </nav>
  );
} 