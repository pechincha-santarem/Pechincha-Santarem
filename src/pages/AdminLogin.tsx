
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const AdminLogin: React.FC = () => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authService.loginAdmin(pass)) {
      navigate('/admin/dashboard');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
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
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="password" 
            placeholder="Senha ADM"
            className={`w-full px-6 py-4 rounded-xl border ${error ? 'border-red-500' : 'border-gray-200'} focus:ring-2 focus:ring-yellow-400 outline-none transition-all`}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
          />
          <button 
            type="submit"
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
          >
            ENTRAR NO PAINEL
          </button>
        </form>
        <button onClick={() => navigate('/')} className="text-gray-400 text-xs hover:underline">Voltar para o site</button>
      </div>
    </div>
  );
};

export default AdminLogin;
