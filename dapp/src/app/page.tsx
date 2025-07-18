"use client";
import React, { useEffect } from "react";
import { useUser } from "@civic/auth/react";
import { useRouter } from "next/navigation";
import { UserButton } from "@civic/auth/react";

const retroStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f5e9da 0%, #bfae9e 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Press Start 2P', 'Courier New', Courier, monospace",
  color: "#3a2c1a",
};

const cardStyle: React.CSSProperties = {
  background: "#fffbe6",
  border: "4px solid #bfae9e",
  borderRadius: "16px",
  boxShadow: "0 8px 32px #bfae9e55",
  padding: "2rem 3rem",
  textAlign: "center",
  maxWidth: 480,
};

const quoteStyle: React.CSSProperties = {
  fontSize: "1.2rem",
  fontStyle: "italic",
  marginBottom: "2rem",
};

export default function HomePage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // If user is logged in, redirect to profession selection or main page
      // We'll handle the logic in the profession selection page
      router.push("/onboarding");
    }
  }, [user, router]);

  return (
    <div style={retroStyle}>
      <div style={cardStyle}>
        <div style={quoteStyle}>
          &quot;The best way to predict the future is to create it.&quot;<br />
          <span style={{ fontSize: "0.9rem", color: "#7a6c53" }}>– Peter Drucker</span>
        </div>
        <div style={{ margin: "2rem 0" }}>
          <UserButton />
        </div>
        <div style={{ fontSize: "0.9rem", color: "#7a6c53" }}>
          Login with Civic Auth to continue
        </div>
      </div>
    </div>
  );
}
