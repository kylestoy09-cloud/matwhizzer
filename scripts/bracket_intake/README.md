# Bracket intake — prototype readers (2026-11-25)

Prototypes behind docs/workflows/bracket_intake.md and docs/reviews/bracket_source_quirks.md. Read-only: none of
these write to the database. They become the importer module.

- `flo_draw.py` — FloWrestling bracket PDF (one PDF per tournament) → each weight's draw (`seed Name (CODE)` / BYE).
- `track_draw.py` — TrackWrestling bracket PDF (region and district layouts) → draw.
- `rehearse_flo.py` — Flo PDF draw + CSV results → does every championship bout fit? Usage:
  `python3 -I scripts/bracket_intake/rehearse_flo.py scripts/bracket_intake '[["<pdf>","<csv>","<label>"]]'`
- `gt_draw_dryrun.mts` — GT round-results text → draw, checked against stored bouts (2024-25, 2025-26).
- `track_pdf_dryrun.mts` — Track PDF draws checked against stored region/district bouts.
