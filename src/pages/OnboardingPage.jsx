import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    const userId = searchParams.get('user');
    const token = searchParams.get('token');

    if (!userId || !token) {
      setStatus('error');
      return;
    }

    api.verifySetup(userId, token)
      .then((data) => {
        localStorage.setItem('broom_user_id', userId);
        localStorage.setItem('broom_user_name', data.user_name);
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      })
      .catch(() => setStatus('error'));
  }, [searchParams, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      {status === 'verifying' && (
        <div className="animate-pulse">
          <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary mx-auto" />
          <h1 className="text-xl font-bold">Configurazione in corso...</h1>
        </div>
      )}
      {status === 'success' && (
        <div className="text-accent-success">
          <CheckCircle2 className="w-16 h-16 mb-4 mx-auto" />
          <h1 className="text-2xl font-bold">Benvenuto in Broom!</h1>
          <p className="text-slate-500">Ti stiamo portando alla dashboard...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="text-accent-danger">
          <AlertCircle className="w-16 h-16 mb-4 mx-auto" />
          <h1 className="text-2xl font-bold">Errore di configurazione</h1>
          <p className="text-slate-500">Link non valido o scaduto.</p>
        </div>
      )}
    </div>
  );
}