require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const cities = [
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917 },
  { name: 'London', lat: 51.5085, lon: -0.1257 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Riyadh', lat: 24.7136, lon: 46.6753 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Seoul', lat: 37.5665, lon: 126.9780 },
  { name: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  { name: 'Berlin', lat: 52.5200, lon: 13.4050 }
];

async function pollWeather() {
  console.log(`[${new Date().toISOString()}] Polling weather data...`);

  for (const city of cities) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m`);
      const data = await res.json();
      const temp = data.current.temperature_2m;

      const { error } = await supabase
        .from('weather_data')
        .upsert({ city: city.name, temperature: temp, updated_at: new Date().toISOString() });

      if (error) console.error(`Error upserting ${city.name}:`, error);
      else console.log(`Updated ${city.name}: ${temp}°C`);

    } catch (err) {
      console.error(`Failed to fetch for ${city.name}:`, err);
    }
  }
}

pollWeather();
setInterval(pollWeather, 60000);
