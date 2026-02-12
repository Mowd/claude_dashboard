/**
 * SQLite schema for the Claude Dashboard.
 *
 * Tables:
 *   - workflows     : top-level workflow records
 *   - agent_steps   : one row per agent role per workflow (5 per workflow)
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS workflows (
  id               TEXT PRIMARY KEY,
  title            TEXT    NOT NULL,
  user_prompt      TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'pending',
  current_step_index INTEGER NOT NULL DEFAULT 0,
  project_path     TEXT    NOT NULL,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at     TEXT
);

CREATE TABLE IF NOT EXISTS agent_steps (
  id            TEXT PRIMARY KEY,
  workflow_id   TEXT    NOT NULL,
  role          TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',
  prompt        TEXT    NOT NULL DEFAULT '',
  output        TEXT    NOT NULL DEFAULT '',
  error         TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  duration_ms   INTEGER,
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  started_at    TEXT,
  completed_at  TEXT,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_steps_workflow ON agent_steps(workflow_id);
`;
