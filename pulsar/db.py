import os
from pathlib import Path
import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parent.parent

def connect():
    return psycopg.connect(os.environ['DATABASE_URL'], row_factory=dict_row, autocommit=True)

def initialize():
    with connect() as conn:
        with conn.transaction():
            conn.execute((ROOT / 'sql/01_schema.sql').read_text())

def import_dataset():
    with connect() as conn:
        with conn.transaction():
            conn.execute((ROOT / 'sql/02_seed.sql').read_text())
        return conn.execute('SELECT count(*) AS total FROM candidates').fetchone()
