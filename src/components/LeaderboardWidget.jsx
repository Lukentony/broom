import { useEffect, useState } from 'react';
import { api } from '../api';
import { Users, Trophy } from 'lucide-react';

export default function LeaderboardWidget() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-primary to-blue-700 p-5 rounded-[2rem] text-white shadow-lg shadow-primary/20">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold">Classifica Settimanale</h2>
        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md text-yellow-300">
          <Trophy size={20} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.leaderboard.map(user => (
          <div key={user.user_id} className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                {user.user_name.charAt(0)}
              </div>
              <p className="text-xs text-blue-100 font-bold uppercase tracking-wider truncate">{user.user_name}</p>
            </div>
            <p className="text-xl font-black">{user.weekly_points} <span className="text-[10px] font-normal opacity-70">pt</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}