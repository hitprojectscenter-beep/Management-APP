"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface HelpContextValue {
  // Tour state
  isTourActive: boolean;
  tourStepIndex: number;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;

  // Bot state
  isBotOpen: boolean;
  openBot: () => void;
  closeBot: () => void;
  toggleBot: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

const STORAGE_KEY = "workos:tour-completed-v1";

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [isBotOpen, setIsBotOpen] = useState(false);

  // Auto-start tour on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Wait a moment for the page to settle
      const t = setTimeout(() => {
        setIsTourActive(true);
        setTourStepIndex(0);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const startTour = useCallback(() => {
    setTourStepIndex(0);
    setIsTourActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsTourActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
  }, []);

  const nextStep = useCallback(() => {
    setTourStepIndex((i) => i + 1);
  }, []);

  const prevStep = useCallback(() => {
    setTourStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    setTourStepIndex(index);
  }, []);

  const openBot = useCallback(() => setIsBotOpen(true), []);
  const closeBot = useCallback(() => setIsBotOpen(false), []);
  const toggleBot = useCallback(() => setIsBotOpen((b) => !b), []);

  return (
    <HelpContext.Provider
      value={{
        isTourActive,
        tourStepIndex,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        goToStep,
        isBotOpen,
        openBot,
        closeBot,
        toggleBot,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used within HelpProvider");
  return ctx;
}
