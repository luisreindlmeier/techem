from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_table: str = "daily_property_metrics"
    supabase_time_column: str = "reading_date"
    supabase_energy_column: str = "total_energy_kwh"
    supabase_emission_column: str = "total_emission_kg_co2e"
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
