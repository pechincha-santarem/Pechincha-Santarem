import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await authService.loginAdmin(email, pass);

    setLoading(false);

    if (result.success) {
      navigate('/admin/dashboard');
      return;
    }

    setError(result.message || 'Falha ao entrar.');
    setTimeout(() => setError(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center space-y-8">
        <div className="bg-black text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-2xl">
          <i className="fas fa-shield-alt"></i>
        </div>

        <div>
          <h1 className="text-2xl font-black">ACESSO ADMINISTRATIVO</h1>
          <p className="text-gray-500 text-sm">Controle de anúncios e parceiros</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email do Admin"
            className={`w-full px-6 py-4 rounded-xl border ${
              error ? 'border-red-500' : 'border-gray-200'
            } focus:ring-2 focus:ring-yellow-400 outline-none transition-all`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            className={`w-full px-6 py-4 rounded-xl border ${
              error ? 'border-red-500' : 'border-gray-200'
            } focus:ring-2 focus:ring-yellow-400 outline-none transition-all`}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-60"
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR NO PAINEL'}
          </button>
        </form>

        <button onClick={() => navigate('/')} className="text-gray-400 text-xs hover:underline">
          Voltar para o site
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
