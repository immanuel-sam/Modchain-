"use client";
import React, { useEffect, useState } from "react";
import { getModerators } from "../../../utils/api";

const retroCard: React.CSSProperties = {
  background: "#fffbe6",
  border: "4px solid #bfae9e",
  borderRadius: "16px",
  boxShadow: "0 8px 32px #bfae9e55",
  padding: "2rem 2.5rem",
  textAlign: "center",
  maxWidth: 600,
  margin: "auto",
  marginTop: "6vh",
  fontFamily: "'Press Start 2P', 'Courier New', Courier, monospace",
  color: "#3a2c1a",
};

export default function ModeratorsPage() {
  const [moderators, setModerators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModerators()
      .then(setModerators)
      .catch(() => setError("Failed to load moderators"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5e9da" }}>
      <div style={retroCard}>
        <h2 style={{ marginBottom: 24 }}>Moderators</h2>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : moderators.length === 0 ? (
          <div>No moderators found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "2px solid #bfae9e", padding: 8 }}>Address</th>
                <th style={{ borderBottom: "2px solid #bfae9e", padding: 8 }}>Reputation</th>
              </tr>
            </thead>
            <tbody>
              {moderators.map((mod, idx) => (
                <tr key={mod.address} style={{ background: idx % 2 ? "#e6d8c3" : "#fffbe6" }}>
                  <td style={{ padding: 8, fontFamily: "monospace" }}>{mod.address}</td>
                  <td style={{ padding: 8 }}>{mod.reputation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 