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
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return false;
    const session = driver.session();
    
    try {
        console.log("Saving data to Neo4j in batch mode...");
        
        // FIX: 1. Batch insert all nodes using UNWIND
        await session.run(
            `UNWIND $nodes AS node
             MERGE (n:Entity {id: node.id})
             SET n.group = node.group`,
            { nodes: graphData.nodes }
        );

        // FIX: 2. Batch insert all relationships using UNWIND
        if (graphData.links && graphData.links.length > 0) {
            await session.run(
                `UNWIND $links AS link
                 MATCH (source:Entity {id: link.source})
                 MATCH (target:Entity {id: link.target})
                 MERGE (source)-[r:RELATION {label: link.label}]->(target)`,
                { links: graphData.links }
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