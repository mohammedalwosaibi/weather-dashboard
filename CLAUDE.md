# Architecture Blueprint: Weather Dashboard

## Overview
A multi-service monorepo system tracking live weather data for user-selected cities.

## Directory Structure
- `apps/web/`: Next.js frontend (App Router, Tailwind).
- `apps/worker/`: Node.js background polling script.
- Both share access to a central Supabase database.

## Infrastructure & Data Flow

### 1. External Data Source (Open-Meteo API)
- Free, unauthenticated REST API.
- Endpoint: `api.open-meteo.com/v1/forecast`

### 2. The Worker (`apps/worker/`)
- **Environment:** Node.js, deployed to Railway.
- **Secrets:** `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Bypasses RLS).
- **Behavior:** - Runs a `setInterval` loop every 60 seconds.
  - Fetches current temperatures for a hardcoded list of major cities (e.g., Tokyo, London, New York).
  - Uses the Supabase JS client to execute an `upsert` on the `weather_data` table.

### 3. The Database (Supabase)
- **Table: `weather_data`**
  - `city` (text, Primary Key)
  - `temperature` (numeric)
  - `updated_at` (timestamp)
  - Realtime enabled for this table.
- **Table: `user_preferences`**
  - `id` (uuid, Foreign Key to `auth.users`)
  - `favorite_cities` (text array)
- **Security:** RLS enabled. Users can only manage their own preferences via `auth.uid()`.

### 4. The Frontend (`apps/web/`)
- **Environment:** Next.js deployed to Vercel.
- **Secrets:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Behavior:**
  - Users authenticate via Supabase Auth.
  - Fetches the user's `favorite_cities` from `user_preferences`.
  - Establishes a Supabase Realtime subscription on `weather_data`.
  - Filters the realtime incoming data to only display the user's favorited cities, updating the UI instantly without refresh.