"""Seed Westerbachstraße 47, Frankfurt am Main as property ID 21."""
from __future__ import annotations

import math
import os
import random
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / '.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

PROPERTY_ID = 21
FLOORS = 5
UNITS_PER_FLOOR = 5
ROOMS_PER_UNIT = 3
LIVING_SPACE_M2 = 28.5
EMISSION_FACTOR = 201.0  # Natural Gas g/kWh
ENERGY_SOURCE = 'Natural Gas'
CITY = 'Frankfurt am Main'
ZIPCODE = '60489'

START_DATE = date(2023, 1, 1)
END_DATE = date(2024, 12, 31)

rng = random.Random(42 + PROPERTY_ID)


def _base_kwh(day: date) -> float:
    """Seasonal energy curve peaking in winter, lower in summer."""
    doy = day.timetuple().tm_yday
    seasonal = 0.6 + 0.4 * math.cos(2 * math.pi * (doy - 15) / 365)
    return 3.5 + seasonal * 4.0


def _outside_temp(day: date) -> float:
    doy = day.timetuple().tm_yday
    return 10.0 - 12.0 * math.cos(2 * math.pi * (doy - 15) / 365)


def main() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # --- Property ---
    print('Upserting property…')
    client.table('properties').upsert(
        {
            'id': PROPERTY_ID,
            'city': CITY,
            'zipcode': ZIPCODE,
            'energysource': ENERGY_SOURCE,
            'emission_factor_g_kwh': EMISSION_FACTOR,
        },
        on_conflict='id',
    ).execute()

    # --- Units ---
    print('Upserting units…')
    total_units = FLOORS * UNITS_PER_FLOOR
    unit_payload = [
        {'property_id': PROPERTY_ID, 'unitnumber': u}
        for u in range(1, total_units + 1)
    ]
    client.table('units').upsert(unit_payload, on_conflict='property_id,unitnumber').execute()

    all_units = (
        client.table('units')
        .select('id,unitnumber')
        .eq('property_id', PROPERTY_ID)
        .execute()
    )
    unit_id_map = {rec['unitnumber']: rec['id'] for rec in all_units.data}
    print(f'  {len(unit_id_map)} units resolved')

    # --- Rooms ---
    print('Upserting rooms…')
    room_payload = [
        {
            'unit_id': unit_id_map[u],
            'roomnumber': r,
            'livingspace_m2': LIVING_SPACE_M2 + rng.uniform(-5, 8),
        }
        for u in range(1, total_units + 1)
        for r in range(1, ROOMS_PER_UNIT + 1)
    ]
    client.table('rooms').upsert(room_payload, on_conflict='unit_id,roomnumber').execute()

    all_rooms = (
        client.table('rooms')
        .select('id,unit_id,roomnumber')
        .in_('unit_id', list(unit_id_map.values()))
        .execute()
    )
    room_id_map = {(rec['unit_id'], rec['roomnumber']): rec['id'] for rec in all_rooms.data}
    print(f'  {len(room_id_map)} rooms resolved')

    # --- Readings ---
    print('Upserting readings…')
    readings: list[dict] = []
    current = START_DATE
    while current <= END_DATE:
        base = _base_kwh(current)
        temp = _outside_temp(current)
        for u in range(1, total_units + 1):
            uid = unit_id_map[u]
            for r in range(1, ROOMS_PER_UNIT + 1):
                rid = room_id_map[(uid, r)]
                kwh = max(0.1, base + rng.gauss(0, 0.4))
                readings.append({
                    'room_id': rid,
                    'reading_date': current.isoformat(),
                    'energy_usage_kwh': round(kwh, 3),
                    'outside_temp_c': round(temp + rng.gauss(0, 0.5), 2),
                })
        current += timedelta(days=1)

    batch = 500
    for i in range(0, len(readings), batch):
        client.table('readings').upsert(readings[i:i+batch], on_conflict='room_id,reading_date').execute()
    print(f'  {len(readings)} readings upserted')

    print('\nDone — property 21 (Westerbachstraße 47, Frankfurt) seeded.')


if __name__ == '__main__':
    main()
