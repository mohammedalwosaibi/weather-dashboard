'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { CloudSun, Star, LogOut, Thermometer, Clock, Globe, Heart } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function tempColor(temp: number): string {
  if (temp < 15) return 'text-sky-400';
  if (temp <= 25) return 'text-white';
  return 'text-amber-400';
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [weather, setWeather] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');

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

  const displayedWeather = viewMode === 'favorites'
    ? weather.filter((w) => favorites.includes(w.city))
    : weather;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-10">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                <CloudSun className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Weather Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Sign in to track live weather worldwide</p>
            </div>
            <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#6366f1', brandAccent: '#4f46e5' } } } }} providers={[]} theme="dark" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <CloudSun className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight">Live Weather</h1>
              <p className="text-xs text-slate-500">Real-time updates across the globe</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-slate-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-full p-1 inline-flex border border-white/10">
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              All Cities
            </button>
            <button
              onClick={() => setViewMode('favorites')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                viewMode === 'favorites'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-4 h-4" />
              My Favorites
              {favorites.length > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  viewMode === 'favorites'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-white/10 text-slate-300'
                }`}>
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
          <p className="text-sm text-slate-500">
            {displayedWeather.length} {displayedWeather.length === 1 ? 'city' : 'cities'}
          </p>
        </div>

        {/* Empty State */}
        {viewMode === 'favorites' && displayedWeather.length === 0 && (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-16 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Heart className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No favorites yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Star the cities you care about to see them here. Switch to &ldquo;All Cities&rdquo; and tap the star icon on any city card.
            </p>
            <button
              onClick={() => setViewMode('all')}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              <Globe className="w-4 h-4" />
              Browse All Cities
            </button>
          </div>
        )}

        {/* Weather Grid */}
        {displayedWeather.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedWeather.map((w) => {
              const isFav = favorites.includes(w.city);
              return (
                <div
                  key={w.city}
                  className={`group relative rounded-2xl border backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    isFav
                      ? 'bg-indigo-500/10 border-indigo-400/20 hover:border-indigo-400/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  {isFav && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isFav
                            ? 'bg-indigo-500/20 border border-indigo-400/20'
                            : 'bg-white/5 border border-white/10'
                        }`}>
                          <Thermometer className={`w-5 h-5 ${isFav ? 'text-indigo-400' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-white leading-tight">{w.city}</h2>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-600" />
                            <p className="text-xs text-slate-500">{new Date(w.updated_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite(w.city)}
                        className={`p-2 rounded-xl transition-all ${
                          isFav
                            ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 border border-yellow-500/20'
                            : 'bg-white/5 text-slate-600 hover:bg-white/10 hover:text-slate-400 border border-white/5'
                        }`}
                      >
                        <Star className={`w-5 h-5 ${isFav ? 'fill-yellow-400' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-5xl font-bold tracking-tighter ${tempColor(w.temperature)}`}>{w.temperature}</span>
                      <span className="text-lg font-medium text-slate-600">°C</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
