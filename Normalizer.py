import os
import re
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from openai import OpenAI
import json

# 1. Initialize OpenAI client pointing to your Hessian.AI endpoint
client = OpenAI(
    base_url="https://hip-gw.hessian.ai/v1",
    api_key=os.environ.get("sk-bf-236ea46f-c62f-4340-bec6-e69f6ceba3df")
)

# 2. Define the Pydantic Graph Schema
NodeType = Literal[
    "Abgabegrund", "Datenbaustein", "Datenfeld", 
    "Schluesselzahl", "Pruefkriterium", "Rechtsgrundlage", "Beispiel"
]

EdgeType = Literal[
    "REQUIRES_BAUSTEIN", "HAS_FIELD", "ALLOWS_VALUE", 
    "GOVERNED_BY_RULE", "TRIGGERS_RESPONSE", "BASED_ON_LAW", "DEMONSTRATED_IN"
]

class Node(BaseModel):
    id: str = Field(description="Canonical uppercase ID. E.g., 'AG_41', 'DBVO', 'KZ-NACHWEIS'")
    type: NodeType
    name: str = Field(description="Human-readable name in German")
    description: str = Field(description="Contextual rules, conditions, or byte positions from the chunk")

class Edge(BaseModel):
    source_id: str = Field(description="Must match a Node.id")
    target_id: str = Field(description="Must match a Node.id")
    type: EdgeType
    condition: Optional[str] = Field(default=None, description="Condition under which this link holds")

class GraphExtraction(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

# 3. Deterministic ID Normalizer
def normalize_entity_id(raw_id: str, node_type: str) -> str:
    clean = raw_id.strip().upper()
    clean = re.sub(r'[„“"\'\`]', '', clean)
    
    if node_type == "Abgabegrund":
        match = re.search(r'\b(\d{2})\b', clean)
        return f"AG_{match.group(1)}" if match else clean
    if node_type == "Datenbaustein":
        match = re.search(r'\b(DSLW|DB[A-Z]{2})\b', clean)
        return match.group(1) if match else clean
    if node_type == "Datenfeld":
        clean = re.sub(r'[-_\s]+(NN|\d+)$', '', clean)
        return clean.replace(" ", "-")
    return clean

# 4. System Prompt
SYSTEM_PROMPT = """
You are a German Social Security (DTA EEL § 107 SGB IV) data architect.
Extract a Knowledge Graph from the provided document chunk.

CRITICAL LINKING RULES:
1. Normalize Datenbausteine to their 4-letter codes (e.g., 'DBVO', 'DSLW', 'DBEE', 'DBSD').
2. Normalize Datenfelder to their exact technical field names without index numbers (e.g., use 'BEGINN-AU' instead of 'BEGINN-AU-1' or 'BEGINN-AU-nn').
3. Normalize Abgabegründe to 'AG_' + 2 digits (e.g., 'AG_41', 'AG_61', 'AG_88').
4. If a chunk contains a UUID criterion (e.g., 'f41c7278-b5a5-4ec3-b321-39bca5c3aeeb'), extract it as a 'Pruefkriterium' node and link it to 'AG_41' and 'DBVO'.
5. Capture state transitions using TRIGGERS_RESPONSE (e.g., 'KZ-NACHWEIS=4' in 'AG_61' triggers a proactive 'AG_61' later, or 'AG_61' triggers 'AG_88').
"""

# 5. Extraction Function using Hessian.AI vLLM Endpoint
def extract_graph_from_chunk(chunk_text: str, source_doc: str, chunk_id: str) -> dict:
    completion = client.beta.chat.completions.parse(
        model="vllm/GLM-Flash:Latest",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Source Document: {source_doc} (Chunk {chunk_id})\n\n{chunk_text}"}
        ],
        response_format=GraphExtraction,
        temperature=0.0,
        max_tokens=4096
    )
    
    extracted: GraphExtraction = completion.choices[0].message.parsed
    
    # Post-process and canonicalize IDs so cross-document nodes merge!
    id_map = {}
    for node in extracted.nodes:
        canonical_id = normalize_entity_id(node.id, node.type)
        id_map[node.id] = canonical_id
        node.id = canonical_id
        
    for edge in extracted.edges:
        edge.source_id = id_map.get(edge.source_id, normalize_entity_id(edge.source_id, ""))
        edge.target_id = id_map.get(edge.target_id, normalize_entity_id(edge.target_id, ""))
        
    return {
        "chunk_id": chunk_id,
        "source_doc": source_doc,
        "nodes": [n.model_dump() for n in extracted.nodes],
        "edges": [e.model_dump() for e in extracted.edges]
    }
    
if __name__ == "__main__":
    sample_chunk = """
    f41c7278-b5a5-4ec3-b321-39bca5c3aeeb
    Es ist systemseitig sichergestellt, dass eine Meldung mit Abgabegrund "41" nur erzeugt werden kann, 
    wenn sowohl die aktuelle Arbeitsunfähigkeit als auch mindestens eine vorherige Arbeitsunfähigkeit attestiert sind.
    """
    result = extract_graph_from_chunk(
        chunk_text=sample_chunk,
        source_doc="../"ITSG Files"/"test case"/DTA-EEL-Beispiel_Vorerkrankung.docx",
        chunk_id="chunk_01"
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))