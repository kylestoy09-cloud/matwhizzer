#!/usr/bin/env python3
"""
scripts/import_sam_cali_csv.py

Import Sam Cali Battle for The Belt bouts from the verified CSV
(sam_cali_2025_full_bracket_matches.csv).

Usage:
  python scripts/import_sam_cali_csv.py [--dry-run] <csv_file>

CSV columns: weight, match, round, seed1, name1, team1, score1,
             seed2, name2, team2, score2

Round field encodes both the round label and method, e.g.:
  "Round of 32 F 3:49"  →  round_code=R1, method=Fall

Round code mapping (per bracket size):
  Weights WITHOUT Round of 64 (all except 132/138/144):
    Round of 32 → R1,  Round of 16 → R2
  Weights WITH Round of 64 (132, 138, 144):
    Round of 64 → R1,  Round of 32 → R2,  Round of 16 → R3
  Quarter-Finals (any truncation) → QF
  Semi-Finals → SF,  Finals → F
  Consi of 4 → CQF,  Consi-Semis → CSF
  3rd Place (any truncation) → 3rd_Place
  5th Place (any truncation) → 5th_Place

Skipped rows: NC (no-contest), M FOR (medical forfeit).
result_detail: "winner_score-loser_score" for Dec/MD/TF/SV/TB.
fall_time_seconds: parsed from "F M:SS" or "TF M:SS".
source_format = 'pdf'  (per Sam Cali tournament convention).
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from collections import defaultdict
from typing import Optional

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(**_):  # type: ignore[misc]
        pass

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: pip install supabase python-dotenv")
    sys.exit(1)

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
from import_sam_cali_pdf import (  # noqa: E402
    match_wrestler,
    get_or_create_wrestler,
    get_tournament_id,
    has_existing_bouts,
    _parse_abbreviated_name,
)

# ── Constants ──────────────────────────────────────────────────────────────────

SEASON        = "2025-26"
SOURCE_FORMAT = "pdf"
TOURNAMENT    = "Sam Cali Battle for The Belt"
WEIGHT_CLASSES = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

# Weights whose championship bracket starts from Round of 64
_HAS_ROUND_64: frozenset[int] = frozenset({132, 138, 144})

# ── Team abbreviation → school_id ─────────────────────────────────────────────

_TEAM_TO_SCHOOL: dict[str, Optional[int]] = {
    "B-R":      321,
    "BLOM":     81,
    "BRGF":     40,
    "CHER":     266,
    "CRAN":     93,
    "DBP":      11,
    "DEL":      141,
    "DEMA":     314,
    "DMNT":     2,
    "DPLC":     22,
    "DWMO":     41,     # Dwight Morrow
    "GLRK":     12,
    "HILL":     188,
    "HTWN":     240,
    "KINN":     33,
    "LAKE":     5,
    "LCM":      281,
    "MANA":     204,
    "MAT":      382,
    "MDTWP":    159,
    "MO":       172,
    "MOKN":     77,
    "MTWN":     114,
    "NBGN":     95,
    "NHGH":     35,
    "Nut":      106,
    "NWTN":     24,
    "OLDT":     6,
    "PARA":     57,
    "PCVY":     46,
    "PING":     144,
    "PISC":     183,
    "PJ23":     117,
    "PRMC":     153,
    "PSCT":     391,
    "PSKH":     15,
    "PSKV":     16,
    "RBC":      264,
    "RHS":      156,
    "RMPO":     17,
    "RP":       196,
    "SBP":      118,
    "SBW":      164,
    "SHP":      225,
    "SPAR":     26,
    "SPP":      157,
    "TNCK":     48,
    "TRE":      216,
    "WALL":     235,
    "WE":       39,
    "WHLS":     119,
    "odbridge": 187,    # Woodbridge (PDF truncation artifact in CSV)
    "CHAM":     397,    # Summit/Chatham
    # Tentative / unknown — school not resolved; bout still inserts with null ID
    "BBRK":     207,    # Brick Memorial [REVIEW]
    "GFA":      None,   # Unknown / possibly OOS
    "MS":       None,   # Unknown
    "MSCA":     None,   # Unknown
    "PEDD":     None,   # Unknown (Peddie School?)
    "PNGT":     None,   # Unknown
    "W/MP":     None,   # Unknown (Wayne/Morris Plains co-op?)
}

# ── Full name lookup (abbreviated bracket name → full name) ───────────────────
# Sourced from pipe_format_tournaments_dec2025.csv (Sam Cali section, 877 rows).
# Key: (weight_int, abbreviated_name_as_it_appears_in_bracket_csv)
# Value: (first_name, last_name) — used instead of "C." stub when creating wrestlers.
#
# Unresolved (not found in pipe CSV, will remain abbreviated stubs):
#   106lb: J. Barron (SPP), J. Rowinski (HTWN)
#   113lb: D. Adell (B-R) [pipe has Andrew Adell — initial mismatch, verify before merging]
#          D. D'Arcy (SBP)
#   120lb: J. Sgrulletta (GFA)
#   126lb: C. O'Connor (DPLC), N. O'Sullivan (CHAM), O. O'Leary (RHS), S. D'Arco (PJ23)
#   132lb: K. Landell (CHER) [pipe has Trenton Landell — initial mismatch]
#   165lb: T. O'Connor (MTWN)
#   190lb: B. Washington (DEMA) [pipe has Navell Washington — initial mismatch]
_FULL_NAME_LOOKUP: dict[tuple[int, str], tuple[str, str]] = {
    # 106lb
    (106, 'A. Dyki'):          ('Alexander',  'Dyki'),
    (106, 'A. Lopera'):        ('Anthony',    'Lopera'),
    (106, 'C. Parke'):         ('Calvin',     'Parke'),
    (106, 'C. Taylor'):        ('Carson',     'Taylor'),
    (106, 'D. Malfitano'):     ('Dominick',   'Malfitano'),
    (106, 'E. Shea'):          ('Eli',        'Shea'),
    (106, 'F. Andersen'):      ('Finn',       'Andersen'),
    (106, 'H. Karp'):          ('Hunter',     'Karp'),
    (106, 'J. Appello'):       ('Jake',       'Appello'),
    (106, 'J. Martin'):        ('Jordan',     'Martin'),
    (106, 'J. Mazzurco'):      ('Jake',       'Mazzurco'),
    (106, 'J. Tarantino'):     ('John',       'Tarantino'),
    (106, 'J. Weber'):         ('Jaxson',     'Weber'),
    (106, 'L. Bailey'):        ('Logan',      'Bailey'),
    (106, 'L. Rivara'):        ('Luke',       'Rivara'),
    (106, 'M. Gaft'):          ('Maxim',      'Gaft'),
    (106, 'M. Olivieri'):      ('Mikey',      'Olivieri'),
    (106, 'N. Mateus'):        ('Nicholas',   'Mateus'),
    (106, 'N. Nguyen'):        ('Nicholas',   'Nguyen'),
    (106, 'N. Raggazzone'):    ('Niko',       'Raggazzone'),
    (106, 'R. Rodriguez'):     ('Ronnie',     'Rodriguez'),
    (106, 'R. Torres'):        ('Rafael',     'Torres'),
    (106, 'S. Cantarero'):     ('Sebastian',  'Cantarero'),
    (106, 'S. Hanley'):        ('Seamus',     'Hanley'),
    (106, 'S. Mazin'):         ('Sam',        'Mazin'),
    (106, 'S. Vidal'):         ('Steven',     'Vidal'),
    (106, 'V. Delaney'):       ('Valen',      'Delaney'),
    (106, 'V. Petriello'):     ('Vincent',    'Petriello'),
    (106, 'W. Ratz'):          ('William',    'Ratz'),
    # 113lb
    (113, 'A. Camargo'):       ('Alessandro', 'Camargo'),
    (113, 'A. Meehan'):        ('Aidan',      'Meehan'),
    (113, 'B. Chacko'):        ('Ben',        'Chacko'),
    (113, 'B. Ruiz'):          ('Braedan',    'Ruiz'),
    (113, 'C. Berkowitz'):     ('Chase',      'Berkowitz'),
    (113, 'C. DePersis'):      ('Connor',     'DePersis'),
    (113, 'C. Pacor'):         ('Caleb',      'Pacor'),
    (113, 'C. Powell'):        ('Christopher','Powell'),
    (113, 'D. Bubnowski'):     ('David',      'Bubnowski'),
    (113, 'D. Coppola'):       ('Dominic',    'Coppola'),
    (113, 'D. Litterio'):      ('Dominic',    'Litterio'),
    (113, 'D. Petulla'):       ('Dominic',    'Petulla'),
    (113, 'D. Sierra'):        ('Dylan',      'Sierra'),
    (113, 'D. Torsone'):       ('DJ',         'Torsone'),
    (113, 'J. Cambell'):       ('Jacob',      'Campbell'),
    (113, 'J. Feliciano'):     ('Julius',     'Feliciano'),
    (113, 'J. Gallagher'):     ('Joseph',     'Gallagher'),
    (113, 'M. Barra'):         ('Marco',      'Barra'),
    (113, 'M. Emmert'):        ('Maxwell',    'Emmert'),
    (113, 'N. Perez'):         ('Noah',       'Perez'),
    (113, 'O. Carrillo-Sol…'): ('Omar',       'Carrillo-Solano'),
    (113, 'P. Nitche'):        ('Preston',    'Nitche'),
    (113, 'S. Tracey'):        ('Shea',       'Tracey'),
    (113, 'T. Connelly'):      ('Tanner',     'Connelly'),
    (113, 'T. Rosemeyer'):     ('Tristan',    'Rosemeyer'),
    (113, 'V. Iaquinto'):      ('Vincent',    'Iaquinto'),
    (113, 'Z. Shama'):         ('Zane',       'Shama'),
    # 120lb
    (120, 'A. Matias'):        ('Aidan',      'Matias'),
    (120, 'A. Murado'):        ('Alec',       'Murado'),
    (120, 'B. Banks'):         ('Benjamin',   'Banks'),
    (120, 'B. Cole'):          ('Benjamin',   'Cole'),
    (120, 'B. Jarosz'):        ('Bryson',     'Jarosz'),
    (120, 'C. Kastner'):       ('Chase',      'Kastner'),
    (120, 'C. Sampedro'):      ('Camilo',     'Sampedro'),
    (120, 'D. DeLuca'):        ('Demitri',    'DeLuca'),
    (120, 'D. Montalvan'):     ('Dan',        'Montalvan'),
    (120, 'D. Vazquez'):       ('David',      'Vazquez'),
    (120, 'E. Blanchard'):     ('Evan',       'Blanchard'),
    (120, 'G. Stempkow…'):     ('Gavin',      'Stempkowski'),
    (120, 'J. Barron'):        ('John',       'Barron'),
    (120, 'J. Ciullo'):        ('Joseph',     'Ciullo'),
    (120, 'J. Finkelstein'):   ('Jack',       'Finkelstein'),
    (120, 'J. Leneus'):        ('Jayden',     'Leneus'),
    (120, 'J. Polanco'):       ('Julian',     'Polanco'),
    (120, 'J. Rowinski'):      ('Joseph',     'Rowinski'),
    (120, 'L. Pelc'):          ('Lucas',      'Pelc'),
    (120, 'L. Perez'):         ('Lucas',      'Perez'),
    (120, 'L. Perillo'):       ('Luca',       'Perillo'),
    (120, 'M. Abuhadba'):      ('Muhammad',   'Abuhadba'),
    (120, 'M. Daly'):          ('Michael',    'Daly'),
    (120, 'M. Romero'):        ('Mason',      'Romero'),
    (120, 'M. Torres'):        ('Morgan',     'Torres'),
    (120, 'N. Gallo'):         ('Nicholas',   'Gallo'),
    (120, 'N. Hernandez'):     ('Noah',       'Hernandez'),
    (120, 'P. Trezza'):        ('Peter',      'Trezza'),
    (120, 'R. Lightfoot'):     ('Reid',       'Lightfoot'),
    (120, 'R. Rodriguez'):     ('Robert',     'Rodriguez'),
    (120, 'S. Malfitano'):     ('Steven',     'Malfitano'),
    # 126lb
    (126, 'A. Martin'):        ('Andre',      'Martin'),
    (126, 'B. Housel'):        ('Braydon',    'Housel'),
    (126, 'C. Coreggio'):      ('Cassen',     'Correggio'),
    (126, 'C. Klein'):         ('Connor',     'Klein'),
    (126, 'C. Severs'):        ('Chace',      'Severs'),
    (126, 'C. Sontz'):         ('Cameron',    'Sontz'),
    (126, 'D. Rosen'):         ('Dan',        'Rosen'),
    (126, 'G. Gutierrez'):     ('Giovanni',   'Gutierrez'),
    (126, 'J. Bucco'):         ('Jax',        'Bucco'),
    (126, 'J. Cruz'):          ('Jayden',     'Cruz'),
    (126, 'J. Pellicci'):      ('Joseph',     'Pellicci'),
    (126, 'J. Richardson'):    ('Jacob',      'Richardson'),
    (126, 'J. Sulca'):         ('Jaydon',     'Sulca'),
    (126, 'J. Viola'):         ('Joseph',     'Viola'),
    (126, 'K. Battulga'):      ('Khuchuleg',  'Battulga'),
    (126, 'L. Churpakovi…'):   ('Lucas',      'Churpakovich'),
    (126, 'M. Droz'):          ('Mariano',    'Droz'),
    (126, 'M. Echeverri'):     ('Michael',    'Echeverri'),
    (126, 'M. Graeber'):       ('Max',        'Graeber'),
    (126, 'M. Kleynshvag'):    ('Michael',    'Kleynshvag'),
    (126, 'R. Horner'):        ('Ryan',       'Horner'),
    (126, 'R. Hubert'):        ('Rohi',       'Hubert'),
    (126, 'R. Spinelli'):      ('Ryan',       'Spinelli'),
    (126, 'V. DeSomma'):       ('Vincent',    'DeSomma'),
    # 132lb
    (132, 'A. Cedeno'):        ('Adan',       'Cedeno'),
    (132, 'A. Morero'):        ('Andre',      'Morero'),
    (132, 'A. Spina'):         ('Antonio',    'Spina'),
    (132, 'A. Stover'):        ('Anthony',    'Stover'),
    (132, 'C. DeAngelo'):      ('Cole',       'DeAngelo'),
    (132, 'C. Glory'):         ('Connor',     'Glory'),
    (132, 'D. Butenewicz'):    ('David',      'Butenewicz'),
    (132, 'D. Kelly'):         ('Dontae',     'Kelly'),
    (132, 'D. Weber'):         ('Dalton',     'Weber'),
    (132, 'J. Corelli'):       ('Jack',       'Corelli'),
    (132, 'J. Francis'):       ('Jack',       'Francis'),
    (132, 'J. Monto'):         ('Joseph',     'Monto'),
    (132, 'J. Rizzuto'):       ('Joseph',     'Rizzuto'),
    # (132, 'K. Landell') — omitted: pipe CSV has "Trenton Landell" (T≠K), initial mismatch
    (132, 'M. Oliveri'):       ('Michael',    'Oliveri'),
    (132, 'M. Velez'):         ('Mathew',     'Velez Intriago'),
    (132, 'N. Marchetti'):     ('Nicholas',   'Marchetti'),
    (132, 'P. Terranova'):     ('Peter',      'Terranova'),
    (132, 'R. DeLorenzo II'):  ('Richard',    'DeLorenzo II'),
    (132, 'R. Dyki'):          ('Ryan',       'Dyki'),
    (132, 'R. Fontanelli'):    ('Rocco',      'Fontanelli'),
    (132, 'R. Hibler'):        ('River',      'Hibler'),
    (132, 'R. Mohammed'):      ('Rayan',      'Mohammad'),
    # 138lb
    (138, 'A. Vann'):          ('Amari',      'Vann'),
    (138, 'A. Zelna'):         ('Alex',       'Zelna'),
    (138, 'B. Dougherty'):     ('Bryan',      'Dougherty'),
    (138, 'C. Cifelli'):       ('Christopher','Cifelli'),
    (138, 'C. Hansen'):        ('Chase',      'Hansen'),
    (138, 'C. Kelesidis'):     ('Chris',      'Kelesidis'),
    (138, 'D. Sawyer'):        ('David',      'Sawyer'),
    (138, 'D. cerciello'):     ('Dylan',      'Cerciello'),
    (138, 'I. Hernandez'):     ('Isaias',     'Hernandez'),
    (138, 'J. Abramson'):      ('Jack',       'Abramson'),
    (138, 'J. Puleo'):         ('Jared',      'Puleo'),
    (138, 'L. Lill'):          ('Landon',     'Lill'),
    (138, 'L. Rafeh'):         ('Lucas',      'Rafeh'),
    (138, 'L. Williams'):      ('Liam',       'Williams'),
    (138, 'M. Abuharthieh'):   ('Malik',      'Abuharthieh'),
    (138, 'M. Miller'):        ('Matthew',    'Miller'),
    (138, 'N. Kadar'):         ('Nathan',     'Kadar'),
    (138, 'N. Marchetti'):     ('Nicholas',   'Marchetti'),
    (138, 'N. Pugliese'):      ('Nicky',      'Pugliese'),
    (138, 'R. Douangmala'):    ('Robert',     'Douangmala'),
    (138, 'R. Douangma…'):     ('Robert',     'Douangmala'),
    (138, 'R. KOZUBAL'):       ('Rhys',       'Kozubal'),
    (138, 'R. connors'):       ('Ryder',      'Connors'),
    (138, 'S. Brown'):         ('Sean',       'Brown'),
    # 144lb
    (144, 'A. Dispensa'):      ('Anthony',    'Dispensa'),
    (144, 'A. Matter'):        ('Andrew',     'Matter'),
    (144, 'A. Pinto'):         ('Adrian',     'Pinto'),
    (144, 'B. Ingram'):        ('Bradley',    'Ingram'),
    (144, 'B. Karvoski'):      ('Brighton',   'Karvoski'),
    (144, 'B. Katimbang'):     ('Brendon',    'Katimbang'),
    (144, 'C. Anzaldo'):       ('CJ',         'Anzaldo'),
    (144, 'D. Biegel'):        ('Dylan',      'Biegel'),
    (144, 'D. Marrero'):       ('Dominick',   'Marrero'),
    (144, 'D. Rodriguez'):     ('Darryen',    'Rodriguez'),
    (144, 'D. Rotte'):         ('Delvan',     'Rotte'),
    (144, 'E. Delacruz'):      ('Ethan',      'Delacruz'),
    (144, 'E. Perez'):         ('Ethan',      'Perez'),
    (144, 'I. Konstantini…'):  ('Ilias',      'Konstantinidis'),
    (144, 'J. Owen'):          ('John',       'Owen'),
    (144, 'L. Ramos'):         ('Luken',      'Ramos'),
    (144, 'M. Ventura'):       ('Max',        'Ventura'),
    (144, 'N. Emmert'):        ('Nathan',     'Emmert'),
    (144, 'N. Pallitto'):      ('Nicholas',   'Pallitto'),
    (144, 'S. Morris'):        ('Sean',       'Morris'),
    (144, 'X. Gonzalez'):      ('Xavier',     'Gonzalez'),
    # 150lb
    (150, 'A. Brant'):         ('Andrew',     'Brant'),
    (150, 'A. Bray'):          ('Anthony',    'Bray'),
    (150, 'A. Liss'):          ('Alexander',  'Liss'),
    (150, 'A. Russo'):         ('Anthony',    'Russo'),
    (150, 'B. Meserlian'):     ('Bryce',      'Meserlian'),
    (150, 'B. Tiernan'):       ('Brady',      'Tiernan'),
    (150, 'C. Jung'):          ('Christian',  'Jung'),
    (150, 'D. Arroyo'):        ('Daniel',     'Arroyo'),
    (150, 'D. Grayson'):       ('Devin',      'Grayson'),
    (150, 'D. Raveis'):        ('Dane',       'Raveis'),
    (150, 'D. VonderLind…'):   ('Damian',     'Vonderlinden'),
    (150, 'E. Triola'):        ('Enzo',       'Triola'),
    (150, 'I. Vuka'):          ('Ilirian',    'Vuka'),
    (150, 'J. Mahoney'):       ('Joseph',     'Mahoney'),
    (150, 'J. Riccio'):        ('Joseph',     'Riccio'),
    (150, 'J. Walker'):        ('Jacob',      'Walker'),
    (150, 'K. Sheridan'):      ('Kane',       'Sheridan'),
    (150, 'L. Riker'):         ('Luke',       'Riker'),
    (150, 'L. Valentin'):      ('Lukas',      'Valentin'),
    (150, 'L. Zimmer'):        ('Logan',      'Zimmer'),
    (150, 'M. Boulard'):       ('Michael',    'Boulard'),
    (150, 'M. Pocius'):        ('Michael',    'Pocius'),
    (150, 'N. Barone'):        ('Nicholas',   'Barone'),
    (150, 'O. Gluckow'):       ('Oskar',      'Gluckow'),
    (150, 'T. Grageda'):       ('Trevor',     'Grageda'),
    (150, 'T. King'):          ('Tyler',      'King'),
    (150, 'V. Castrofilip…'):  ('Vin',        'Castrofilippo'),
    (150, 'W. Clasen'):        ('William',    'Clasen'),
    # 157lb
    (157, 'C. Hoffman'):       ('Cael',       'Hoffman'),
    (157, 'C. Jasinkiewicz'):  ('Cole',       'Jasinkiewicz'),
    (157, 'C. Smyth'):         ('Colin',      'Smyth'),
    (157, 'D. Byrne'):         ('Daniel',     'Byrne'),
    (157, 'D. LiSanti'):       ('Dominic',    'Lisanti'),
    (157, 'E. Hufnagel'):      ('Eddie',      'Hufnagel'),
    (157, 'F. Monto'):         ('Frank',      'Monto'),
    (157, 'H. Asatrian.Jr'):   ('Harry',      'Asatrian'),
    (157, 'J. Devlin'):        ('Jamison',    'Devlin'),
    (157, 'J. Jones'):         ('Jacob',      'Jones'),
    (157, 'J. Marsella'):      ('Jeremy',     'Marsella'),
    (157, 'J. McGrath'):       ('Jeremy',     'McGrath'),
    (157, 'J. Ruiz'):          ('Joseph',     'Ruiz'),
    (157, 'L. Meisenhol…'):    ('Lucas',      'Meisenholder'),
    (157, 'L. Scholz'):        ('Luke',       'Scholz'),
    (157, 'L. Stempkows…'):    ('Luke',       'Stempkowski'),
    (157, 'M. Summa'):         ('Matt',       'Summa'),
    (157, 'M. Tafida'):        ('Muhammed',   'Tafida'),
    (157, 'O. Miller'):        ('Owen',       'Miller'),
    (157, 'P. Quinn'):         ('Parker',     'Quinn'),
    (157, 'R. Ritacco'):       ('Roman',      'Ritacco'),
    (157, 'S. Love'):          ('Sean',       'Love'),
    (157, 'T. Burke'):         ('Thomas',     'Burke'),
    (157, 'T. Morodan'):       ('Tyler',      'Morodan'),
    (157, 'T. Tracey'):        ('Torrin',     'Tracey'),
    (157, 'T. Whartnaby'):     ('Tyler',      'Whartnaby'),
    # 165lb
    (165, 'A. DeLorenzo'):     ('Anthony',    'DeLorenzo'),
    (165, 'A. Rotbaum'):       ('Aidan',      'Rotbaum'),
    (165, 'B. Causillas'):     ('Branden',    'Causillas'),
    (165, 'B. Watkins'):       ('Blake',      'Watkins'),
    (165, 'C. Ferranti'):      ('Chris',      'Ferranti'),
    (165, 'C. Pote'):          ('Cameron',    'Pote'),
    (165, 'C. Rodriguez'):     ('Cristian',   'Rodriguez'),
    (165, 'C. Vital'):         ('Colby',      'Vital'),
    (165, 'D. Kyzima'):        ('Daniel',     'Kyzima'),
    (165, 'D. Lopes'):         ('David',      'Lopes'),
    (165, 'F. Mckeon'):        ('Finn',       'McKeon'),
    (165, 'G. Giordano'):      ('Giammaria',  'Giordano'),
    (165, 'J. Acinapura'):     ('Jared',      'Acinapura'),
    (165, 'J. Aiello'):        ('Joseph',     'Aiello'),
    (165, 'J. Soy'):           ('Jayden',     'Soy'),
    (165, 'K. Montoya'):       ('Kaden',      'Montoya'),
    (165, 'L. Dellavolpe'):    ('Louis',      'DellaVolpe'),
    (165, 'L. Dimitrakiou'):   ('Leo',        'Dimitrakiou'),
    (165, 'L. Katsigiannis'):  ('Lukas',      'Katsigiannis'),
    (165, 'L. Pelletier'):     ('Lucas',      'Pelletier'),
    (165, 'L. Schulmann'):     ('Levi',       'Schulmann'),
    (165, 'M. McCann'):        ('Matthew',    'McCann'),
    (165, 'M. Tripoli'):       ('Max',        'Tripoli'),
    (165, 'N. Konopka'):       ('Nicholas',   'Konepka'),
    (165, 'R. Attenboro…'):    ('Robert',     'Attenborough'),
    (165, 'R. Willi'):         ('Ryan',       'Willi'),
    (165, 'S. Coppolo'):       ('Scott',      'Coppolo'),
    (165, 'S. Mello'):         ('Sincere',    'Mello'),
    (165, 'T. McNamara'):      ('Timothy',    'McNamara'),
    (165, 'W. Tarna'):         ('Will',       'Tarna'),
    # 175lb
    (175, 'A. Helphingsti…'):  ('Alex',       'Helphingstine'),
    (175, 'A. Maiden'):        ('Antonio',    'Maiden'),
    (175, 'B. Papa'):          ('Brandon',    'Papa'),
    (175, 'C. Dunham'):        ('Cole',       'Dunham'),
    (175, 'F. Cavanaugh'):     ('Finn',       'Cavanaugh'),
    (175, 'F. Cespedes'):      ('Farel',      'Cespedes'),
    (175, 'I. Rojas'):         ('Isaiah',     'Rojas'),
    (175, 'J. Acinapura'):     ('Joey',       'Acinapura'),
    (175, 'J. Bullock'):       ('Justin',     'Bullock'),
    (175, 'J. Harty'):         ('Jack',       'Harty'),
    (175, 'J. Leiman'):        ('Jack',       'Leiman'),
    (175, 'K. Morgan'):        ('Kwabena',    'Morgan'),
    (175, 'L. Hackney'):       ('Landon',     'Hackney'),
    (175, 'L. Rickard'):       ('Logan',      'Rickard'),
    (175, 'L. Shivas'):        ('Luke',       'Shivas'),
    (175, 'L. Van Veen'):      ('Lukas',      'Van Veen'),
    (175, 'M. Cmielewski'):    ('Matt',       'Cmielewski'),
    (175, 'N. Nagle'):         ('Noah',       'Nagle'),
    (175, 'P. Ezeanii'):       ('Prince',     'Ezenanii'),
    (175, 'R. Bernholz'):      ('Ryder',      'Bernholz'),
    (175, 'R. Engle'):         ('Ryan',       'Engle'),
    (175, 'S. Goins'):         ('Sebastian',  'Goins'),
    (175, 'S. Morrell'):       ('Shane',      'Morrell'),
    (175, 'S. Rodriguez'):     ('Santino',    'Rodriguez'),
    (175, 'T. Dochnal'):       ('Tim',        'Dochnal'),
    (175, 'W. Capizzi'):       ('William',    'Capizzi'),
    (175, 'X. Torres'):        ('Xzavier',    'Torres'),
    (175, 'Z. Lombreglia'):    ('Zach',       'Lombreglia'),
    # 190lb
    (190, 'A. Bainbridge'):    ('Alex',       'Bainbridge'),
    (190, 'A. Cianfrocca'):    ('Anthony',    'Cianfrocca'),
    (190, 'A. Kirgezmis'):     ('Artun',      'Kirgezmis'),
    (190, 'A. Wagner'):        ('Anthony',    'Wagner'),
    (190, 'D. Douglass'):      ('David',      'Douglass'),
    (190, 'D. Shiroff'):       ('Dane',       'Shiroff'),
    (190, 'D. Thomson'):       ('David',      'Thomson'),
    (190, 'G. Oelsner'):       ('Guy',        'Oelsner'),
    (190, 'G. Sawyer'):        ('Greg',       'Sawyer'),
    (190, 'H. Rodriguez'):     ('Hector',     'Rodriguez'),
    (190, 'J. Cutruzzula'):    ('Joe',        'Cutruzzula'),
    (190, 'J. Sammarta…'):     ('John',       'Sammartano'),
    (190, 'K. Rafferty'):      ('Kevin',      'Rafferty'),
    (190, 'L. Fitzsimmons'):   ('Landon',     'Fitzsimmons'),
    (190, 'L. Lewis'):         ('Lemuel',     'Lewis'),
    (190, 'M. Brown-Cab…'):    ('Marlowe',    'Brown-Cabarris'),
    (190, 'M. Damerjian'):     ('Michael',    'Damerjian'),
    (190, 'M. Morelli'):       ('Michael',    'Morelli'),
    (190, 'M. Sutton'):        ('Matthew',    'Sutton'),
    (190, 'N. Mattessich'):    ('Nevin',      'Mattessich'),
    (190, 'R. Penny'):         ('Rocky',      'Penny'),
    (190, 'T. Neiva'):         ('Tyler',      'Neiva'),
    # 215lb
    (215, 'A. Arguello'):      ('Ashton',     'Arguello'),
    (215, 'A. Cassidy'):       ('August',     'Cassidy'),
    (215, 'A. Cosar'):         ('Atkan',      'Cosar'),
    (215, 'A. Hidalgo'):       ('Aren',       'Hidalgo'),
    (215, 'B. Ismael'):        ('Brody',      'Ismael'),
    (215, 'C. Bonita'):        ('Carlito',    'Bonita'),
    (215, 'C. Britton'):       ('Caden',      'Britton'),
    (215, 'C. Diaz'):          ('Christopher','Diaz'),
    (215, 'D. Oxmann'):        ('Delvin',     'Oxmann'),
    (215, 'G. Abbruzzese'):    ('Grayson',    'Abbruzzese'),
    (215, 'H. woolley'):       ('Hayden',     'Woolley'),
    (215, 'J. Barrera'):       ('Josiah',     'Barrera'),
    (215, 'L. Hassloch'):      ('Liam',       'Hassloch'),
    (215, 'M. Morrissey'):     ('Matthew',    'Morrissey'),
    (215, 'N. Fabunan'):       ('Nate',       'Fabunan'),
    (215, 'N. Gonzalez'):      ('Nicolas',    'Gonzalez'),
    (215, 'R. Burke'):         ('Ryan',       'Burke'),
    (215, 'T. Bayarkhuu'):     ('Tuguldur',   'Bayarkhuu'),
    (215, 'T. Levash'):        ('Trent',      'Levash'),
    (215, 'T. Skversky'):      ('Theodore',   'Skversky'),
    (215, 'W. Sisco'):         ('Wyatt',      'Sisco'),
    (215, 'Z. Ventola'):       ('Zachary',    'Ventola'),
    # 285lb
    (285, 'A. Alfonso'):       ('Anthony',    'Alfonso'),
    (285, 'A. Evaristo'):      ('Anthony',    'Evaristo'),
    (285, 'A. Fox'):           ('Ayden',      'Fox'),
    (285, 'A. Hooey'):         ('Austin',     'Hooey'),
    (285, 'A. Moser'):         ('August',     'Moser'),
    (285, 'D. Black'):         ('Donavan',    'Black'),
    (285, 'D. Infantes'):      ('Domenick',   'Infantes'),
    (285, 'E. Clauburg'):      ('Eric',       'Clauburg'),
    (285, 'G. Gomez'):         ('Gabriel',    'Gomez'),
    (285, 'G. Medina'):        ('Gabriel',    'Medina-Coello'),
    (285, 'J. Hearon IV'):     ('John',       'Hearon'),
    (285, 'J. Martini'):       ('Jared',      'Martini'),
    (285, 'L. Palescando…'):   ('Lorenzo',    'Palescandolo'),
    (285, 'M. Georges'):       ('Max',        'Georges'),
    (285, 'M. Oakes'):         ('Michael',    'Oakes'),
    (285, 'M. Targali'):       ('Mohammad',   'Targali'),
    (285, 'N. Brewer'):        ('Nolan',      'Brewer'),
    (285, 'N. Duarte'):        ('Nicholas',   'Duarte'),
    (285, 'N. McCrone'):       ('Nathaniel',  'McCrone'),
    (285, 'P. Bertole'):       ('Philip',     'Bertole'),
    (285, 'R. Schnieder'):     ('Ryan',       'Schneider'),
    (285, 'S. Brown'):         ('Sean',       'Brown'),
    (285, 'S. Jean Marie'):    ('Samuel',     'Jean Marie'),
    (285, 'V. Williams'):      ('Vincent',    'Williams'),
}


def _resolve_name(weight: int, abbrev: str) -> str:
    """Return full 'First Last' name if known, otherwise return abbrev unchanged."""
    entry = _FULL_NAME_LOOKUP.get((weight, abbrev))
    if entry:
        first, last = entry
        return f"{first} {last}"
    return abbrev


# ── Round parsing ─────────────────────────────────────────────────────────────

# Each entry: (compiled prefix regex, round_code_fn(weight) → str)
# Patterns consume as much of the round-label prefix as possible.
# "quarte[r]?" matches both "Quarter" (7) and "Quarte…" (6) truncations.
# "consi\s+of\s+\d" consumes the bracket size too ("Consi of 4").
_ROUND_RULES: list[tuple[re.Pattern, object]] = [
    (re.compile(r'round\s+of\s+64',    re.I), lambda w: 'R1'),
    (re.compile(r'round\s+of\s+32',    re.I), lambda w: 'R1' if w not in _HAS_ROUND_64 else 'R2'),
    (re.compile(r'round\s+of\s+16',    re.I), lambda w: 'R2' if w not in _HAS_ROUND_64 else 'R3'),
    (re.compile(r'quarte[r]?',         re.I), lambda w: 'QF'),
    (re.compile(r'semi.finals',        re.I), lambda w: 'SF'),
    (re.compile(r'finals',             re.I), lambda w: 'F'),
    (re.compile(r'consi.semis',        re.I), lambda w: 'CSF'),
    (re.compile(r'consi\s+of\s+\d',   re.I), lambda w: 'CQF'),
    (re.compile(r'3rd',                re.I), lambda w: '3rd_Place'),
    (re.compile(r'5th',                re.I), lambda w: '5th_Place'),
]

# Method tokens that can appear at the start of a method string
_METHOD_START_RE = re.compile(r'\b(TF|DEC|MD|NC|M\s+FOR|M\.FOR|MED\.)\b|(?<!\w)(F)\s+\d', re.I)


def _clean_method(s: str) -> str:
    """Strip any truncation artifact (e.g. '-Fin… ', 'Pla… ', '4 ') from the
    front of a method string, leaving only the actual method token."""
    m = _METHOD_START_RE.search(s)
    if m and m.start() > 0:
        return s[m.start():].strip()
    return s.strip()


def _split_round_method(raw: str, weight: int) -> tuple[Optional[str], str]:
    """
    '3rd Pla… F 3:38'      → ('3rd_Place', 'F 3:38')
    'Quarter-Fin… DEC SV'  → ('QF',        'DEC SV')
    'Consi of 4 M FOR'     → ('CQF',       'M FOR')
    'Quarte… M FOR 4:58'   → ('QF',        'M FOR 4:58')
    Returns (round_code, method_str). round_code is None if unrecognized.
    """
    for pat, code_fn in _ROUND_RULES:
        m = pat.match(raw.strip())
        if m:
            rest = raw[m.end():].lstrip('…. ').strip()
            rest = _clean_method(rest)
            return code_fn(weight), rest  # type: ignore[operator]
    return None, raw.strip()


# ── Method parsing ─────────────────────────────────────────────────────────────

_TIME_PAT = re.compile(r'(\d+):(\d{2})')


def _parse_time_str(s: str) -> Optional[int]:
    m = _TIME_PAT.search(s)
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2))


def _parse_method(
    raw: str, winner_score: int, loser_score: int
) -> tuple[Optional[str], Optional[str], Optional[int], bool]:
    """
    Returns (result_type, result_detail, fall_time_seconds, should_skip).
    result_detail = 'winner_score-loser_score' for Dec/MD/TF/SV/TB.
    should_skip=True for NC and M FOR.
    """
    r = raw.strip()
    u = r.upper()
    score_str = f"{winner_score}-{loser_score}"

    if not u or re.match(r'^NC$', u):
        return None, None, None, True

    if re.match(r'^M[\s.]?FOR|^MED\.?\s*FOR', u):
        return None, None, None, True

    if re.match(r'^F\b', u):
        return 'Fall', None, _parse_time_str(r), False

    if re.match(r'^TF\b', u):
        return 'TF', score_str, _parse_time_str(r), False

    if re.match(r'^(MD|DEC)\s+SV\b', u):
        return 'SV-1', score_str, None, False

    if re.match(r'^DEC\s+TB', u):
        return 'TB-1', score_str, None, False

    if u == 'MD':
        return 'MD', score_str, None, False

    if u == 'DEC':
        return 'Dec', score_str, None, False

    # Unknown method — flag but still try to import
    return r, score_str if score_str else None, None, False


# ── Bracket-progression tiebreaker ────────────────────────────────────────────

def _build_appearance_index(rows: list[dict]) -> dict[tuple[int, str], set[str]]:
    """
    For each (weight, name_prefix) → set of all match_ids that wrestler appears in
    (as winner OR loser). Appearing in any round proves that wrestler advanced past
    the previous round, which lets us resolve tied-score bouts.
    """
    idx: dict[tuple[int, str], set[str]] = defaultdict(set)
    for r in rows:
        wt = int(r['weight'])
        idx[(wt, r['name1'].strip()[:10])].add(r['match'])
        idx[(wt, r['name2'].strip()[:10])].add(r['match'])
    return idx


# Round ordering for "which round comes after which" — used to check advancement
_ROUND_ORDER = ['R1', 'R2', 'R3', 'QF', 'SF', 'F', 'CSF', 'CQF', '3rd_Place', '5th_Place']


def _resolve_tied_winner(
    row: dict,
    appearance_idx: dict,
    all_rows: list[dict],
    row_round_code: str,
) -> Optional[int]:
    """
    Determine winner of a tied-score bout.
    Strategy: if exactly one wrestler appears in any OTHER match in the same
    weight class, that wrestler won this bout (bracket progression).
    Returns 1 or 2 (1-indexed), or None if unresolvable.
    """
    wt  = int(row['weight'])
    mid = row['match']
    n1  = row['name1'].strip()[:10]
    n2  = row['name2'].strip()[:10]

    other1 = appearance_idx.get((wt, n1), set()) - {mid}
    other2 = appearance_idx.get((wt, n2), set()) - {mid}

    if other1 and not other2:
        return 1
    if other2 and not other1:
        return 2
    if other1 and other2:
        # Both appear in other matches — pick whoever appears in the later round
        # by looking at the round code of their next match
        def latest_round(match_ids: set[str]) -> int:
            best = -1
            for other_mid in match_ids:
                for r2 in all_rows:
                    if r2['match'] == other_mid and int(r2['weight']) == wt:
                        rc, _ = _split_round_method(r2['round'], wt)
                        if rc in _ROUND_ORDER:
                            best = max(best, _ROUND_ORDER.index(rc))
            return best
        lr1 = latest_round(other1)
        lr2 = latest_round(other2)
        if lr1 > lr2:
            return 1
        if lr2 > lr1:
            return 2
    return None  # unresolvable


# ── Main import ───────────────────────────────────────────────────────────────

def run(args: argparse.Namespace) -> None:
    sep = "─" * 72

    # ── Load environment ───────────────────────────────────────────────────────
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    for env_file in [".env.local", ".env"]:
        candidate = os.path.join(project_root, env_file)
        if os.path.exists(candidate):
            load_dotenv(candidate, override=False)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)

    client: Client = create_client(url, key)

    # ── Duplicate guard ────────────────────────────────────────────────────────
    tid = get_tournament_id(client)
    if tid is None:
        print(f"ERROR: Tournament '{TOURNAMENT}' not found in in_season_tournaments.")
        print("Create the tournament row first, then re-run.")
        sys.exit(1)

    if has_existing_bouts(tid, client):
        res = client.from_("tournament_bouts") \
            .select("id", count="exact") \
            .eq("in_season_tournament_id", tid) \
            .execute()
        print(f"STOP: {res.count} bout(s) already exist for '{TOURNAMENT}'.")
        print("Delete them manually before re-importing.")
        sys.exit(1)

    print(f"Tournament ID: {tid}")
    print(f"Existing bouts: 0 — safe to import")
    print()

    # ── Read CSV ───────────────────────────────────────────────────────────────
    with open(args.file, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    print(f"CSV rows read: {len(rows)}")

    # Build appearance index for tied-score bracket-progression resolution
    appearance_idx = _build_appearance_index(rows)

    # ── Process rows ───────────────────────────────────────────────────────────
    bouts:        list[dict] = []
    review_items: list[str]  = []
    skipped_nc    = 0
    skipped_tied  = 0
    new_wrestler_cache: dict[tuple, Optional[str]] = {}

    unknown_teams: set[str] = set()

    for row in rows:
        weight  = int(row['weight'])
        match_n = row['match'].strip()
        raw_rnd = row['round'].strip()
        name1   = row['name1'].strip()
        team1   = row['team1'].strip()
        score1  = int(row['score1'])
        name2   = row['name2'].strip()
        team2   = row['team2'].strip()
        score2  = int(row['score2'])

        # ── Split round label from method ──────────────────────────────────────
        round_code, method_raw = _split_round_method(raw_rnd, weight)

        if round_code is None:
            review_items.append(
                f"  UNKNOWN ROUND  {weight}lb m#{match_n}: {raw_rnd!r}"
            )
            continue

        # ── Parse method ───────────────────────────────────────────────────────
        # Determine winner first to get ordered scores for result_detail
        if score1 > score2:
            winner_n, loser_n   = name1, name2
            winner_t, loser_t   = team1, team2
            winner_s, loser_s   = score1, score2
            winner_pos          = 1
        elif score2 > score1:
            winner_n, loser_n   = name2, name1
            winner_t, loser_t   = team2, team1
            winner_s, loser_s   = score2, score1
            winner_pos          = 2
        else:
            # Tied score — check NC/M FOR first, then try bracket-progression
            rt_pre, rd_pre, secs_pre, skip_pre = _parse_method(method_raw, score1, score2)
            if skip_pre:
                skipped_nc += 1
                continue
            resolved = _resolve_tied_winner(row, appearance_idx, rows, round_code)
            if resolved == 1:
                winner_n, loser_n = name1, name2
                winner_t, loser_t = team1, team2
                winner_s, loser_s = score1, score2
                winner_pos = 1
            elif resolved == 2:
                winner_n, loser_n = name2, name1
                winner_t, loser_t = team2, team1
                winner_s, loser_s = score2, score1
                winner_pos = 2
            else:
                review_items.append(
                    f"  TIE SCORE      {weight}lb m#{match_n} {round_code} "
                    f"[{method_raw}]: {name1}({team1}) {score1} vs "
                    f"{name2}({team2}) {score2} — could not resolve via bracket"
                )
                skipped_tied += 1
                continue

        rt, rd, secs, skip = _parse_method(method_raw, winner_s, loser_s)
        if skip:
            skipped_nc += 1
            continue

        # ── Resolve schools ────────────────────────────────────────────────────
        if winner_t not in _TEAM_TO_SCHOOL:
            unknown_teams.add(winner_t)
        if loser_t not in _TEAM_TO_SCHOOL:
            unknown_teams.add(loser_t)

        sid_w = _TEAM_TO_SCHOOL.get(winner_t)
        sid_l = _TEAM_TO_SCHOOL.get(loser_t)

        # ── Resolve wrestlers (only for known NJ schools) ──────────────────────
        wid_winner = wid_loser = None
        if sid_w is not None:
            wid_winner = get_or_create_wrestler(
                _resolve_name(weight, winner_n), sid_w, weight, client,
                args.dry_run, new_wrestler_cache,
            )
        if sid_l is not None:
            wid_loser = get_or_create_wrestler(
                _resolve_name(weight, loser_n), sid_l, weight, client,
                args.dry_run, new_wrestler_cache,
            )

        # ── Flag unmatched NJ wrestlers ────────────────────────────────────────
        if sid_w is not None and wid_winner is None and not args.dry_run is False:
            review_items.append(
                f"  UNMATCHED W    {weight}lb m#{match_n}: "
                f"{winner_n} ({winner_t}) — stub will be created"
            )
        if sid_l is not None and wid_loser is None and not args.dry_run is False:
            review_items.append(
                f"  UNMATCHED L    {weight}lb m#{match_n}: "
                f"{loser_n} ({loser_t}) — stub will be created"
            )

        bouts.append({
            "in_season_tournament_id": tid,
            "weight_class":            weight,
            "round":                   round_code,
            "nj_wrestler1_id":         wid_winner,
            "wrestler1_name_raw":      winner_n,
            "wrestler1_school_id":     sid_w,
            "wrestler1_school_raw":    winner_t,
            "nj_wrestler2_id":         wid_loser,
            "wrestler2_name_raw":      loser_n,
            "wrestler2_school_id":     sid_l,
            "wrestler2_school_raw":    loser_t,
            "winner":                  1,
            "result_type":             rt,
            "result_detail":           rd,
            "fall_time_seconds":       secs,
            "source_format":           SOURCE_FORMAT,
        })

    # ── Summary ────────────────────────────────────────────────────────────────
    print(sep)
    print(f"  CSV rows:                 {len(rows)}")
    print(f"  Skipped (NC / M FOR):     {skipped_nc}")
    print(f"  Skipped (unresolved tie): {skipped_tied}")
    print(f"  Bouts to insert:          {len(bouts)}")
    print(sep)
    print()

    if unknown_teams:
        print("WARNING: team abbreviations not in _TEAM_TO_SCHOOL (will insert as null school):")
        for t in sorted(unknown_teams):
            print(f"  {t!r}")
        print()

    # ── Per-weight breakdown with round code examples ──────────────────────────
    print(sep)
    print("  BOUTS BY WEIGHT CLASS  (round codes used)")
    print(sep)
    from collections import Counter
    for wt in WEIGHT_CLASSES:
        wb = [b for b in bouts if b['weight_class'] == wt]
        codes = sorted(set(b['round'] for b in wb))
        print(f"  {wt:3d}lb  {len(wb):3d} bouts  rounds: {codes}")
    print()

    # ── Round-code sample: one row per distinct code ───────────────────────────
    print(sep)
    print("  SAMPLE: ONE ROW PER DISTINCT ROUND CODE")
    print(sep)
    seen_codes: set[str] = set()
    for b in bouts:
        rc = b['round']
        if rc not in seen_codes:
            seen_codes.add(rc)
            print(
                f"  {b['weight_class']:3d}lb  {rc:<10s}  "
                f"{b['result_type'] or '?':<6s}  {b['result_detail'] or '':>7s}  "
                f"fall={str(b['fall_time_seconds'])+'s' if b['fall_time_seconds'] else '--'}  "
                f"{b['wrestler1_name_raw']}({b['wrestler1_school_raw']}) "
                f"def. {b['wrestler2_name_raw']}({b['wrestler2_school_raw']})"
            )
    print()

    # ── Wrestler review list ───────────────────────────────────────────────────
    unmatched = [
        b for b in bouts
        if (b['wrestler1_school_id'] is not None and b['nj_wrestler1_id'] is None)
        or (b['wrestler2_school_id'] is not None and b['nj_wrestler2_id'] is None)
    ]
    new_stubs = sum(1 for v in new_wrestler_cache.values() if v is None)
    print(sep)
    print(f"  WRESTLER RESOLUTION  ({len(unmatched)} bouts with at least one unmatched NJ wrestler)")
    print(f"  New stubs to create: {new_stubs}")
    print(sep)
    for b in unmatched:
        w_side = ""
        if b['wrestler1_school_id'] is not None and b['nj_wrestler1_id'] is None:
            w_side += f"  winner: {b['wrestler1_name_raw']} ({b['wrestler1_school_raw']})\n"
        if b['wrestler2_school_id'] is not None and b['nj_wrestler2_id'] is None:
            w_side += f"  loser:  {b['wrestler2_name_raw']} ({b['wrestler2_school_raw']})\n"
        print(
            f"  {b['weight_class']:3d}lb {b['round']:10s} "
            f"{b['wrestler1_name_raw']}({b['wrestler1_school_raw']}) "
            f"def. {b['wrestler2_name_raw']}({b['wrestler2_school_raw']})"
        )
        if w_side:
            for line in w_side.strip().split("\n"):
                print(f"    {line}")
    print()

    if review_items:
        print(sep)
        print("  REVIEW ITEMS")
        print(sep)
        for item in review_items:
            print(item)
        print()

    if args.dry_run:
        print("[DRY RUN — nothing written to DB]")
        return

    # ── Live insert ────────────────────────────────────────────────────────────
    print(f"Inserting {len(bouts)} bouts …")
    CHUNK = 100
    inserted = 0
    for i in range(0, len(bouts), CHUNK):
        chunk = bouts[i:i + CHUNK]
        client.from_("tournament_bouts").insert(chunk).execute()
        inserted += len(chunk)
        print(f"  {inserted}/{len(bouts)}")
    print(f"Done. {inserted} bouts inserted.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Import Sam Cali bracket CSV into MatWhizzer")
    ap.add_argument("file",      help="Path to sam_cali_2025_full_bracket_matches.csv")
    ap.add_argument("--dry-run", action="store_true", help="Parse and report without writing")
    run(ap.parse_args())


if __name__ == "__main__":
    main()
