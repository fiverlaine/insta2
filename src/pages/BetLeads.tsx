import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Search,
  ChevronDown,
  BarChart3,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { BetService } from "@/services/betService";
import styles from "./BetLeads.module.css";

// ─── Helpers ──────────────────────────────────────────────
function cleanUtmName(raw: string | null | undefined): string {
  if (!raw) return "-";
  return raw.split("|")[0].split("::")[0].trim() || "-";
}

function formatPlacement(raw: string | null | undefined): string {
  if (!raw) return "-";
  return raw.replace("Instagram_", "").replace("Facebook_", "").trim() || raw;
}


function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function rankClass(i: number) {
  if (i === 0) return styles.gold;
  if (i === 1) return styles.silver;
  if (i === 2) return styles.bronze;
  return "";
}

// ─── Types ────────────────────────────────────────────────
interface UnifiedItem {
  id: string;
  type: string;
  email: string;
  phone: string;
  name: string;
  status: string;
  amount: number;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_source: string | null;
  utmify: string;
  created_at: string;
  txid: string;
}

interface UtmAgg {
  key: string;
  signups: number;
  pixGenerated: number;
  pixPaid: number;
  revenue: number;
}

type DatePreset = "today" | "7d" | "30d" | "custom" | "all";

// ══════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════
export default function BetLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "waiting" | "signup">("all");

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Collapsible analytics
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

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
        BetService.getDeposits(),
      ]);
      setLeads(leadsData);
      setDeposits(depositsData);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Date Range ───────────────────────────────────────
  const dateRange = useMemo<{ from: Date | null; to: Date | null }>(() => {
    const now = new Date();
    if (datePreset === "today") {
      return { from: startOfDay(now), to: endOfDay(now) };
    }
    if (datePreset === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    if (datePreset === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    if (datePreset === "custom") {
      return {
        from: dateFrom ? startOfDay(new Date(dateFrom + "T00:00:00")) : null,
        to: dateTo ? endOfDay(new Date(dateTo + "T00:00:00")) : null,
      };
    }
    return { from: null, to: null };
  }, [datePreset, dateFrom, dateTo]);

  const isInDateRange = (iso: string) => {
    if (!dateRange.from && !dateRange.to) return true;
    const d = new Date(iso);
    if (dateRange.from && d < dateRange.from) return false;
    if (dateRange.to && d > dateRange.to) return false;
    return true;
  };

  // ─── Unify Data ───────────────────────────────────────
  const unifiedData = useMemo<UnifiedItem[]>(() => {
    const result: UnifiedItem[] = [
      ...deposits.map((d: any) => ({
        id: d.id,
        type: "deposit",
        email: d.bet_leads?.email || "N/A",
        phone: d.bet_leads?.phone || "",
        name: d.bet_leads?.name || "Cliente",
        status: d.status,
        amount: d.amount,
        utm_campaign: d.utm_campaign || d.bet_leads?.utm_campaign,
        utm_medium: d.utm_medium || d.bet_leads?.utm_medium,
        utm_content: d.utm_content || d.bet_leads?.utm_content,
        utm_term: d.utm_term || d.bet_leads?.utm_term,
        utm_source: d.utm_source || d.bet_leads?.utm_source,
        utmify: d.utmify || d.bet_leads?.utmify || "N/A",
        created_at: d.created_at,
        txid: d.txid,
      })),
      ...leads
        .filter(
          (l: any) =>
            !deposits.some(
              (d: any) =>
                (l.visitor_id && d.visitor_id === l.visitor_id) ||
                (l.fingerprint && d.fingerprint === l.fingerprint) ||
                (l.email && d.bet_leads?.email === l.email)
            )
        )
        .map((l: any) => ({
          id: l.id,
          type: "signup",
          email: l.email,
          phone: l.phone,
          name: l.name || "Cliente",
          status: "signup",
          amount: 0,
          utm_campaign: l.utm_campaign,
          utm_medium: l.utm_medium,
          utm_content: l.utm_content,
          utm_term: l.utm_term,
          utm_source: l.utm_source,
          utmify: l.utmify || "N/A",
          created_at: l.created_at,
          txid: "",
        })),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return result;
  }, [leads, deposits]);

  // ─── Apply date + search + status filters ─────────────
  const filteredData = useMemo(() => {
    return unifiedData.filter((item) => {
      // Date filter
      if (!isInDateRange(item.created_at)) return false;

      // Search filter
      const campaignClean = cleanUtmName(item.utm_campaign).toLowerCase();
      const adSetClean = cleanUtmName(item.utm_medium).toLowerCase();
      const contentClean = cleanUtmName(item.utm_content).toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.email?.toLowerCase().includes(search) ||
        item.name?.toLowerCase().includes(search) ||
        item.utmify?.toLowerCase().includes(search) ||
        campaignClean.includes(search) ||
        adSetClean.includes(search) ||
        contentClean.includes(search);

      // Status filter
      if (filter === "all") return matchesSearch;
      if (filter === "paid") return matchesSearch && item.status === "paid";
      if (filter === "waiting") return matchesSearch && item.status === "waiting_payment";
      if (filter === "signup") return matchesSearch && item.status === "signup";
      return matchesSearch;
    });
  }, [unifiedData, dateRange, searchTerm, filter]);

  // ─── Date-filtered base data for metrics ──────────────
  const dateFilteredLeads = useMemo(
    () => leads.filter((l: any) => isInDateRange(l.created_at)),
    [leads, dateRange]
  );
  const dateFilteredDeposits = useMemo(
    () => deposits.filter((d: any) => isInDateRange(d.created_at)),
    [deposits, dateRange]
  );

  // ─── Summary Stats ───────────────────────────────────
  const totalLeads = dateFilteredLeads.length;
  const totalPixGenerated = dateFilteredDeposits.filter((d: any) => d.status === "waiting_payment").length;
  const totalPixPaid = dateFilteredDeposits.filter((d: any) => d.status === "paid").length;
  const totalRevenue = dateFilteredDeposits
    .filter((d: any) => d.status === "paid")
    .reduce((acc: number, d: any) => acc + Number(d.amount), 0);
  const totalWaiting = dateFilteredDeposits.filter((d: any) => d.status === "waiting_payment").length;
  const conversionRate =
    totalLeads > 0 ? ((totalPixPaid / totalLeads) * 100).toFixed(1) : "0.0";
  const pixToPayRate =
    totalPixGenerated + totalPixPaid > 0
      ? ((totalPixPaid / (totalPixGenerated + totalPixPaid)) * 100).toFixed(1)
      : "0.0";
  const avgTicket = totalPixPaid > 0 ? (totalRevenue / totalPixPaid).toFixed(2) : "0.00";

  // ─── UTM Analytics ────────────────────────────────────
  const dateFilteredUnified = useMemo(
    () => unifiedData.filter((i) => isInDateRange(i.created_at)),
    [unifiedData, dateRange]
  );

  function buildAgg(keyFn: (item: UnifiedItem) => string): UtmAgg[] {
    const map: Record<string, UtmAgg> = {};
    dateFilteredUnified.forEach((item) => {
      const key = keyFn(item);
      if (!map[key]) map[key] = { key, signups: 0, pixGenerated: 0, pixPaid: 0, revenue: 0 };
      if (item.status === "signup") map[key].signups++;
      else if (item.status === "waiting_payment") map[key].pixGenerated++;
      else if (item.status === "paid") {
        map[key].pixPaid++;
        map[key].revenue += Number(item.amount);
      }
    });
    return Object.values(map);
  }

  // Por Campanha (utm_campaign) = Nome da campanha no Facebook
  const aggByCampaign = useMemo(
    () =>
      buildAgg((i) => cleanUtmName(i.utm_campaign))
        .sort((a, b) => b.revenue - a.revenue || b.pixPaid - a.pixPaid || b.signups - a.signups)
        .slice(0, 8),
    [dateFilteredUnified]
  );

  // Por Conjunto de Anúncios (utm_medium) = Nome do ad set no Facebook
  const aggByAdSet = useMemo(
    () =>
      buildAgg((i) => cleanUtmName(i.utm_medium))
        .sort((a, b) => b.revenue - a.revenue || b.pixPaid - a.pixPaid || b.signups - a.signups)
        .slice(0, 8),
    [dateFilteredUnified]
  );

  // Por Anúncio (utm_content) = Nome do anúncio no Facebook
  const aggByAd = useMemo(
    () =>
      buildAgg((i) => cleanUtmName(i.utm_content))
        .sort((a, b) => b.revenue - a.revenue || b.pixPaid - a.pixPaid || b.signups - a.signups)
        .slice(0, 8),
    [dateFilteredUnified]
  );

  const aggByPlacement = useMemo(
    () =>
      buildAgg((i) => formatPlacement(i.utm_term))
        .sort((a, b) => b.revenue - a.revenue || b.pixPaid - a.pixPaid || b.signups - a.signups)
        .slice(0, 8),
    [dateFilteredUnified]
  );

  // Handle date preset selection
  const selectPreset = (p: DatePreset) => {
    setDatePreset(p);
    if (p !== "custom") {
      setDateFrom("");
      setDateTo("");
    }
  };

  // ══════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════
  return (
    <AdminLayout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Gerenciamento de Leads Bet</h1>
          <p className={styles.subtitle}>
            Acompanhe em tempo real quem cadastrou, gerou e pagou.
          </p>
        </div>

        {/* Date Filters */}
        <div className={styles.dateFilters}>
          <CalendarDays size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
          {(
            [
              ["all", "Todos"],
              ["today", "Hoje"],
              ["7d", "7 dias"],
              ["30d", "30 dias"],
              ["custom", "Período"],
            ] as [DatePreset, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.datePreset} ${datePreset === key ? styles.active : ""}`}
              onClick={() => selectPreset(key)}
            >
              {label}
            </button>
          ))}
          {datePreset === "custom" && (
            <>
              <input
                type="date"
                className={styles.dateInput}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className={styles.dateSeparator}>até</span>
              <input
                type="date"
                className={styles.dateInput}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </>
          )}
        </div>

        {/* Summary Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Cadastros</span>
            <div className={styles.statValue}>{totalLeads}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>PIX Gerados</span>
            <div className={styles.statValue}>{totalPixGenerated + totalPixPaid}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>PIX Pagos</span>
            <div className={styles.statValue} style={{ color: "#10b981" }}>
              {totalPixPaid}
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Receita Total</span>
            <div className={styles.statValue} style={{ color: "#10b981" }}>
              R$ {totalRevenue.toFixed(2)}
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Ticket Médio</span>
            <div className={styles.statValue}>R$ {avgTicket}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Conversão (Lead → Pago)</span>
            <div className={styles.statValue}>{conversionRate}%</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Conversão (PIX → Pago)</span>
            <div className={styles.statValue}>{pixToPayRate}%</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Aguardando Pag.</span>
            <div className={styles.statValue} style={{ color: "#f59e0b" }}>
              {totalWaiting}
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className={styles.analyticsCard} style={{ marginBottom: 32 }}>
          <div className={styles.analyticsCardTitle}>
            <TrendingUp size={14} /> Funil de Conversão
          </div>
          <div className={styles.funnelContainer}>
            <div className={styles.funnelStep}>
              <div
                className={styles.funnelBar}
                style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
              >
                {totalLeads}
              </div>
              <span className={styles.funnelLabel}>Cadastros</span>
            </div>
            <span className={styles.funnelArrow}>→</span>
            <div className={styles.funnelStep}>
              {totalLeads > 0 && (
                <span className={styles.funnelRate}>
                  {(((totalPixGenerated + totalPixPaid) / totalLeads) * 100).toFixed(0)}%
                </span>
              )}
              <div
                className={styles.funnelBar}
                style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}
              >
                {totalPixGenerated + totalPixPaid}
              </div>
              <span className={styles.funnelLabel}>PIX Gerado</span>
            </div>
            <span className={styles.funnelArrow}>→</span>
            <div className={styles.funnelStep}>
              {totalPixGenerated + totalPixPaid > 0 && (
                <span className={styles.funnelRate}>{pixToPayRate}%</span>
              )}
              <div
                className={styles.funnelBar}
                style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}
              >
                {totalPixPaid}
              </div>
              <span className={styles.funnelLabel}>Pagos</span>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className={styles.analyticsSection}>
          <div
            className={`${styles.analyticsSectionTitle} ${styles.collapseToggle}`}
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={16} /> Análise por UTM
            </span>
            <ChevronDown
              size={16}
              className={`${styles.collapseIcon} ${analyticsOpen ? styles.open : ""}`}
            />
          </div>

          {analyticsOpen && (
            <div className={styles.analyticsGrid}>
              {/* By Campaign (utm_campaign) */}
              <AnalyticsRankingCard
                title="📢 Por Campanha"
                data={aggByCampaign}
              />
              {/* By Ad Set (utm_medium) */}
              <AnalyticsRankingCard
                title="📦 Por Conjunto"
                data={aggByAdSet}
              />
              {/* By Ad (utm_content) */}
              <AnalyticsRankingCard
                title="🎯 Por Anúncio"
                data={aggByAd}
              />
              {/* By Placement (utm_term) */}
              <AnalyticsRankingCard
                title="📍 Por Posição"
                data={aggByPlacement}
              />
            </div>
          )}
        </div>

        {/* Search + Status Filters */}
        <div className={styles.filters}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.3)",
              }}
            />
            <input
              type="text"
              placeholder="Pesquisar por email, nome, conjunto ou anúncio..."
              className={styles.filterBtn}
              style={{
                width: "100%",
                paddingLeft: 40,
                background: "rgba(255,255,255,0.03)",
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(
            [
              ["all", "Todos"],
              ["signup", "Cadastros"],
              ["waiting", "Gerados"],
              ["paid", "Pagos"],
            ] as [typeof filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.filterBtn} ${filter === key ? styles.active : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
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
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                    Carregando dados...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        {item.email}
                      </div>
                    </td>
                    <td>
                      <span className={styles.utmBadge}>
                        {cleanUtmName(item.utm_medium)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.utmBadge}>
                        {cleanUtmName(item.utm_content)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                        {formatPlacement(item.utm_term)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[item.status]}`}>
                        {item.status === "paid"
                          ? "Pago"
                          : item.status === "waiting_payment"
                          ? "Gerou PIX"
                          : "Cadastrou"}
                      </span>
                    </td>
                    <td>
                      {item.amount > 0
                        ? `R$ ${Number(item.amount).toFixed(2)}`
                        : "-"}
                    </td>
                    <td>
                      <span className={styles.utmifyTag}>{item.utmify}</span>
                      {item.status !== "signup" && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#10b981",
                            marginTop: 4,
                          }}
                        >
                          <CheckCircle2
                            size={10}
                            style={{ display: "inline", marginRight: 4 }}
                          />
                          Enviado UTMify
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {new Date(item.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────
function AnalyticsRankingCard({ title, data }: { title: string; data: UtmAgg[] }) {
  const maxSignups = Math.max(...data.map((d) => d.signups), 1);
  const maxPix = Math.max(...data.map((d) => d.pixGenerated), 1);
  const maxPaid = Math.max(...data.map((d) => d.pixPaid), 1);

  return (
    <div className={styles.analyticsCard}>
      <div className={styles.analyticsCardTitle}>{title}</div>
      {data.length === 0 ? (
        <div className={styles.analyticsEmpty}>Sem dados para o período selecionado</div>
      ) : (
        data.map((row, i) => (
          <div key={row.key + i}>
            <div className={styles.analyticsRow}>
              <span className={`${styles.analyticsRank} ${rankClass(i)}`}>
                {i + 1}
              </span>
              <span className={styles.analyticsName} title={row.key}>
                {row.key}
              </span>
              <div className={styles.analyticsValues}>
                <span className={`${styles.analyticsPill} ${styles.analyticsPillSignup}`}>
                  {row.signups}
                </span>
                <span className={`${styles.analyticsPill} ${styles.analyticsPillPix}`}>
                  {row.pixGenerated}
                </span>
                <span className={`${styles.analyticsPill} ${styles.analyticsPillPaid}`}>
                  {row.pixPaid}
                </span>
                {row.revenue > 0 && (
                  <span className={`${styles.analyticsPill} ${styles.analyticsPillRevenue}`}>
                    R${row.revenue.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
            {/* Mini bar chart */}
            <div style={{ display: "flex", gap: 4, paddingLeft: 32 }}>
              <div className={styles.analyticsBar} style={{ flex: 3 }}>
                <div
                  className={`${styles.analyticsBarFill} ${styles.analyticsBarSignup}`}
                  style={{ width: `${(row.signups / maxSignups) * 100}%` }}
                />
              </div>
              <div className={styles.analyticsBar} style={{ flex: 2 }}>
                <div
                  className={`${styles.analyticsBarFill} ${styles.analyticsBarPix}`}
                  style={{ width: `${(row.pixGenerated / maxPix) * 100}%` }}
                />
              </div>
              <div className={styles.analyticsBar} style={{ flex: 2 }}>
                <div
                  className={`${styles.analyticsBarFill} ${styles.analyticsBarPaid}`}
                  style={{ width: `${(row.pixPaid / maxPaid) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))
      )}
      {/* Legend */}
      {data.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span style={{ fontSize: 10, color: "#60a5fa", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} />
            Cadastros
          </span>
          <span style={{ fontSize: 10, color: "#fbbf24", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b", display: "inline-block" }} />
            PIX Gerado
          </span>
          <span style={{ fontSize: 10, color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981", display: "inline-block" }} />
            Pago
          </span>
        </div>
      )}
    </div>
  );
}
