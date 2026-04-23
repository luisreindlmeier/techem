from datetime import timedelta

from app.schemas import ForecastPoint, MetricPoint


def _linear_regression(values: list[float]) -> tuple[float, float]:
    n = len(values)
    if n < 2:
        return values[0] if values else 0.0, 0.0

    x_values = list(range(n))
    x_mean = sum(x_values) / n
    y_mean = sum(values) / n

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, values))
    denominator = sum((x - x_mean) ** 2 for x in x_values) or 1.0

    slope = numerator / denominator
    intercept = y_mean - slope * x_mean
    return intercept, slope


def forecast_from_history(history: list[MetricPoint], horizon_days: int) -> list[ForecastPoint]:
    if not history:
        return []

    sorted_history = sorted(history, key=lambda point: point.date)
    energy = [point.energy_kwh for point in sorted_history]
    emission = [point.emission_kg_co2e for point in sorted_history]

    energy_intercept, energy_slope = _linear_regression(energy)
    emission_intercept, emission_slope = _linear_regression(emission)

    last_date = sorted_history[-1].date
    base_index = len(sorted_history)

    points: list[ForecastPoint] = []
    for offset in range(1, horizon_days + 1):
        idx = base_index + offset
        predicted_energy = max(0.0, energy_intercept + energy_slope * idx)
        predicted_emission = max(0.0, emission_intercept + emission_slope * idx)
        points.append(
            ForecastPoint(
                date=last_date + timedelta(days=offset),
                predicted_energy_kwh=round(predicted_energy, 2),
                predicted_emission_kg_co2e=round(predicted_emission, 2),
            )
        )

    return points
