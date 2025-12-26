
import { GraphData, VerificationResult } from "../types";

export const generateKnowledgeGraph = async (
  text: string, 
  focus: string = "General"
): Promise<GraphData> => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, focus })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Generate failed');
  }
  const data = await res.json();
  return data as GraphData;
};

export const verifyKnowledgeGraph = async (
  sourceText: string,
  graphData: GraphData
): Promise<VerificationResult> => {
  const res = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceText, graphData })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Verify failed');
  }
  const data = await res.json();
  return data as VerificationResult;
};

export const optimizeKnowledgeGraph = async (
  sourceText: string,
  currentGraph: GraphData,
  suggestions: string
): Promise<GraphData> => {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceText, currentGraph, suggestions })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Optimize failed');
  }
  const data = await res.json();
  return data as GraphData;
};
