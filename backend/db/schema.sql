PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    tokens          REAL    NOT NULL DEFAULT 100.0,
    prestige_medals INTEGER NOT NULL DEFAULT 0,
    avatar_url      TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bets (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id        INTEGER NOT NULL REFERENCES users(id),
    title             TEXT    NOT NULL,
    description       TEXT,
    image_url         TEXT,
    status            TEXT    NOT NULL DEFAULT 'open'
                      CHECK(status IN ('open', 'closed', 'resolved', 'annulled')),
    winning_option_id INTEGER,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    resolved_at       TEXT
);

CREATE TABLE IF NOT EXISTS bet_options (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    bet_id        INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    label         TEXT    NOT NULL,
    color         TEXT    NOT NULL DEFAULT 'green'
                  CHECK(color IN ('green', 'red', 'blue')),
    initial_odds  REAL    NOT NULL DEFAULT 2.0,
    current_odds  REAL    NOT NULL DEFAULT 2.0,
    total_wagered REAL    NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS user_bets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    bet_id        INTEGER NOT NULL REFERENCES bets(id),
    option_id     INTEGER NOT NULL REFERENCES bet_options(id),
    amount        REAL    NOT NULL CHECK(amount > 0),
    locked_odds   REAL    NOT NULL,
    potential_win REAL    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'won', 'lost', 'refunded')),
    pnl           REAL,
    placed_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, bet_id)
);

CREATE TABLE IF NOT EXISTS tribunal_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bet_id      INTEGER NOT NULL REFERENCES bets(id),
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    reason      TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'resolved')),
    verdict     TEXT    CHECK(verdict IN ('annul', 'maintain', NULL)),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS tribunal_votes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL REFERENCES tribunal_reports(id) ON DELETE CASCADE,
    voter_id  INTEGER NOT NULL REFERENCES users(id),
    vote      TEXT    NOT NULL CHECK(vote IN ('annul', 'maintain')),
    voted_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(report_id, voter_id)
);
