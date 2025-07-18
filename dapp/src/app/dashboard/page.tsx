"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getContentList, getContentDetails, submitVerdict, getBountyResults } from "../../../utils/api";
import { useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import VerdictStorageABI from '../../abi/VerdictStorage.json';

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
  minWidth: 900,
  minHeight: 600,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  overflowX: "auto",
  gap: 24,
  width: "100%",
  marginTop: 32,
};

const contentCard: React.CSSProperties = {
  minWidth: 260,
  background: "#e6d8c3",
  border: "2px solid #bfae9e",
  borderRadius: 12,
  padding: 18,
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 2px 8px #bfae9e33",
};

const modalStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalCard: React.CSSProperties = {
  ...cardStyle,
  minWidth: 400,
  minHeight: 200,
  padding: "2rem 2rem",
};

type Content = {
  contentHash: string;
  submitter: string;
  taskDescription: string;
  submissionTimestamp: number;
  deadline: number;
  bountyAmount: string;
  status: number;
};

const flagOptions = [
  { value: "real", label: "Real" },
  { value: "fake", label: "Fake" },
  { value: "misleading", label: "Misleading" },
  { value: "other", label: "Other" },
];

const VERDICT_STORAGE_ADDRESS = "0xAD0C156522Af07EEf26d9dfcab24ead5Cf60DB94";

