import os
import json
import re
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    group: Optional[int] = None
    val: Optional[float] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str
    id: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class GenerateRequest(BaseModel):
    text: str
    focus: Optional[str] = "General"

class VerifyRequest(BaseModel):
    sourceText: str
    graphData: GraphData

class OptimizeRequest(BaseModel):
    sourceText: str
    currentGraph: GraphData
    suggestions: str

SYSTEM_INSTRUCTION = """
You are an expert Knowledge Graph Engineer. Your task is to analyze the provided text and extract a knowledge graph structure consisting of Entities (Nodes) and Relationships (Edges).

Rules:
1. Identify key entities (People, Organizations, Locations, Concepts, Dates, etc.).
2. Identify meaningful relationships between these entities.
3. Consolidate similar entities (e.g., "The US" and "United States" should be one node).
4. Assign a broad 'type' to each node (e.g., "Person", "Org", "Event").
5. The output must be strictly JSON matching the schema.
6. Maintain the language of the source text for all 'label' and 'relation' fields.
"""

VERIFICATION_INSTRUCTION = """
You are a Quality Assurance Specialist for Knowledge Graphs. 
Your task is to compare a generated Knowledge Graph (JSON) against the original Source Text.

Scoring Rubric:
1. Validity:
   - 90-100: All nodes and edges are directly supported by the text.
   - 70-89: Most are correct, with very minor logical inferences.
   - Below 60: Contains hallucinations or incorrect relations.
2. Completeness:
   - 90-100: All major entities and their core relationships mentioned in the text are present.
   - 70-89: Missing some secondary details but covers the main narrative.
   - Below 60: Missing primary entities or critical structural relationships.

The numeric scores must reflect your qualitative feedback.
Output strictly JSON.
"""

OPTIMIZATION_INSTRUCTION = """
You are a Senior Knowledge Graph Refinement Agent. 
You will be given the original Source Text, the current Knowledge Graph (JSON), and specific Improvement Suggestions from an auditor.
Your goal is to output a new, improved, and more complete Knowledge Graph that addresses the suggestions while maintaining the integrity of the existing correct parts.

Rules:
1. Incorporate missing entities and relationships mentioned in the suggestions.
2. Correct any invalid relationships or entity types identified.
3. Keep the graph concise but comprehensive.
4. Output strictly JSON matching the same schema as before.
5. Maintain the original language of the source text.

Output should be in Simplified Chinese.
"""

GRAPH_SCHEMA_EXAMPLE = """
{
  "nodes": [
    { "id": "elon_musk", "label": "埃隆·马斯克", "type": "Person" }
  ],
  "edges": [
    { "source": "elon_musk", "target": "spacex", "relation": "领导" }
  ]
}
"""

def extract_first_json(text: str) -> str:
    m = re.search(r"```json[\s\S]*?```", text, flags=re.IGNORECASE)
    if m:
        return re.sub(r"```json|```", "", m.group(0), flags=re.IGNORECASE).strip()
    m2 = re.search(r"```[\s\S]*?```", text)
    if m2:
        return re.sub(r"```", "", m2.group(0)).strip()
    first = text.find("{")
    if first == -1:
        return text.strip()
    depth = 0
    for i in range(first, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[first : i + 1]
    return text[first:]

def validate_graph(raw: dict) -> GraphData:
    nodes = [GraphNode(**n) for n in raw.get("nodes", [])]
    node_ids = set(n.id for n in nodes)
    valid_edges = []
    for e in raw.get("edges", []):
        src = e.get("source")
        tgt = e.get("target")
        if isinstance(src, dict):
            src = src.get("id")
        if isinstance(tgt, dict):
            tgt = tgt.get("id")
        if src in node_ids and tgt in node_ids:
            valid_edges.append(GraphEdge(source=src, target=tgt, relation=e.get("relation", ""), id=e.get("id")))
    return GraphData(nodes=nodes, edges=valid_edges)

def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY is missing")
    base_url = (os.getenv("OPENAI_BASE_URL") or os.getenv("VITE_OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    return OpenAI(api_key=api_key, base_url=base_url)

ROOT_DIR = Path(__file__).resolve().parents[1]
for env_name in (".env.local", ".env"):
    env_path = ROOT_DIR / env_name
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)

MODEL = os.getenv("MODEL") or os.getenv("VITE_MODEL") or "gpt-4o-mini"

app = FastAPI()

DIST_DIR = Path(__file__).resolve().parents[1] / "dist"

@app.post("/api/generate")
def generate(req: GenerateRequest) -> GraphData:
    client = get_client()
    prompt = f"""
Analyze the following text and build a knowledge graph.
Focus area: {req.focus}.

Text content:
\"\"\" 
{req.text}
\"\"\" 

Output strictly JSON. Use this shape:
{GRAPH_SCHEMA_EXAMPLE}
"""
    r = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )
    content = r.choices[0].message.content or ""
    if not content:
        raise HTTPException(status_code=500, detail="AI returned empty response content")
    raw_json = extract_first_json(content)
    try:
        raw = json.loads(raw_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {e}")
    return validate_graph(raw)

@app.post("/api/verify")
def verify(req: VerifyRequest):
    client = get_client()
    prompt = f"""
Source Text:
\"\"\" 
{req.sourceText}
\"\"\" 

Generated Graph Data (JSON):
{json.dumps(req.graphData.dict(), ensure_ascii=False)}

Please perform a rigorous audit of this graph.
Ensure the validityScore and completenessScore reflect your analysis.

Output strictly JSON with fields:
{{
  "validityScore": 0,
  "completenessScore": 0,
  "feedback": [],
  "missingEntities": [],
  "suggestions": ""
}}
"""
    r = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[
            {"role": "system", "content": VERIFICATION_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )
    content = r.choices[0].message.content or ""
    if not content:
        raise HTTPException(status_code=500, detail="AI returned empty response content")
    raw_json = extract_first_json(content)
    try:
        obj = json.loads(raw_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {e}")
    return {
        "validityScore": int(obj.get("validityScore", 0)),
        "completenessScore": int(obj.get("completenessScore", 0)),
        "feedback": obj.get("feedback", []) or [],
        "missingEntities": obj.get("missingEntities", []) or [],
        "suggestions": obj.get("suggestions", "") or "",
    }

@app.post("/api/optimize")
def optimize(req: OptimizeRequest) -> GraphData:
    client = get_client()
    prompt = f"""
Source Text:
\"\"\" 
{req.sourceText}
\"\"\" 

Current Knowledge Graph (JSON):
{json.dumps(req.currentGraph.dict(), ensure_ascii=False)}

Improvement Suggestions:
{req.suggestions}

Please provide the optimized full knowledge graph JSON.
"""
    r = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[
            {"role": "system", "content": OPTIMIZATION_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )
    content = r.choices[0].message.content or ""
    if not content:
        raise HTTPException(status_code=500, detail="AI returned empty response content")
    raw_json = extract_first_json(content)
    try:
        raw = json.loads(raw_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {e}")
    return validate_graph(raw)

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")
