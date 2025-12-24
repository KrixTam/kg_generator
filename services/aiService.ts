
import { GraphData, GraphNode, GraphEdge, VerificationResult } from "../types";

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

const VERIFICATION_INSTRUCTION = `
You are a Quality Assurance Specialist for Knowledge Graphs. 
Your task is to compare a generated Knowledge Graph (JSON) against the original Source Text.

Scoring Rubric:
1. **Validity (有效性)**: 
   - 90-100: All nodes and edges are directly supported by the text.
   - 70-89: Most are correct, with very minor logical inferences.
   - Below 60: Contains hallucinations or incorrect relations.
2. **Completeness (完备性)**:
   - 90-100: All major entities and their core relationships mentioned in the text are present.
   - 70-89: Missing some secondary details but covers the main narrative.
   - Below 60: Missing primary entities or critical structural relationships.

**CRITICAL**: The numeric scores MUST reflect your qualitative feedback. If you say "The graph is very accurate", the score must be high (e.g., >85%). 
Maintain the language of the source text for feedback comments. Output strictly in JSON.
`;

const OPTIMIZATION_INSTRUCTION = `
You are a Senior Knowledge Graph Refinement Agent. 
You will be given the original Source Text, the current Knowledge Graph (JSON), and specific Improvement Suggestions from an auditor.
Your goal is to output a new, improved, and more complete Knowledge Graph that addresses the suggestions while maintaining the integrity of the existing correct parts.

Rules:
1. Incorporate missing entities and relationships mentioned in the suggestions.
2. Correct any invalid relationships or entity types identified.
3. Keep the graph concise but comprehensive.
4. Output strictly JSON matching the same schema as before.
5. Maintain the original language of the source text.
`;

const GRAPH_SCHEMA_EXAMPLE = `
{
  "nodes": [
    { "id": "elon_musk", "label": "埃隆·马斯克", "type": "Person" }
  ],
  "edges": [
    { "source": "elon_musk", "target": "spacex", "relation": "领导" }
  ]
}
`;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = ((process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1') || '').replace(/\/+$/, '');
const MODEL = process.env.MODEL || 'gpt-4o-mini';

async function callOpenAIChat(systemInstruction: string, userPrompt: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("AI API Key is missing. Set OPENAI_API_KEY in .env or .env.local");
  const endpoint = `${OPENAI_BASE_URL}/chat/completions`;
  const body = {
    model: MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt }
    ]
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI request failed: ${res.status} ${res.statusText} - ${errText}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error("AI returned empty response content.");
  return content;
}

function extractFirstJson(text: string): string {
  const fenced = text.match(/```json[\s\S]*?```/i) || text.match(/```[\s\S]*?```/);
  if (fenced && fenced[0]) {
    const inner = fenced[0].replace(/```json|```/gi, '').trim();
    return inner;
  }
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return text;
  let depth = 0;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(firstBrace, i + 1);
      }
    }
  }
  return text.slice(firstBrace);
}

export const generateKnowledgeGraph = async (
  text: string, 
  focus: string = "General"
): Promise<GraphData> => {
  const prompt = `
Analyze the following text and build a knowledge graph.
Focus area: ${focus}.

Text content:
"""
${text}
"""

Output strictly JSON. Use this shape:
${GRAPH_SCHEMA_EXAMPLE}
`;
  try {
    const content = await callOpenAIChat(SYSTEM_INSTRUCTION, prompt);
    return parseAndValidateGraph(extractFirstJson(content));
  } catch (error) {
    console.error("AI Extraction Error:", error);
    throw error;
  }
};

export const verifyKnowledgeGraph = async (
  sourceText: string,
  graphData: GraphData
): Promise<VerificationResult> => {
  const prompt = `
    Source Text:
    """
    ${sourceText}
    """

    Generated Graph Data (JSON):
    ${JSON.stringify(graphData)}

    Please perform a rigorous audit of this graph. 
    Ensure the 'validityScore' and 'completenessScore' are representative of your actual analysis.
    
    Output strictly JSON with fields:
    {
      "validityScore": 0,
      "completenessScore": 0,
      "feedback": [],
      "missingEntities": [],
      "suggestions": ""
    }
  `;

  try {
    const content = await callOpenAIChat(VERIFICATION_INSTRUCTION, prompt);
    const jsonStr = extractFirstJson(content);
    const obj = JSON.parse(jsonStr);
    return {
      validityScore: Number(obj.validityScore ?? 0),
      completenessScore: Number(obj.completenessScore ?? 0),
      feedback: Array.isArray(obj.feedback) ? obj.feedback : [],
      missingEntities: Array.isArray(obj.missingEntities) ? obj.missingEntities : [],
      suggestions: String(obj.suggestions ?? '')
    };
  } catch (error) {
    console.error("Verification Error:", error);
    throw error;
  }
};

export const optimizeKnowledgeGraph = async (
  sourceText: string,
  currentGraph: GraphData,
  suggestions: string
): Promise<GraphData> => {
  const prompt = `
    Source Text:
    """
    ${sourceText}
    """

    Current Knowledge Graph (JSON):
    ${JSON.stringify(currentGraph)}

    Improvement Suggestions:
    ${suggestions}

    Please provide the optimized full knowledge graph JSON.
  `;

  try {
    const content = await callOpenAIChat(OPTIMIZATION_INSTRUCTION, prompt);
    return parseAndValidateGraph(extractFirstJson(content));
  } catch (error) {
    console.error("Optimization Error:", error);
    throw error;
  }
};

function parseAndValidateGraph(jsonStr: string): GraphData {
  const rawData = JSON.parse(jsonStr) as { nodes: GraphNode[], edges: any[] };
  const nodeIds = new Set(rawData.nodes.map(n => n.id));
  const validEdges: GraphEdge[] = rawData.edges
      .filter(e => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
      .map(e => ({
          source: e.source as string,
          target: e.target as string,
          relation: e.relation as string
      }));
  
  return { nodes: rawData.nodes, edges: validEdges };
}
