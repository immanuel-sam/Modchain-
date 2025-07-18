"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@civic/auth/react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "../../../utils/api";

const retroModal: React.CSSProperties = {
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

const professions = ["Health", "Education", "Technology", "Art"];

const healthQuiz = [
  { q: "What is the normal human body temperature?", a: ["36-37°C", "40°C", "32°C"] },
  { q: "Which vitamin is produced when a person is exposed to sunlight?", a: ["Vitamin D", "Vitamin C", "Vitamin B12"] },
  { q: "What is the largest organ in the human body?", a: ["Skin", "Heart", "Liver"] },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [profession, setProfession] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<(string | null)[]>([null, null, null]);
  const [quizStep, setQuizStep] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    // Check localStorage for profession/quiz
    const prof = localStorage.getItem("modchain_profession");
    const quizDone = localStorage.getItem("modchain_quiz_done");
    if (prof && quizDone) {
      router.push("/dashboard");
    } else if (prof) {
      setProfession(prof);
      setShowQuiz(true);
    }
  }, [user, router]);

  const handleProfession = async (p: string) => {
    setProfession(p);
    localStorage.setItem("modchain_profession", p);
    setShowQuiz(true);
    // Save to backend
    try {
      if (user?.email) {
        await saveOnboarding({ email: user.email, profession: p });
      }
    } catch {}
  };

  const handleQuizAnswer = async (ans: string) => {
    const updated = [...quizAnswers];
    updated[quizStep] = ans;
    setQuizAnswers(updated);
    if (quizStep < healthQuiz.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      localStorage.setItem("modchain_quiz_done", "1");
      // Save to backend
      try {
        if (user?.email) {
          await saveOnboarding({ email: user.email, quizDone: true });
        }
      } catch {}
      setTimeout(() => router.push("/dashboard"), 500);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5e9da" }}>
      {!profession && (
        <div style={retroModal}>
          <h2 style={{ marginBottom: 24 }}>Select your profession</h2>
          {professions.map((p) => (
            <button
              key={p}
              style={{
                display: "block",
                width: "100%",
                margin: "12px 0",
                padding: "12px",
                fontFamily: "inherit",
                fontSize: 16,
                background: "#bfae9e",
                color: "#fffbe6",
                border: "2px solid #3a2c1a",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onClick={() => handleProfession(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      {profession && showQuiz && (
        <div style={retroModal}>
          <h2 style={{ marginBottom: 24 }}>Quick Quiz ({profession})</h2>
          <div style={{ marginBottom: 16 }}>
            <b>{healthQuiz[quizStep].q}</b>
          </div>
          {healthQuiz[quizStep].a.map((ans) => (
            <button
              key={ans}
              style={{
                display: "block",
                width: "100%",
                margin: "10px 0",
                padding: "10px",
                fontFamily: "inherit",
                fontSize: 15,
                background: "#bfae9e",
                color: "#fffbe6",
                border: "2px solid #3a2c1a",
                borderRadius: 8,
                cursor: "pointer",
              }}
              onClick={() => handleQuizAnswer(ans)}
            >
              {ans}
            </button>
          ))}
      </div>
      )}
    </div>
  );
} 