import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authenticateAdmin, getAdminEmail, isAdminAuthenticated } from '@/utils/adminAuth';
import { Lock, Mail, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      const redirectPath = (location.state as { from?: string } | null)?.from || '/admin987654321';
      navigate(redirectPath, { replace: true });
    }
  }, [location.state, navigate]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const success = authenticateAdmin(email, password);

    if (success) {
      const redirectPath = (location.state as { from?: string } | null)?.from || '/admin987654321';
      navigate(redirectPath, { replace: true });
    } else {
      setError('Credenciais inválidas. Verifique o e-mail e a senha.');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.gradient1} />
        <div className={styles.gradient2} />
        <div className={styles.gradient3} />
      </div>
      
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoContainer}>
            <Shield size={32} className={styles.logoIcon} />
          </div>
          <div className={styles.badge}>
            <span className={styles.badgeIcon} />
            <span>Painel Restrito</span>
          </div>
          <h1 className={styles.title}>Acessar Admin</h1>
          <p className={styles.subtitle}>
            Faça login para gerenciar mensagens, posts e stories
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="admin-email">
              <Mail size={16} />
              <span>E-mail</span>
            </label>
            <input
              id="admin-email"
              type="email"
              className={styles.input}
              placeholder="seuemail@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="admin-password">
              <Lock size={16} />
              <span>Senha</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Digite a senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <Shield size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className={styles.submitButton} 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className={styles.spinner} />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar no painel</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.hint}>
          <Shield size={14} />
          <div>
            <p>
              ⚠️ Acesso exclusivo do administrador.
            </p>
            <p>
              Use o e-mail <strong>{getAdminEmail()}</strong> com a senha fornecida pelo time técnico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
