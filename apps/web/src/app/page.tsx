'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [weather, setWeather] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    const fetchPrefs = async () => {
      const { data } = await supabase.from('user_preferences').select('favorite_cities').eq('id', session.user.id).single();
      if (data) {
        setFavorites(data.favorite_cities || []);
      } else {
        await supabase.from('user_preferences').insert({ id: session.user.id, favorite_cities: [] });
      }
    };

    const fetchWeather = async () => {
      const { data } = await supabase.from('weather_data').select('*').order('city');
      if (data) setWeather(data);
    };

    fetchPrefs();
    fetchWeather();

    const channel = supabase.channel('realtime-weather')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'weather_data' }, (payload) => {
        setWeather((current) => {
          const updated = [...current];
          const index = updated.findIndex((w) => w.city === payload.new.city);
          if (index !== -1) updated[index] = payload.new;
          return updated;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const toggleFavorite = async (city: string) => {
    const newFavs = favorites.includes(city) ? favorites.filter(c => c !== city) : [...favorites, city];
    setFavorites(newFavs);
    await supabase.from('user_preferences').update({ favorite_cities: newFavs }).eq('id', session.user.id);
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg border border-slate-100">
        <h1 className="text-3xl font-bold mb-8 text-center text-slate-800">Weather Dashboard</h1>
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Live Weather</h1>
        <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors">Sign Out</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {weather.map((w) => {
          const isFav = favorites.includes(w.city);
          return (
            <div key={w.city} className={`p-6 rounded-xl shadow-sm border flex justify-between items-center transition-colors ${isFav ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-slate-800">
                  {w.city}
                  <button onClick={() => toggleFavorite(w.city)} className={`text-2xl outline-none ${isFav ? 'text-yellow-500 hover:text-yellow-600' : 'text-slate-300 hover:text-slate-400'}`}>
                    ★
                  </button>
                </h2>
                <p className="text-sm text-slate-500 mt-1">Updated: {new Date(w.updated_at).toLocaleTimeString()}</p>
              </div>
              <p className="text-4xl font-bold text-slate-800">{w.temperature}°C</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
