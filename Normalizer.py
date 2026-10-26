import re

def normalize_entity_id(raw_id: str, node_type: str) -> str:
    clean = raw_id.strip().upper()
    # Remove quotes
    clean = re.sub(r'[„“"\'\`]', '', clean)
    
    if node_type == "Abgabegrund":
        # Extract the 2-digit number: "Abgabegrund 41" -> "AG_41"
        match = re.search(r'\b(\d{2})\b', clean)
        return f"AG_{match.group(1)}" if match else clean

    if node_type == "Datenbaustein":
        # Extract 4-letter code: "Datenbaustein DBVO" -> "DBVO"
        match = re.search(r'\b(DSLW|DB[A-Z]{2})\b', clean)
        return match.group(1) if match else clean

    if node_type == "Datenfeld":
        # Strip repeating index suffixes: "BEGINN-AU-1" or "BEGINN-AU-NN" -> "BEGINN-AU"
        clean = re.sub(r'[-_\s]+(NN|\d+)$', '', clean)
        clean = clean.replace(" ", "-")
        return clean

    return clean