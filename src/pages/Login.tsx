
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', pass: '' });
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = authService.loginClient(formData.email, formData.pass);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Erro ao fazer login.');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100 space-y-8">
        <div className="text-center space-y-4">
          <div className="bg-yellow-400 text-black w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
            <i className="fas fa-user"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Login Cliente</h1>
            <p className="text-gray-500 text-sm">Acesse sua conta para salvar favoritos</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase px-1">Email</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase px-1">Senha</label>
            <input 
              type="password" 
              placeholder="Digite sua senha"
              className="w-full px-6 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
              value={formData.pass}
              onChange={(e) => setFormData(prev => ({...prev, pass: e.target.value}))}
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-black text-white font-black py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
          >
            ENTRAR
          </button>
        </form>

        <div className="text-center space-y-4">
          <div className="text-xs text-gray-400">
            Ainda não tem conta? <span className="text-yellow-600 font-bold">Cadastre-se em breve</span>
          </div>
          <Link to="/" className="block text-gray-400 text-xs hover:underline italic">Continuar navegando sem login</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
