import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Search,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { BetService } from "@/services/betService";
import styles from "./BetLeads.module.css";

/**
 * Limpa nomes de UTM removendo IDs do Facebook e tokens
 * Ex: "tela fake pedro zutti|120240750683350235" → "tela fake pedro zutti"
 * Ex: "ADS 02 - RUYTER DUBAI|120240751195340235::PAZXh0bg..." → "ADS 02 - RUYTER DUBAI"
 */
function cleanUtmName(raw: string | null | undefined): string {
  if (!raw) return '-';
  // Remove tudo após | ou :: (IDs do Facebook / tokens)
  return raw.split('|')[0].split('::')[0].trim() || '-';
}

/**
 * Formata o posicionamento (utm_term) de forma legível
 * Ex: "Instagram_Reels" → "Reels"
 * Ex: "Instagram_Feed" → "Feed"
 * Ex: "Instagram_Stories" → "Stories"
 */
function formatPlacement(raw: string | null | undefined): string {
  if (!raw) return '-';
  return raw.replace('Instagram_', '').replace('Facebook_', '').trim() || raw;
}

export default function BetLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "waiting" | "signup">("all");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, depositsData] = await Promise.all([
        BetService.getLeads(),
        BetService.getDeposits()
      ]);
      setLeads(leadsData);
      setDeposits(depositsData);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    } finally {
      setLoading(false);
    }
  };

  // Unifica os dados para a tabela
  const unifiedData = [
    ...deposits.map(d => ({
      id: d.id,
      type: 'deposit',
      email: d.bet_leads?.email || 'N/A',
      phone: d.bet_leads?.phone || '',
      name: d.bet_leads?.name || 'Cliente',
      status: d.status,
      amount: d.amount,
      utm_campaign: d.utm_campaign || d.bet_leads?.utm_campaign,
      utm_content: d.utm_content || d.bet_leads?.utm_content,
      utm_term: d.utm_term || d.bet_leads?.utm_term,
      utmify: d.utmify || d.bet_leads?.utmify || 'N/A',
      created_at: d.created_at,
      txid: d.txid
    })),
    ...leads.filter(l => !deposits.some(d => 
      (l.visitor_id && d.visitor_id === l.visitor_id) || 
      (l.fingerprint && d.fingerprint === l.fingerprint) ||
      (l.email && d.bet_leads?.email === l.email)
    )).map(l => ({
      id: l.id,
      type: 'signup',
      email: l.email,
      phone: l.phone,
      name: l.name || 'Cliente',
      status: 'signup',
      amount: 0,
      utm_campaign: l.utm_campaign,
      utm_content: l.utm_content,
      utm_term: l.utm_term,
      utmify: l.utmify || 'N/A',
      created_at: l.created_at,
      txid: ''
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredData = unifiedData.filter(item => {
    const campaignClean = cleanUtmName(item.utm_campaign).toLowerCase();
    const contentClean = cleanUtmName(item.utm_content).toLowerCase();
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = 
      item.email?.toLowerCase().includes(search) ||
      item.name?.toLowerCase().includes(search) ||
      item.utmify?.toLowerCase().includes(search) ||
      campaignClean.includes(search) ||
      contentClean.includes(search);
    
    if (filter === "all") return matchesSearch;
    if (filter === "paid") return matchesSearch && item.status === "paid";
    if (filter === "waiting") return matchesSearch && item.status === "waiting_payment";
    if (filter === "signup") return matchesSearch && item.status === "signup";
    return matchesSearch;
  });

  const totalPaid = deposits.filter(d => d.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalWaiting = deposits.filter(d => d.status === 'waiting_payment').length;

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Gerenciamento de Leads Bet</h1>
          <p className={styles.subtitle}>Acompanhe em tempo real quem cadastrou, gerou e pagou.</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total de Leads</span>
            <div className={styles.statValue}>{leads.length}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>PIX Pagos</span>
            <div className={styles.statValue}>R$ {totalPaid.toFixed(2)}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Aguardando Pagamento</span>
            <div className={styles.statValue}>{totalWaiting}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Conversão</span>
            <div className={styles.statValue}>
              {leads.length > 0 ? ((deposits.filter(d => d.status === 'paid').length / leads.length) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input 
              type="text" 
              placeholder="Pesquisar por email, nome, conjunto ou anúncio..." 
              className={styles.filterBtn} 
              style={{ width: '100%', paddingLeft: 40, background: 'rgba(255,255,255,0.03)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'signup' ? styles.active : ''}`}
            onClick={() => setFilter('signup')}
          >
            Cadastros
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'waiting' ? styles.active : ''}`}
            onClick={() => setFilter('waiting')}
          >
            Gerados
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'paid' ? styles.active : ''}`}
            onClick={() => setFilter('paid')}
          >
            Pagos
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Conjunto</th>
                <th>Anúncio</th>
                <th>Posição</th>
                <th>Status</th>
                <th>Valor</th>
                <th>UTMify</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Carregando dados...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Nenhum lead encontrado.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.email}</div>
                    </td>
                    <td>
                      <span className={styles.utmBadge}>{cleanUtmName(item.utm_campaign)}</span>
                    </td>
                    <td>
                      <span className={styles.utmBadge}>{cleanUtmName(item.utm_content)}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{formatPlacement(item.utm_term)}</span>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[item.status]}`}>
                        {item.status === 'paid' ? 'Pago' : item.status === 'waiting_payment' ? 'Gerou PIX' : 'Cadastrou'}
                      </span>
                    </td>
                    <td>
                      {item.amount > 0 ? `R$ ${Number(item.amount).toFixed(2)}` : '-'}
                    </td>
                    <td>
                      <span className={styles.utmifyTag}>{item.utmify}</span>
                      {item.status !== 'signup' && (
                        <div style={{ fontSize: 10, color: '#10b981', marginTop: 4 }}>
                          <CheckCircle2 size={10} style={{ display: 'inline', marginRight: 4 }} />
                          Enviado UTMify
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
