/**
 * seed.js - Inserta los usuarios precargados en la base de datos.
 * Ejecutar una sola vez: node backend/db/seed.js
 *
 * Agrega, quita o edita los usuarios del array USERS_TO_SEED.
 */

const bcrypt = require('bcryptjs');
const db = require('./database');

const USERS_TO_SEED = [
  { username: 'admin',   password: 'megabet123', tokens: 100, prestige_medals: 0 },
  { username: 'jugador1', password: 'pass1234',  tokens: 100, prestige_medals: 0 },
  { username: 'jugador2', password: 'pass1234',  tokens: 100, prestige_medals: 0 },
  { username: 'jugador3', password: 'pass1234',  tokens: 100, prestige_medals: 0 },
  { username: 'jugador4', password: 'pass1234',  tokens: 100, prestige_medals: 0 },
  { username: 'jugador5', password: 'pass1234',  tokens: 100, prestige_medals: 0 },
  { username: 'mxmello',  password: '2210',      tokens: 100, prestige_medals: 0 },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash, tokens, prestige_medals)
  VALUES (@username, @password_hash, @tokens, @prestige_medals)
`);

const seedAll = db.transaction((users) => {
  for (const user of users) {
    const password_hash = bcrypt.hashSync(user.password, 10);
    const result = insertUser.run({
      username: user.username,
      password_hash,
      tokens: user.tokens,
      prestige_medals: user.prestige_medals,
    });
    if (result.changes > 0) {
      console.log(`✅ Usuario creado: ${user.username}`);
    } else {
      console.log(`⏭️  Usuario ya existe: ${user.username} (skipped)`);
    }
  }
});

seedAll(USERS_TO_SEED);
console.log('\n🎰 Seed completado. ¡La casa siempre gana!\n');
process.exit(0);