export default function DashboardPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [selected, setSelected] = useState<Content | null>(null);
  const [voteStatus, setVoteStatus] = useState<{ [id: string]: "up" | "down" | null }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalDetails, setModalDetails] = useState<Content | null>(null);
  const [voteLoading, setVoteLoading] = useState<boolean>(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [flag, setFlag] = useState<string>("");
  const [proof, setProof] = useState<string>("");
  const [flagLoading, setFlagLoading] = useState<boolean>(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagSuccess, setFlagSuccess] = useState<boolean>(false);
  const [bountyWinners, setBountyWinners] = useState<any[]>([]);
  const [bountyLoading, setBountyLoading] = useState(false);
  const [bountyError, setBountyError] = useState<string | null>(null);
  const router = useRouter();
  const userContext = useUser();
  const { writeContract: writeVerdict } = useWriteContract({
    mutation: {
      onSuccess: (data: `0x${string}`) => {
        if (data) {
          setVerdictTxHash(data);
        }
      },
    },
  });
  const [verdictTxHash, setVerdictTxHash] = useState<`0x${string}` | null>(null);
  const [verdictTxStatus, setVerdictTxStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const { data: verdictReceipt, status: verdictStatus } = useWaitForTransactionReceipt({ hash: verdictTxHash ?? undefined });

  React.useEffect(() => {
    if (verdictStatus === 'pending') setVerdictTxStatus('pending');
    if (verdictStatus === 'success') setVerdictTxStatus('success');
    if (verdictStatus === 'error') setVerdictTxStatus('error');
  }, [verdictStatus]);

  // Ensure wallet is created for each user
  React.useEffect(() => {
    if (userContext.user && !userHasWallet(userContext)) {
      userContext.createWallet();
    }
  }, [userContext]);

  useEffect(() => {
    setLoading(true);
    getContentList()
      .then((data: Content[]) => {
        setContents(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load content");
        setLoading(false);
      });
  }, []);

  const handleOpenModal = async (c: Content) => {
    setSelected(c);
    setModalDetails(null);
    setBountyWinners([]);
    setBountyLoading(false);
    setBountyError(null);
    try {
      const details = await getContentDetails(c.contentHash);
      setModalDetails(details);
      if (isBountyOver(c.deadline)) {
        setBountyLoading(true);
        getBountyResults(c.contentHash)
          .then(res => setBountyWinners(res.winners || []))
          .catch(() => setBountyError("Failed to load bounty results"))
          .finally(() => setBountyLoading(false));
      }
    } catch {
      setModalDetails(null);
    }
  };

  const handleVote = async (id: string, type: "up" | "down") => {
    setVoteLoading(true);
    setVoteError(null);
    setVoteStatus((prev) => ({ ...prev, [id]: type }));
    setVerdictTxHash(null);
    setVerdictTxStatus(null);
    try {
      // For demo, justification is the vote type
      await writeVerdict({
        address: VERDICT_STORAGE_ADDRESS,
        abi: VerdictStorageABI,
        functionName: 'recordVerdict',
        args: [id, type === "up", type],
      });
    } catch (e) {
      setVoteError(e instanceof Error ? e.message : String(e));
    } finally {
      setVoteLoading(false);
      setTimeout(() => setSelected(null), 600);
    }
  };

  const handleFlagSubmit = async () => {
    setFlagLoading(true);
    setFlagError(null);
    setFlagSuccess(false);
    try {
      // TODO: Replace with actual API call to submit flag and proof
      await new Promise(res => setTimeout(res, 800));
      setFlagSuccess(true);
      setFlag("");
      setProof("");
    } catch (e) {
      setFlagError(e instanceof Error ? e.message : String(e));
    } finally {
      setFlagLoading(false);
    }
  };

  // Helper to check if bounty is over
  const isBountyOver = (deadline: number) => {
    return Date.now() / 1000 > deadline;
  };

  return (
    <div style={retroBg}>
      <div style={cardStyle}>
        <h1 style={{ marginBottom: 12 }}>Moderate Content</h1>
        <div style={{ marginBottom: 18, fontSize: 14, color: '#7a6c53' }}>
          <b>Your Wallet Address:</b> {userHasWallet(userContext) ? userContext.ethereum?.address : 'Creating wallet...'}
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : (
          <div style={rowStyle}>
            {contents.map((c) => (
              <div
                key={c.contentHash}
                style={contentCard}
                onClick={() => handleOpenModal(c)}
              >
                <b>{c.taskDescription?.slice(0, 32) || c.contentHash}</b>
                <div style={{ margin: "12px 0 0 0", fontSize: 14 }}>{c.contentHash}</div>
                <div style={{ marginTop: 10, fontSize: 12, color: "#7a6c53" }}>
                  Bounty: {c.bountyAmount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div style={modalStyle} onClick={() => setSelected(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <h2>{modalDetails?.taskDescription || selected.taskDescription}</h2>
            <div style={{ margin: "18px 0" }}>{selected.contentHash}</div>
            {/* Bounty Results UI */}
            {isBountyOver(selected.deadline) && (
              <div style={{ margin: "18px 0", background: "#e6d8c3", padding: 12, borderRadius: 8 }}>
                <label style={{ fontWeight: "bold" }}>Bounty Results:</label>
                {bountyLoading ? (
                  <div>Loading...</div>
                ) : bountyError ? (
                  <div style={{ color: "red" }}>{bountyError}</div>
                ) : bountyWinners.length === 0 ? (
                  <div>No winners found.</div>
                ) : (
                  <table style={{ width: "100%", fontSize: 14, marginTop: 6 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 4 }}>Winner</th>
                        <th style={{ textAlign: "left", padding: 4 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bountyWinners.map((w, idx) => (
                        <tr key={w.txHash}>
                          <td style={{ padding: 4, fontFamily: "monospace" }}>{w.claimant}</td>
                          <td style={{ padding: 4 }}>{w.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
      </div>
            )}
            {/* Moderation flag/proof UI */}
            <div style={{ margin: "18px 0" }}>
              <label style={{ fontWeight: "bold" }}>Raise a Flag:</label>
              <select
                style={{
                  width: "100%",
                  fontFamily: "inherit",
                  fontSize: 15,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 8,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                  marginTop: 8,
                  marginBottom: 12,
                }}
                value={flag}
                onChange={e => setFlag(e.target.value)}
              >
                <option value="">Select flag</option>
                {flagOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <textarea
                style={{
                  width: "100%",
                  minHeight: 60,
                  fontFamily: "inherit",
                  fontSize: 15,
                  border: "2px solid #bfae9e",
                  borderRadius: 8,
                  padding: 8,
                  background: "#e6d8c3",
                  color: "#3a2c1a",
                  marginBottom: 12,
                }}
                placeholder="Provide your proof (text or link)"
                value={proof}
                onChange={e => setProof(e.target.value)}
              />
              <button
                style={{
                  width: "100%",
                  padding: "10px 0",
                  background: "#bfae9e",
                  color: "#fffbe6",
                  border: "2px solid #3a2c1a",
                  borderRadius: 8,
                  fontFamily: "inherit",
                  fontSize: 16,
                  cursor: flagLoading ? "not-allowed" : "pointer",
                  opacity: flagLoading ? 0.6 : 1,
                  marginBottom: 8,
                }}
                disabled={flagLoading || !flag || !proof}
                onClick={handleFlagSubmit}
              >
                {flagLoading ? "Submitting..." : "Submit Flag & Proof"}
              </button>
              {flagError && <div style={{ color: "red", marginTop: 6 }}>{flagError}</div>}
              {flagSuccess && <div style={{ color: "green", marginTop: 6 }}>Flag and proof submitted!</div>}
            </div>
            {/* Placeholder for existing proofs/flags */}
            <div style={{ margin: "18px 0" }}>
              <label style={{ fontWeight: "bold" }}>Submitted Proofs:</label>
              <div style={{ fontSize: 14, color: "#7a6c53", marginTop: 6 }}>
                {/* TODO: Replace with actual data from backend */}
                <div>No proofs submitted yet.</div>
              </div>
            </div>
            {/* ...existing voting UI... */}
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              <button
                style={{
                  padding: "10px 24px",
                  background: "#bfae9e",
                  color: "#fffbe6",
                  border: "2px solid #3a2c1a",
                  borderRadius: 8,
                  fontFamily: "inherit",
                  fontSize: 16,
                  cursor: "pointer",
                  opacity: voteStatus[selected.contentHash] ? 0.5 : 1,
                }}
                disabled={!!voteStatus[selected.contentHash]}
                onClick={() => handleVote(selected.contentHash, "up")}
              >
                Upvote
              </button>
              <button
                style={{
                  padding: "10px 24px",
                  background: "#bfae9e",
                  color: "#fffbe6",
                  border: "2px solid #3a2c1a",
                  borderRadius: 8,
                  fontFamily: "inherit",
                  fontSize: 16,
                  cursor: "pointer",
                  opacity: voteStatus[selected.contentHash] ? 0.5 : 1,
                }}
                disabled={!!voteStatus[selected.contentHash]}
                onClick={() => handleVote(selected.contentHash, "down")}
              >
                Downvote
              </button>
            </div>
            {voteLoading && <div style={{ color: "#3a2c1a", marginTop: 12 }}>Submitting vote...</div>}
            {voteError && <div style={{ color: "red", marginTop: 12 }}>{voteError}</div>}
            {voteStatus[selected.contentHash] && (
              <div style={{ marginTop: 18, color: "#3a2c1a" }}>
                Thank you for voting!
              </div>
            )}
            {verdictTxStatus === 'pending' && <div style={{ color: 'orange' }}>Vote transaction pending...</div>}
            {verdictTxStatus === 'success' && <div style={{ color: 'green' }}>Vote confirmed!</div>}
            {verdictTxStatus === 'error' && <div style={{ color: 'red' }}>Vote failed!</div>}
          </div>
        </div>
      )}
    </div>
  );
} 