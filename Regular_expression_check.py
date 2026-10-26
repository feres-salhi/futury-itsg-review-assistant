import re

def deterministic_cross_document_bridge(chunk_text: str, chunk_id: str, source_doc: str) -> dict:
    """
    Scans a document chunk using regex to extract rigid DTA EEL entities 
    (Datenbausteine, Abgabegründe, and Legal Paragraphs) and links them 
    directly to the chunk for high-recall cross-document bridging.
    """
    nodes = []
    edges = []
    
    # 1. Extract Datenbausteine (e.g., DSLW, DBVO, DBAL, DBSD, DBEE)
    baustein_pattern = r'\b(DSLW|DBNA|DBAN|DBAL|DBAE|DBZA|DBEE|DBAW|DBFR|DBUN|DBMU|DBVO|DBHE|DBBE|DBLT|DBSF|DBTK|DBAP|DBID|DBSD|DBFE)\b'
    bausteins = set(re.findall(baustein_pattern, chunk_text))
    for b in bausteins:
        nodes.append({
            "id": b,
            "type": "Datenbaustein",
            "name": f"Datenbaustein {b}",
            "description": f"Deterministically extracted from {source_doc}"
        })
        edges.append({
            "source_id": b,
            "target_id": chunk_id,
            "type": "MENTIONED_IN",
            "condition": "Deterministic Regex Match"
        })
        
    # 2. Extract Abgabegründe (e.g., Abgabegrund '41', Abgabegrund 01)
    abgabe_pattern = r'Abgabegrund[^\d]*(\d{2})'
    abgabegruende = set(re.findall(abgabe_pattern, chunk_text, re.IGNORECASE))
    for ag in abgabegruende:
        node_id = f"AG_{ag}"
        nodes.append({
            "id": node_id,
            "type": "Abgabegrund",
            "name": f"Abgabegrund {ag}",
            "description": f"Deterministically extracted from {source_doc}"
        })
        edges.append({
            "source_id": node_id,
            "target_id": chunk_id,
            "type": "MENTIONED_IN",
            "condition": "Deterministic Regex Match"
        })
        
    # 3. Extract Legal Paragraphs (e.g., § 107 SGB IV, § 3 EntgFG, § 45 SGB V)
    law_pattern = r'§+\s*\d+[a-z]*\s*(?:Abs\.\s*\d+\s*)?(?:Satz\s*\d+\s*)?(?:SGB\s*(?:I|III|IV|V|VI|VII|IX|X|XI|XIV)|EntgFG|MuSchG|KVLG|BBiG)'
    laws = set(re.findall(law_pattern, chunk_text))
    for law in laws:
        clean_law = law.strip().replace("  ", " ")
        nodes.append({
            "id": clean_law,
            "type": "Rechtsgrundlage",
            "name": clean_law,
            "description": f"Deterministically extracted from {source_doc}"
        })
        edges.append({
            "source_id": clean_law,
            "target_id": chunk_id,
            "type": "MENTIONED_IN",
            "condition": "Deterministic Regex Match"
        })
        
    return {
        "chunk_id": chunk_id,
        "source_doc": source_doc,
        "nodes": nodes,
        "edges": edges
    }