"""Builds ../website/data.js (window.DB_DATA) from the content files.

Every SQL example runs against a fresh copy of the MegaMart sample database (sample_db.py) and its
real result sets are stored next to it. Every "predict the result" puzzle takes its correct answer
from actually running the query. Unexpected errors fail the build; examples marked error=True show
the database's real error message.

    python3 generate_data.py
"""
import json
import random
import sqlite3
import sys
from pathlib import Path

import content_a
import content_b
import content_c
from challenges import CHALLENGES, HERO, SNIPPETS
from sample_db import SCHEMA, SEED, FOREIGN_KEYS

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "website" / "data.js"
MAX_ROWS = 12
PLAN_COLS = ["id", "parent", "notused", "detail"]


def fmt(v):
    """Display a value the way the browser (sql.js) shows it: whole floats without '.0'."""
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, bytes):
        return "x'" + v.hex() + "'"
    return v


def statements(sql):
    out, buf = [], ""
    for line in sql.splitlines(True):
        buf += line
        if sqlite3.complete_statement(buf):
            out.append(buf.strip()); buf = ""
    if buf.strip():
        out.append(buf.strip())
    return out


def fresh():
    con = sqlite3.connect(":memory:", isolation_level=None)      # autocommit: scripts manage BEGIN/COMMIT
    con.executescript(SCHEMA + SEED)
    return con


def run(sql):
    """-> list of result blocks: {cols, rows, more} for queries, {msg} for changes, {error} on failure."""
    con, blocks = fresh(), []
    for stmt in statements(sql):
        try:
            cur = con.execute(stmt)
        except sqlite3.Error as err:
            blocks.append({"error": str(err)})
            break
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = [[fmt(v) for v in r] for r in cur.fetchall()]
            if cols == PLAN_COLS:                                # EXPLAIN QUERY PLAN: keep the readable part
                cols, rows = ["plan"], [[r[3]] for r in rows]
            blocks.append({"cols": cols, "rows": rows[:MAX_ROWS], "more": max(0, len(rows) - MAX_ROWS)})
        elif cur.rowcount > 0 and stmt.split()[0].upper() in ("INSERT", "UPDATE", "DELETE", "REPLACE"):
            blocks.append({"msg": f"{cur.rowcount} row{'s' if cur.rowcount != 1 else ''} affected"})
    return blocks


def as_text(blocks):
    last = [b for b in blocks if "cols" in b][-1]
    return "\n".join(" | ".join("NULL" if v is None else str(v) for v in r) for r in last["rows"])


def pretty(blocks):
    """Last result as a small text table, the way a SQL console prints it."""
    b = [x for x in blocks if "cols" in x][-1]
    cells = [[("NULL" if v is None else str(v)) for v in r] for r in b["rows"]]
    w = [max(len(c), *(len(r[i]) for r in cells)) for i, c in enumerate(b["cols"])]
    line = lambda vals: " | ".join(v.ljust(w[i]) for i, v in enumerate(vals)).rstrip()
    return "\n".join([line(b["cols"]), "-+-".join("-" * x for x in w)] + [line(r) for r in cells])


def main():
    sections = content_a.SECTIONS + content_b.SECTIONS + content_c.SECTIONS
    qid, failures, ran = 0, [], 0
    for sid, sec in enumerate(sections, 1):
        sec["id"] = sid
        for q in sec["questions"]:
            qid += 1
            q["id"] = qid
            if q["run"]:
                blocks = run(q["code"])
                failed = any("error" in b for b in blocks)
                if failed != q["error"]:
                    failures.append(f"Q{qid} ({sec['title']}): " + (next(b["error"] for b in blocks if "error" in b) if failed else "expected an error but it succeeded"))
                q["out"] = blocks
                ran += 1
            for k in ("run", "error"):
                q.pop(k)
            if not q["code"]:
                for k in ("code", "lang", "play"):
                    q.pop(k)

    rng = random.Random(2026)
    challenges = []
    for cid, c in enumerate(CHALLENGES, 1):
        blocks = run(c["code"])
        if any("error" in b for b in blocks) or not any("cols" in b for b in blocks):
            failures.append(f"Puzzle {cid}: query failed or returned nothing: {blocks}")
            continue
        answer = as_text(blocks)
        if answer in c["wrong"] or len(set(c["wrong"])) != 3:
            failures.append(f"Puzzle {cid}: a distractor equals the real result {answer!r}")
            continue
        options = [answer, *c["wrong"]]
        rng.shuffle(options)
        challenges.append({"id": cid, "sid": c["sid"], "level": c["level"], "code": c["code"],
                           "options": options, "answer": options.index(answer), "e": c["e"]})

    for s in SNIPPETS:
        blocks = run(s["code"])
        if any("error" in b for b in blocks):
            failures.append(f"Snippet {s['id']}: {blocks[-1]['error']}")

    hero = []
    for h in HERO:
        blocks = run(h["code"])
        if any("error" in b for b in blocks):
            failures.append(f"Hero {h['file']}: {blocks[-1]['error']}")
            continue
        hero.append({**h, "out": pretty(blocks)})

    if failures:
        print("Build failed:\n  " + "\n  ".join(failures))
        sys.exit(1)

    con = fresh()
    tables = []
    for (name,) in con.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid"):
        cols = [{"name": r[1], "type": r[2], "pk": bool(r[5]), "fk": FOREIGN_KEYS.get(name, {}).get(r[1])}
                for r in con.execute(f"PRAGMA table_info({name})")]
        tables.append({"name": name, "rows": con.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0], "columns": cols})

    data = {"sections": sections, "challenges": challenges, "snippets": SNIPPETS, "hero": hero,
            "sampleDb": {"name": "MegaMart", "sql": SCHEMA.strip() + "\n" + SEED.strip(), "tables": tables}}
    OUT.write_text("// Generated by DB_PRJ/source/generate_data.py; do not edit by hand.\n"
                   f"window.DB_DATA = {json.dumps(data, ensure_ascii=False, indent=1)};\n", encoding="utf-8")
    total = sum(len(s["questions"]) for s in sections)
    print(f"Wrote {OUT.relative_to(HERE.parent.parent)}: {len(sections)} sections, {total} questions "
          f"({ran} SQL examples executed), {len(challenges)} puzzles, {len(SNIPPETS)} snippets, {len(tables)} tables")


if __name__ == "__main__":
    main()
