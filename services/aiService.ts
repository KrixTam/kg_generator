import { GoogleGenAI, Type } from "@google/genai";
import { GraphData, GraphNode, GraphEdge } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert Knowledge Graph Engineer. Your task is to analyze the provided text and extract a knowledge graph structure consisting of Entities (Nodes) and Relationships (Edges).

Rules:
1. Identify key entities (People, Organizations, Locations, Concepts, Dates, etc.).
2. Identify meaningful relationships between these entities.
3. Consolidate similar entities (e.g., "The US" and "United States" should be one node).
4. Assign a broad 'type' to each node (e.g., "Person", "Org", "Event").
5. The output must be strictly JSON matching the schema.
6. **IMPORTANT**: Maintain the language of the source text for all 'label' and 'relation' fields. If the input is in Chinese, the labels and relations must be in Chinese. Do not translate unless explicitly asked.
`;

const getEnv = (key: string): string | undefined => {
  const viteEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
  const procEnv = (typeof process !== "undefined" && (process as any).env) || {};
  return viteEnv[key] ?? procEnv[key];
};

const resolveApiKey = (provider: string): string | undefined => {
  if (provider === "openai") {
    return (
      getEnv("VITE_OPENAI_API_KEY") ||
      getEnv("OPENAI_API_KEY") ||
      getEnv("VITE_API_KEY") ||
      getEnv("API_KEY")
    );
  }
  return (
    getEnv("VITE_GEMINI_API_KEY") ||
    getEnv("GEMINI_API_KEY") ||
    getEnv("VITE_API_KEY") ||
    getEnv("API_KEY")
  );
};

const resolveBaseUrl = (provider: string): string | undefined => {
  if (provider === "openai") {
    return (
      getEnv("VITE_OPENAI_BASE_URL") ||
      getEnv("OPENAI_BASE_URL") ||
      getEnv("VITE_BASE_URL") ||
      getEnv("BASE_URL") ||
      "https://api.openai.com/v1"
    );
  }
  return undefined;
};

const defaultModelFor = (provider: string): string => {
  if (provider === "openai") return getEnv("VITE_MODEL") || getEnv("MODEL") || "gpt-4o-mini";
  return getEnv("VITE_MODEL") || getEnv("MODEL") || "gemini-2.5-flash";
};

const buildPrompt = (text: string, focus: string): string => {
  return `
    Analyze the following text and build a knowledge graph.
    Focus area: ${focus}.
    
    Text content:
    """
    ${text}
    """
  `;
};

const callGemini = async (apiKey: string, model: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Unique identifier for the node (slug style)" },
                label: { type: Type.STRING, description: "Display name of the entity (keep original language)" },
                type: { type: Type.STRING, description: "Category of the entity (Person, Place, etc.)" }
              },
              required: ["id", "label", "type"]
            }
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING, description: "ID of the source node" },
                target: { type: Type.STRING, description: "ID of the target node" },
                relation: { type: Type.STRING, description: "Description of the relationship (keep original language)" }
              },
              required: ["source", "target", "relation"]
            }
          }
        },
        required: ["nodes", "edges"]
      }
    }
  });
  return (response as any).text;
};

const callOpenAI = async (apiKey: string, baseUrl: string, model: string, prompt: string): Promise<string> => {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "OpenAI request failed");
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  return content;
};

export const generateKnowledgeGraph = async (
  text: string,
  focus: string = "General"
): Promise<GraphData> => {
  const provider = (getEnv("VITE_AI_PROVIDER") || getEnv("AI_PROVIDER") || "gemini").toLowerCase();
  const apiKey = resolveApiKey(provider);
  if (!apiKey) {
    throw new Error("API Key is missing. Configure API key via environment variables.");
  }
  const model = defaultModelFor(provider);
  const baseUrl = resolveBaseUrl(provider);
  const prompt = buildPrompt(text, focus);

  let responseText: string | undefined;
  if (provider === "openai") {
    responseText = await callOpenAI(apiKey, baseUrl!, model, prompt);
  } else {
    responseText = await callGemini(apiKey, model, prompt);
  }
  if (!responseText) {
    throw new Error("No data returned from provider");
  }
  const parsed: any = JSON.parse(responseText);
  const nodes: GraphNode[] = Array.isArray(parsed?.nodes)
    ? parsed.nodes
    : Array.isArray(parsed?.data?.nodes)
    ? parsed.data.nodes
    : [];
  const edgesRaw: any[] = Array.isArray(parsed?.edges)
    ? parsed.edges
    : Array.isArray(parsed?.data?.edges)
    ? parsed.data.edges
    : [];

  if (!Array.isArray(nodes) || !Array.isArray(edgesRaw)) {
    throw new Error("Provider returned invalid JSON: missing 'nodes' or 'edges'.");
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges: GraphEdge[] = edgesRaw
    .filter((e) => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
    .map((e) => ({
      source: e.source as string,
      target: e.target as string,
      relation: e.relation as string,
    }));

  if (nodes.length === 0 && validEdges.length === 0) {
    throw new Error("Model output contains no nodes or edges. Adjust model or prompt.");
  }

  return {
    nodes,
    edges: validEdges,
  };
};
