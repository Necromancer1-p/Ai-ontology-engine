// dbService.js
const neo4j = require('neo4j-driver');
require('dotenv').config();

// Initializing the Neo4j driver using credentials from .env
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Connection test karne ke liye ek function
async function testConnection() {
    const session = driver.session();
    try {
        const result = await session.run('RETURN "Neo4j Connected Ekdum Mast" AS message');
        console.log(result.records[0].get('message'));
    } catch (error) {
        console.error("Database connection mein lafda hai:", error);
    } finally {
        await session.close();
    }
}

// Call the function to test
testConnection();

// Export the driver for later use
module.exports = { driver };