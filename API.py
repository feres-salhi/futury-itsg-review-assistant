import os
import json
import re
import requests
import frontmatter

ENDPOINT_URL = "https://hip-gw.hessian.ai/v1/chat/completions"
HAI_API_KEY = "sk-bf-236ea46f-c62f-4340-bec6-e69f6ceba3df"

def extract_json_payload(raw_text: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, flags=re.DOTALL)
    if fence_match:
        return fence_match.group(1)
    return cleaned

# ==========================================
# 1. LLM SEMANTIC EXTRACTION FOR MARKDOWN
# ==========================================
def extract_graph_from_markdown_chunk(text_content: str, metadata: dict) -> dict:
    system_prompt = f"""
    You are a German Social Security (DTA EEL § 107 SGB IV) data architect.
    Extract a Knowledge Graph from this markdown chunk.
    Context Metadata:
    - Document: {metadata.get('doc_title')}
    - Section: {metadata.get('section')} ({metadata.get('title')})
    - Pre-identified Abgabegründe: {metadata.get('abgabegrund')}
    - Pre-identified Datenbausteine: {metadata.get('datenbaustein')}
    """
    
    headers = {
        "Authorization": f"Bearer {HAI_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "model": "vllm/GLM-Flash:Latest",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text_content}
        ],
        "temperature": 0.0,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"}
    }
    
    response = requests.post(ENDPOINT_URL, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    raw_content = response.json()["choices"][0]["message"]["content"]
    return json.loads(extract_json_payload(raw_content))

# ==========================================
# 2. DETERMINISTIC BRIDGE USING FRONTMATTER
# ==========================================
def deterministic_markdown_bridge(text_content: str, metadata: dict) -> dict:
    """
    Extracts explicit entities from both the Markdown text via regex 
    AND utilizes the structured YAML frontmatter directly.
    """
    nodes = []
    edges = []
    chunk_id = f"sec_{metadata.get('section', 'unknown')}"
    
    # A. Inject Metadata directly into the Graph (Zero LLM hallucination risk!)
    for db in metadata.get('datenbaustein', []):
        nodes.append({"id": db, "type": "Datenbaustein", "name": f"Datenbaustein {db}", "description": "From Frontmatter"})
        edges.append({"source_id": db, "target_id": chunk_id, "type": "MENTIONED_IN", "condition": "Frontmatter Metadata"})
        
    for ag in metadata.get('abgabegrund', []):
        ag_id = f"AG_{ag}"
        nodes.append({"id": ag_id, "type": "Abgabegrund", "name": f"Abgabegrund {ag}", "description": "From Frontmatter"})
        edges.append({"source_id": ag_id, "target_id": chunk_id, "type": "MENTIONED_IN", "condition": "Frontmatter Metadata"})

    # B. Regex scan the text content (e.g., § 45 SGB V found in 2.md[cite: 770])
    law_pattern = r'§+\s*\d+[a-z]*\s*(?:Abs\.\s*\d+\s*)?(?:Satz\s*\d+\s*)?(?:SGB\s*(?:I|III|IV|V|VI|VII|IX|X|XI|XIV)|EntgFG|MuSchG|KVLG|BBiG)'
    for law in set(re.findall(law_pattern, text_content)):
        clean_law = law.strip().replace("  ", " ")
        nodes.append({"id": clean_law, "type": "Rechtsgrundlage", "name": clean_law, "description": "Regex Extracted"})
        edges.append({"source_id": clean_law, "target_id": chunk_id, "type": "MENTIONED_IN", "condition": "Regex Match"})
        
    return {
        "chunk_id": chunk_id,
        "source_doc": metadata.get('source_file'),
        "nodes": nodes,
        "edges": edges
    }

# ==========================================
# 3. UNIFIED MARKDOWN PIPELINE
# ==========================================
def process_markdown_chunk_fully(raw_markdown_string: str) -> dict:
    # Parse frontmatter and body text cleanly
    post = frontmatter.loads(raw_markdown_string)
    metadata = post.metadata
    text_content = post.content
    
    # 1. Run LLM Extraction
    llm_graph = extract_graph_from_markdown_chunk(text_content, metadata)
    
    # 2. Run Deterministic Bridge (Frontmatter + Regex)
    det_graph = deterministic_markdown_bridge(text_content, metadata)
    
    # 3. Merge Results Safely
    existing_node_ids = {n["id"] for n in llm_graph["nodes"]}
    for node in det_graph["nodes"]:
        if node["id"] not in existing_node_ids:
            llm_graph["nodes"].append(node)
            existing_node_ids.add(node["id"])
            
    llm_graph["edges"].extend(det_graph["edges"])
    return llm_graph

# ==========================================
# 4. EXECUTION EXAMPLE
# ==========================================
if __name__ == "__main__":
    # Simulate receiving the contents of '2.md' from your colleague
    sample_md_file_content = """---
doc: Anl1
doc_title: Gemeinsames Rundschreiben Kinderkrankengeld (§ 45 SGB V...)
section: '2'
title: Gesetzliche Grundlagen
abgabegrund: []
datenbaustein: []
---

## 2 Gesetzliche Grundlagen

§ 45 SGB V
(1) Versicherte haben Anspruch auf Krankengeld...
§ 12 KVLG 1989
Krankengeld nach den Vorschriften...
"""
    
    result = process_markdown_chunk_fully(sample_md_file_content)
    print(json.dumps(result, indent=2, ensure_ascii=False))