"use client";
import React from "react";
import { useUser } from "@civic/auth/react";

const retroCard: React.CSSProperties = {
  background: "#fffbe6",
  border: "4px solid #bfae9e",
  borderRadius: "16px",
  boxShadow: "0 8px 32px #bfae9e55",
  padding: "2rem 2.5rem",
  textAlign: "center",
  maxWidth: 400,
  margin: "auto",
  marginTop: "10vh",
  fontFamily: "'Press Start 2P', 'Courier New', Courier, monospace",
  color: "#3a2c1a",
};

export default function ProfilePage() {
  const { user } = useUser();
  // TODO: Fetch wallet address and reputation from backend/smart contract
  // Civic user object does not have walletAddress, so use placeholder for now
  const walletAddress = "0x1234...abcd"; // Placeholder
  const reputation = 70; // Placeholder

  if (!user) {
    return <div style={retroCard}>Please log in to view your profile.</div>;
  }

  // Placeholder reputation history
  const reputationHistory = [
    { change: "+10", reason: "Won bounty on 0xABC...123" },
    { change: "+5", reason: "Participated in moderation" },
    { change: "-2", reason: "Flagged incorrectly on 0xDEF...456" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5e9da" }}>
      <div style={retroCard}>
        <h2 style={{ marginBottom: 24 }}>Your Profile</h2>
        <div style={{ marginBottom: 16 }}>
          <b>Email:</b> <br />{user.email}
        </div>
        <div style={{ marginBottom: 16 }}>
          <b>Wallet Address:</b> <br />{walletAddress}
        </div>
        <div style={{ marginBottom: 16 }}>
          <b>Reputation Score:</b> <br />{reputation}
        </div>
        {/* Reputation history */}
        <div style={{ marginTop: 32, textAlign: "left" }}>
          <b>Reputation History:</b>
          <ul style={{ marginTop: 10, paddingLeft: 20 }}>
            {reputationHistory.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                <span style={{ color: item.change.startsWith("-") ? "red" : "green" }}>{item.change}</span> {item.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 