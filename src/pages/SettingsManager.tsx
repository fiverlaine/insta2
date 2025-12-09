import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Facebook, CheckCircle, AlertCircle } from 'lucide-react';
import { SettingsService } from '@/services/settingsService';
import styles from './SettingsManager.module.css';

export default function SettingsManager() {
    const navigate = useNavigate();
    const [pixelId, setPixelId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const id = await SettingsService.getFacebookPixelId();
            if (id) {
                setPixelId(id);
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const success = await SettingsService.setFacebookPixelId(pixelId);
            if (success) {
                setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
                // Recarregar a página para aplicar o novo pixel (opcional, mas recomendado se quiser ver o efeito imediato no reload)
                // Mas como é admin, talvez não precise recarregar o pixel aqui.
            } else {
                setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            setMessage({ type: 'error', text: 'Erro inesperado ao salvar.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => navigate('/admin987654321')} className={styles.backButton}>
                    <ArrowLeft size={24} />
                </button>
                <h1 className={styles.title}>Configurações do Sistema</h1>
            </header>

            <main className={styles.content}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconContainer}>
                            <Facebook size={24} />
                        </div>
                        <div>
                            <h2 className={styles.cardTitle}>Facebook Pixel</h2>
                            <p className={styles.cardDescription}>Configure o ID do seu pixel para rastreamento de eventos.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="pixelId" className={styles.label}>Pixel ID</label>
                            <input
                                type="text"
                                id="pixelId"
                                value={pixelId}
                                onChange={(e) => setPixelId(e.target.value)}
                                placeholder="Ex: 25009624982012198"
                                className={styles.input}
                                disabled={loading}
                            />
                            <p className={styles.helpText}>
                                O pixel será inicializado automaticamente com este ID em todas as páginas.
                            </p>
                        </div>

                        {message && (
                            <div className={`${styles.message} ${styles[message.type]}`}>
                                {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <span>{message.text}</span>
                            </div>
                        )}

                        <div className={styles.actions}>
                            <button
                                type="submit"
                                className={styles.saveButton}
                                disabled={saving || loading}
                            >
                                {saving ? (
                                    <>
                                        <span className={styles.spinner}></span>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
