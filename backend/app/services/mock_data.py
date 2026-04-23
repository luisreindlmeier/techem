from datetime import date, timedelta

from app.schemas import MetricPoint


def generate_mock_points(days: int = 60) -> list[MetricPoint]:
    start = date.today() - timedelta(days=days - 1)
    points: list[MetricPoint] = []

    for idx in range(days):
        current_date = start + timedelta(days=idx)
        baseline = 1200 + (idx * 2.7)
        weekly_wave = 120 if idx % 7 in (1, 2, 3, 4, 5) else -80
        energy_kwh = max(700.0, baseline + weekly_wave)
        emission_kg = energy_kwh * 0.21
        points.append(
            MetricPoint(
                date=current_date,
                energy_kwh=round(energy_kwh, 2),
                emission_kg_co2e=round(emission_kg, 2),
            )
        )

    return points
