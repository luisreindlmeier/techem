"""
Run once to pre-geocode all properties from Supabase and write geocache.json.

Usage:
    cd backend
    python -m scripts.geocode_properties
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.supabase_data import load_properties

if __name__ == "__main__":
    print("Geocoding properties...")
    properties = load_properties()
    for prop in properties:
        status = f"({prop.lat:.4f}, {prop.lng:.4f})" if prop.lat else "NOT FOUND"
        print(f"  [{prop.id}] {prop.zipcode} {prop.city} → {status}")
    print(f"\nDone. {sum(1 for p in properties if p.lat)} / {len(properties)} geocoded.")
    print("Cache written to backend/geocache.json — commit it to avoid re-geocoding on deploy.")
