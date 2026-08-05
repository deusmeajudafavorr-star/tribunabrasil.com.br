import React, { useState } from 'react';
import { Lock, User, KeyRound, ArrowLeft, ShieldAlert } from 'lucide-react';

interface AdminLoginModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === '123' && password === '123') {
      setError(null);
      onSuccess();
    } else {
      setError('Credenciais inválidas. Usuário e senha corretos são necessários.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white pt-2">
            Área Restrita CMS
          </h2>
          <p className="text-xs text-zinc-400 font-medium">
            Tribuna Brasil — Digite suas credenciais para acessar a administração.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2 font-semibold animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Usuário / Login
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite o login..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 left-10 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Senha
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 left-10 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-3.5 rounded-xl uppercase tracking-wider transition-all shadow-lg active:scale-98 cursor-pointer mt-2"
          >
            Entrar no Painel
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-800 text-center">
          <button
            onClick={onCancel}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 justify-center mx-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Portal Público</span>
          </button>
        </div>
      </div>
    </div>
  );
};
