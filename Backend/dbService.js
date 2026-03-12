// dbService.js
const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

/**
 * Saves the graph data from AI into Neo4j using MERGE to avoid duplicates.
 */
async function saveGraphData(graphData) {
    if (!graphData || !graphData.nodes) return false;
    const session = driver.session();
    try {
        console.log("Database mein data save ho raha hai...");
        
        // 1. Nodes insert karo
        for (const node of graphData.nodes) {
            await session.run(
                'MERGE (n:Entity {id: $id}) SET n.group = $group',
                { id: node.id, group: node.group }
            );
        }

        // 2. Links (Relationships) insert karo
        for (const link of graphData.links) {
            await session.run(
                `MATCH (source:Entity {id: $sourceId})
                 MATCH (target:Entity {id: $targetId})
                 MERGE (source)-[r:RELATION {label: $label}]->(target)`,
                { sourceId: link.source, targetId: link.target, label: link.label }
            );
        }
        return true;
    } catch (error) {
        console.error("DB Save Error:", error);
        return false;
    } finally {
        await session.close();
    }
}

/**
 * Fetches the entire graph for the frontend visualization.
 */
async function getFullGraph() {
    const session = driver.session();
    try {
        const result = await session.run(
            'MATCH (n:Entity) OPTIONAL MATCH (n)-[r:RELATION]->(m:Entity) RETURN n, r, m'
        );

        const nodes = [];
        const links = [];
        const nodeIds = new Set();

        result.records.forEach(record => {
            const source = record.get('n');
            if (source && !nodeIds.has(source.properties.id)) {
                nodes.push({ id: source.properties.id, group: source.properties.group });
                nodeIds.add(source.properties.id);
            }

            const target = record.get('m');
            if (target && !nodeIds.has(target.properties.id)) {
                nodes.push({ id: target.properties.id, group: target.properties.group });
                nodeIds.add(target.properties.id);
            }

            const rel = record.get('r');
            if (rel) {
                links.push({
                    source: source.properties.id,
                    target: target.properties.id,
                    label: rel.properties.label
                });
            }
        });
        return { nodes, links };
    } finally {
        await session.close();
    }
}

module.exports = { driver, saveGraphData, getFullGraph };