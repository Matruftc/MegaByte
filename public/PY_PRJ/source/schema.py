"""Tiny helpers the content files use to describe the question bank.

Q(...)  one question: level B/I/A, question, answer, explanation and an optional code example.
        run=False  : don't execute it while generating (e.g. needs Snowflake credentials)
        play=False : no "Run in playground" button (e.g. threads/asyncio.run don't work in Pyodide)
        lang       : "python" (default), "bash" or "text" for non-Python snippets
C(...)  one "predict the output" challenge. The correct option is produced by actually running
        the code, so answers can never be wrong; `wrong` holds three plausible distractors.
"""
from textwrap import dedent


def _code(code):
    return dedent(code).strip("\n") if code else None


def Q(level, q, a, e, code=None, run=True, play=True, lang="python"):
    assert level in "BIA", level
    return {"level": level, "q": q, "a": a, "e": e, "code": _code(code),
            "run": run and lang == "python" and code is not None, "play": play and lang == "python", "lang": lang}


def S(title, icon, ref, questions):
    return {"title": title, "icon": icon, "ref": ref, "questions": questions}


def C(sid, level, code, e, wrong):
    assert level in "BIA" and len(wrong) == 3
    return {"sid": sid, "level": level, "code": _code(code), "e": e, "wrong": wrong}
