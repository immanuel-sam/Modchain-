"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@civic/auth/react";
import { getModeratorProfile } from "../../../utils/api";

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
  // Civic user object does not have walletAddress, so use placeholder for now
  const walletAddress = "0x1234...abcd"; // Placeholder
  const [reputation, setReputation] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      console.log('Civic user object:', user);
    }
    if (!user) return;
    setLoading(true);
    setError(null);
    // Use walletAddress or user.email as needed (replace with real address logic)
    getModeratorProfile(walletAddress)
      .then(res => {
        setReputation(Number(res.reputation));
        setHistory(res.history || []);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return <div style={retroCard}>Please log in to view your profile.</div>;
  }

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
          <b>Reputation Score:</b> <br />{reputation !== null ? reputation : "-"}
        </div>
        {/* Reputation history */}
        <div style={{ marginTop: 32, textAlign: "left" }}>
          <b>Reputation History:</b>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div style={{ color: "red" }}>{error}</div>
          ) : history.length === 0 ? (
            <div>No reputation history found.</div>
          ) : (
            <ul style={{ marginTop: 10, paddingLeft: 20 }}>
              {history.map((item, idx) => (
                <li key={item.txHash} style={{ marginBottom: 6 }}>
                  <span style={{ color: "green" }}>New: {item.newReputation}</span> (Block: {item.blockNumber})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 