from neo4j import GraphDatabase

UPSERT_GRAPH_CYPHER = """
// 1. Upsert the Chunk node
MERGE (c:Chunk {id: $chunk_id})
SET c.source_doc = $source_doc, c.text = $chunk_text

// 2. Upsert Entity Nodes and link to Chunk
WITH c
UNWIND $nodes AS n
MERGE (e:Entity {id: n.id})
ON CREATE SET 
    e.type = n.type,
    e.name = n.name,
    e.descriptions = [n.description],
    e.sources = [$source_doc]
ON MATCH SET 
    e.descriptions = CASE WHEN NOT n.description IN e.descriptions THEN e.descriptions + n.description ELSE e.descriptions END,
    e.sources = CASE WHEN NOT $source_doc IN e.sources THEN e.sources + $source_doc ELSE e.sources END
MERGE (e)-[:MENTIONED_IN]->(c)

// 3. Upsert Edges between Entities
WITH c
UNWIND $edges AS r
MATCH (source:Entity {id: r.source_id})
MATCH (target:Entity {id: r.target_id})
MERGE (source)-[rel:RELATED_TO {type: r.type}]->(target)
SET rel.condition = r.condition, rel.last_seen_in = $chunk_id
"""