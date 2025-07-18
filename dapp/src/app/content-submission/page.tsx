"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { submitContent } from "../../../utils/api";
import { ethers } from "ethers";

const retroBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f5e9da 0%, #bfae9e 100%)",
  display: "flex",
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
  padding: "2rem 2.5rem",
  minWidth: 400,
  minHeight: 300,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

interface ContentSubmissionForm {
  content: string;
  description: string;
  bounty: string;
  contextTag: string;
  level: string;
  timePeriod: string;
  expectedOutcome: string;
}

export default function ContentSubmissionPage() {
  const [content, setContent] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [bounty, setBounty] = useState<string>("");
  const [contextTag, setContextTag] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState<string>("");
  const [expectedOutcome, setExpectedOutcome] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Hash content for on-chain uniqueness
      const contentHash = ethers.id(content);
      // For demo: fixed expertise tag and deadline (1 day from now)
      const requiredExpertiseTags = [contextTag || "Health"];
      const deadlineTimestamp = timePeriod ? Math.floor(Date.now() / 1000) + parseInt(timePeriod) * 3600 : Math.floor(Date.now() / 1000) + 86400;
      // Convert bounty to wei
      const bountyAmount = ethers.parseEther(bounty || "0.01").toString();
      await submitContent({
        contentHash,
        taskDescription: description,
        requiredExpertiseTags,
        deadlineTimestamp,
        bountyAmount,
        level,
        expectedOutcome,
      });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={retroBg}>
      <div style={cardStyle}>
        <h1 style={{ marginBottom: 18 }}>Submit Content</h1>
        {success ? (
          <div style={{ color: "#3a2c1a", fontSize: 18 }}>
            Content submitted!<br />Redirecting to dashboard...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <div style={{ marginBottom: 18 }}>
              <textarea
                style={{
                  width: "100%",
                  minHeight: 80,
                  fontFamily: "inherit",
                  fontSize: 16,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 10,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                }}
                placeholder="Enter your content here..."
                value={content}
                onChange={e => setContent(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <input
                type="text"
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: 16,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 10,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                }}
                placeholder="Short description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <input
                type="number"
                min="0"
                step="0.01"
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: 16,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 10,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                }}
                placeholder="Bounty (ETH)"
                value={bounty}
                onChange={e => setBounty(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <input
                type="text"
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: 16,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 10,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                }}
                placeholder="Context Tag (e.g. Health, Tech)"
                value={contextTag}
                onChange={e => setContextTag(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <select
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: 16,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 10,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                }}
                value={level}
                onChange={e => setLevel(e.target.value)}
                required
              >
                <option value="">Select Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <input
                type="number"
                min="1"
                step="1"
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: 16,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 10,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                }}
                placeholder="Time Period (hours)"
                value={timePeriod}
                onChange={e => setTimePeriod(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <input
                type="text"
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: 16,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 10,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                }}
                placeholder="Expected Outcome Tag"
                value={expectedOutcome}
                onChange={e => setExpectedOutcome(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px 0",
                background: "#bfae9e",
                color: "#fffbe6",
                border: "2px solid #3a2c1a",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: 18,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit & Pay Bounty"}
            </button>
            {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
} 