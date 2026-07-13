# Backend Docker Setup

Start the backend application and PostgreSQL database from the `backend` directory:

```powershell
docker compose up -d --build
```

This starts PostgreSQL on `localhost:5432` with:

- database: `neoai_db`
- user: `postgres`
- password: `12345`

Seeded example users:

- doctor / doctor123
- admin / admin123
- 45 additional Turkish-named doctor users / doctor123

Seeded baseline catalog data:

- ultrasound AI modules:
  - `RDS_SCORING`
  - `B_LINE_DETECTION`
- ultrasound preprocessing operations:
  - `MEDIAN_BLUR`
  - `CLAHE`
  - `GAUSSIAN_BLUR`
- default per-user ultrasound preprocessing settings for all seeded users

The seed SQL only runs when the Postgres volume is created for the first time. If you already have an older local volume and want to seed these users again:

```powershell
docker compose down -v
docker compose up -d
```
