const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'megabet.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Habilitar WAL y foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ejecutar el schema al iniciar
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log('✅ Base de datos inicializada en:', DB_PATH);

module.exports = db;
