from __future__ import annotations

import csv
import os
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(Path(__file__).parent.parent / '.env')

SOURCE_DIR = Path(os.getenv('TECHEM_SOURCE_DIR', '/Users/luisreindlmeier/Desktop/techem-files'))
SUMMARY_TABLE = os.getenv('SUPABASE_SUMMARY_TABLE', 'daily_property_metrics')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
BATCH_SIZE = 500


# ---------------------------------------------------------------------------
# Raw parsed row (one per CSV line)
# ---------------------------------------------------------------------------

@dataclass(slots=True)
class RawRow:
    property_id: int
    reading_date: date
    zipcode: str
    energysource: str
    city: str
    energy_usage_kwh: float
    livingspace_m2: float
    outside_temp_c: float
    roomnumber: int
    emission_factor_g_kwh: float
    unitnumber: int


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _parse_date(value: str) -> date:
    value = value.strip()
    for fmt in ('%m/%d/%y', '%Y-%m-%d', '%d.%m.%Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f'Unsupported date format: {value!r}')


def _property_id_from_filename(name: str) -> int:
    m = re.search(r'property_(\d+)', name)
    if not m:
        raise ValueError(f'Cannot extract property ID from filename: {name}')
    return int(m.group(1))


def _parse_csv(path: Path) -> list[RawRow]:
    pid = _property_id_from_filename(path.name)
    rows: list[RawRow] = []
    with path.open(newline='', encoding='utf-8-sig') as fh:
        for raw in csv.DictReader(fh):
            rows.append(RawRow(
                property_id=pid,
                reading_date=_parse_date(raw['date']),
                zipcode=raw['zipcode'].strip(),
                energysource=raw['energysource'].strip(),
                city=raw['city'].strip(),
                energy_usage_kwh=float(raw['energyusage [kWh]']),
                livingspace_m2=float(raw['livingspace [m²]']),
                outside_temp_c=float(raw['mean outside temperature [°C]']),
                roomnumber=int(float(raw['roomnumber'])),
                emission_factor_g_kwh=float(raw['emission factor [g/kWh]']),
                unitnumber=int(float(raw['unitnumber'])),
            ))
    return rows


# ---------------------------------------------------------------------------
# Chunking utility
# ---------------------------------------------------------------------------

def _chunked(items: list[dict], size: int) -> Iterable[list[dict]]:
    for i in range(0, len(items), size):
        yield items[i:i + size]


# ---------------------------------------------------------------------------
# Database insertion helpers
# ---------------------------------------------------------------------------

def _insert_properties(client: Client, all_rows: list[RawRow]) -> None:
    seen: dict[int, dict] = {}
    for row in all_rows:
        if row.property_id not in seen:
            seen[row.property_id] = {
                'id': row.property_id,
                'city': row.city,
                'zipcode': row.zipcode,
                'energysource': row.energysource,
                'emission_factor_g_kwh': row.emission_factor_g_kwh,
            }
    payload = list(seen.values())
    client.table('properties').upsert(payload, on_conflict='id').execute()
    print(f'  properties: {len(payload)} upserted')


def _insert_units(client: Client, all_rows: list[RawRow]) -> dict[tuple[int, int], int]:
    seen: dict[tuple[int, int], dict] = {}
    for row in all_rows:
        key = (row.property_id, row.unitnumber)
        if key not in seen:
            seen[key] = {'property_id': row.property_id, 'unitnumber': row.unitnumber}

    payload = list(seen.values())
    resp = (
        client.table('units')
        .upsert(payload, on_conflict='property_id,unitnumber')
        .execute()
    )

    unit_id_map: dict[tuple[int, int], int] = {}
    for rec in resp.data:
        unit_id_map[(rec['property_id'], rec['unitnumber'])] = rec['id']

    # Fallback: if upsert returned no rows (e.g. no-op duplicates), select them
    if len(unit_id_map) < len(seen):
        all_units = client.table('units').select('id,property_id,unitnumber').execute()
        for rec in all_units.data:
            unit_id_map[(rec['property_id'], rec['unitnumber'])] = rec['id']

    print(f'  units: {len(unit_id_map)} resolved')
    return unit_id_map


def _insert_rooms(
    client: Client,
    all_rows: list[RawRow],
    unit_id_map: dict[tuple[int, int], int],
) -> dict[tuple[int, int, int], int]:
    seen: dict[tuple[int, int, int], dict] = {}
    for row in all_rows:
        uid = unit_id_map[(row.property_id, row.unitnumber)]
        key = (row.property_id, row.unitnumber, row.roomnumber)
        if key not in seen:
            seen[key] = {
                'unit_id': uid,
                'roomnumber': row.roomnumber,
                'livingspace_m2': row.livingspace_m2,
            }

    payload = list(seen.values())
    resp = (
        client.table('rooms')
        .upsert(payload, on_conflict='unit_id,roomnumber')
        .execute()
    )

    room_id_map: dict[tuple[int, int, int], int] = {}
    for rec in resp.data:
        # Reconstruct the three-part key via unit_id_map inversion
        uid = rec['unit_id']
        rn = rec['roomnumber']
        for (pid, un), mapped_uid in unit_id_map.items():
            if mapped_uid == uid:
                room_id_map[(pid, un, rn)] = rec['id']
                break

    # Fallback select if upsert returned fewer rows than expected
    if len(room_id_map) < len(seen):
        all_rooms = client.table('rooms').select('id,unit_id,roomnumber').execute()
        uid_to_key: dict[int, tuple[int, int]] = {v: k for k, v in unit_id_map.items()}
        for rec in all_rooms.data:
            pid, un = uid_to_key[rec['unit_id']]
            room_id_map[(pid, un, rec['roomnumber'])] = rec['id']

    print(f'  rooms: {len(room_id_map)} resolved')
    return room_id_map


def _insert_readings(
    client: Client,
    all_rows: list[RawRow],
    room_id_map: dict[tuple[int, int, int], int],
) -> int:
    payload = [
        {
            'room_id': room_id_map[(row.property_id, row.unitnumber, row.roomnumber)],
            'reading_date': row.reading_date.isoformat(),
            'energy_usage_kwh': row.energy_usage_kwh,
            'outside_temp_c': row.outside_temp_c,
        }
        for row in all_rows
    ]
    for chunk in _chunked(payload, BATCH_SIZE):
        client.table('readings').upsert(chunk, on_conflict='room_id,reading_date').execute()
    print(f'  readings: {len(payload)} upserted')
    return len(payload)


def _rebuild_daily_metrics(client: Client, all_rows: list[RawRow]) -> None:
    aggregate: dict[date, dict] = defaultdict(lambda: {'energy': 0.0, 'emission': 0.0, 'properties': set()})
    for row in all_rows:
        b = aggregate[row.reading_date]
        b['energy'] += row.energy_usage_kwh
        b['emission'] += row.energy_usage_kwh * row.emission_factor_g_kwh / 1000.0
        b['properties'].add(row.property_id)

    payload = [
        {
            'reading_date': d.isoformat(),
            'total_energy_kwh': round(v['energy'], 3),
            'total_emission_kg_co2e': round(v['emission'], 3),
            'property_count': len(v['properties']),
        }
        for d, v in sorted(aggregate.items())
    ]
    for chunk in _chunked(payload, BATCH_SIZE):
        client.table(SUMMARY_TABLE).upsert(chunk, on_conflict='reading_date').execute()
    print(f'  daily_property_metrics: {len(payload)} rows rebuilt')


# ---------------------------------------------------------------------------
# Verification queries
# ---------------------------------------------------------------------------

def _verify(client: Client) -> None:
    print('\n--- Verification ---')

    props = client.table('properties').select('id', count='exact').execute()
    units = client.table('units').select('id', count='exact').execute()
    rooms = client.table('rooms').select('id', count='exact').execute()
    readings = client.table('readings').select('id', count='exact').execute()
    metrics = client.table(SUMMARY_TABLE).select('reading_date', count='exact').execute()

    print(f'  properties : {props.count}')
    print(f'  units      : {units.count}')
    print(f'  rooms      : {rooms.count}')
    print(f'  readings   : {readings.count}')
    print(f'  daily rows : {metrics.count}')

    date_range = (
        client.table('readings')
        .select('reading_date')
        .order('reading_date', desc=False)
        .limit(1)
        .execute()
    )
    date_range_last = (
        client.table('readings')
        .select('reading_date')
        .order('reading_date', desc=True)
        .limit(1)
        .execute()
    )
    if date_range.data and date_range_last.data:
        print(f'  date range : {date_range.data[0]["reading_date"]} → {date_range_last.data[0]["reading_date"]}')


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if not SUPABASE_URL:
        raise SystemExit('SUPABASE_URL is missing from environment')
    if not SUPABASE_KEY:
        raise SystemExit('Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY in backend/.env')
    if not SOURCE_DIR.exists():
        raise SystemExit(f'Source directory not found: {SOURCE_DIR}')

    csv_files = sorted(SOURCE_DIR.glob('property_*.csv'))
    if not csv_files:
        raise SystemExit(f'No property_*.csv files found in {SOURCE_DIR}')

    print(f'Found {len(csv_files)} CSV files in {SOURCE_DIR}')

    all_rows: list[RawRow] = []
    for path in csv_files:
        rows = _parse_csv(path)
        all_rows.extend(rows)
        print(f'  parsed {path.name}: {len(rows)} rows')

    print(f'\nTotal rows parsed: {len(all_rows)}')

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print('\nInserting normalized data...')
    _insert_properties(client, all_rows)
    unit_id_map = _insert_units(client, all_rows)
    room_id_map = _insert_rooms(client, all_rows, unit_id_map)
    _insert_readings(client, all_rows, room_id_map)
    _rebuild_daily_metrics(client, all_rows)

    _verify(client)
    print('\nImport complete.')


if __name__ == '__main__':
    main()
