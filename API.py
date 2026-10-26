import os
import json
import re
import requests
from Graph_Schema import GraphExtraction

ENDPOINT_URL = "https://hip-gw.hessian.ai/v1/chat/completions"
HAI_API_KEY = os.environ.get("sk-bf-236ea46f-c62f-4340-bec6-e69f6ceba3df")

def extract_json_payload(raw_text: str) -> str:
    """Strips <think> blocks and markdown code fences if GLM-Flash outputs them."""
    # Remove <think>...</think> if reasoning is enabled
    cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
    # Extract JSON from ```json ... ``` blocks if present
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, flags=re.DOTALL)
    if fence_match:
        return fence_match.group(1)
    return cleaned

def extract_graph_from_chunk_requests(chunk_text: str, source_doc: str, chunk_id: str) -> dict:
    # Generate the JSON schema from our Pydantic model
    schema_str = json.dumps(GraphExtraction.model_json_schema(), indent=2)
    
    prompt_with_schema = (
        f"{"""

        """}\n\n"
        f"You MUST respond ONLY with a valid JSON object matching this exact JSON Schema:\n"
        f"{schema_str}"
    )

    headers = {
        "Authorization": f"Bearer {HAI_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "model": "vllm/GLM-Flash:Latest",
        "messages": [
            {"role": "system", "content": prompt_with_schema},
            {"role": "user", "content": f"Source Document: {source_doc} (Chunk {chunk_id})\n\n{chunk_text}"}
        ],
        "temperature": 0.0,
        "max_tokens": 4096,
        # Optional: vLLM also supports guided_json or response_format={"type": "json_object"}
        "response_format": {"type": "json_object"}
    }

    response = requests.post(ENDPOINT_URL, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    
    raw_content = response.json()["choices"][0]["message"]["content"]
    clean_json_str = extract_json_payload(raw_content)
    
    # Validate and parse into our Pydantic model
    extracted = GraphExtraction.model_validate_json(clean_json_str)

    # Post-process and canonicalize IDs
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