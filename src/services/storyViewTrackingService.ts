import { supabase } from '@/lib/supabase';
import { FingerprintService, type VisitorFingerprint } from './fingerprintService';
import { getVisitorId } from '@/utils/visitor';

export const STORY_COMPLETION_THRESHOLD = 0.95;
const MIN_VIEW_TIME_IMAGE_MS = 1200;
const MIN_VIEW_TIME_VIDEO_MS = 1800;
const MIN_PERCENTAGE_FOR_COUNT = 0.2; // 20%

export type StoryViewExitReason =
  | 'auto_advance'
  | 'manual_next'
  | 'manual_previous'
  | 'close_button'
  | 'link_click'
  | 'chat_reply'
  | 'story_switch'
  | 'screen_unload'
  | 'idle_timeout';

export interface StoryPlaybackEvent {
  type:
    | 'enter'
    | 'play'
    | 'pause'
    | 'resume'
    | 'mute_toggle'
    | 'progress'
    | 'complete'
    | 'exit'
    | 'reply'
    | 'link';
  timestamp: string;
  progress?: number;
  payload?: Record<string, unknown>;
}

export interface StoryViewSessionContext {
  storyId: string;
  sessionId: string;
  visitorId: string;
  fingerprint: VisitorFingerprint;
  existingView?: {
    id: string;
    session_count: number;
    watch_time_ms: number;
    viewed_percentage: number;
    completed: boolean;
    exit_reason: string | null;
    playback_events: any[];
    first_viewed_at: string;
  };
}

export interface StoryViewProgressPayload {
  watchTimeMs: number;
  viewedPercentage: number; // 0 - 1
  completed: boolean;
  exitReason: StoryViewExitReason;
  startedAt: string;
  endedAt: string;
  playbackEvents: StoryPlaybackEvent[];
  mediaType: 'image' | 'video';
  durationMs: number;
}

/**
 * Interface para dados de visualização de story
 */
export interface StoryView {
  id: string;
  story_id: string;
  visitor_id: string;
  session_id: string;
  session_count: number;
  watch_time_ms: number;
  viewed_percentage: number;
  completed: boolean;
  exit_reason: string | null;
  playback_events: any[];
  first_viewed_at: string;
  last_viewed_at: string;
  viewed_at: string;
  created_at: string;
  updated_at: string;
  
  // Geolocalização
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  
  // Dispositivo
  device_type: string | null;
  device_model: string | null;
  device_vendor: string | null;
  
  // Browser/OS
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  user_agent: string | null;
  
  // Fingerprints
  fingerprint: string;
  canvas_fingerprint: string | null;
  webgl_fingerprint: string | null;
  audio_fingerprint: string | null;
  fonts_fingerprint: string | null;
  
  // Tela
  screen_resolution: string | null;
  screen_color_depth: number | null;
  pixel_ratio: number | null;
  
  // Idioma
  timezone: string | null;
  language: string | null;
  languages: string[] | null;
}

/**
 * Interface para estatísticas de visualizações
 */
export interface StoryViewStats {
  story_id: string;
  unique_views: number;
  total_views: number;
  unique_ips: number;
  unique_visitors: number;
  countries_count: number;
  cities_count: number;
  device_types_count: number;
  last_viewed_at: string | null;
  first_viewed_at: string | null;
  views_last_24h: number;
  completed_views: number;
  completion_rate_percentage: number;
  avg_watch_time_ms: number;
  avg_viewed_percentage: number;
  total_watch_time_ms: number;
}

/**
 * Interface para visualizações agrupadas por país
 */
export interface ViewsByCountry {
  country: string;
  count: number;
}

/**
 * Interface para visualizações agrupadas por dispositivo
 */
export interface ViewsByDevice {
  device_type: string;
  count: number;
}

/**
 * Interface para visualizações agrupadas por cidade
 */
export interface ViewsByCity {
  city: string;
  country: string;
  count: number;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Serviço de Tracking de Visualizações de Stories
 */
export class StoryViewTrackingService {
  // ── Cache do fingerprint (gera apenas 1x por sessão de página) ──
  private static cachedFingerprint: VisitorFingerprint | null = null;
  private static fingerprintPromise: Promise<VisitorFingerprint> | null = null;

  /**
   * Obtém o fingerprint cacheado ou gera um novo (apenas na primeira vez)
   */
  private static async getCachedFingerprint(): Promise<VisitorFingerprint> {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    // Se já tem uma geração em andamento, aguarda ela
    if (this.fingerprintPromise) {
      return this.fingerprintPromise;
    }

    // Gera pela primeira vez e cacheia a Promise
    this.fingerprintPromise = FingerprintService.generateFingerprint().then(fp => {
      this.cachedFingerprint = fp;
      this.fingerprintPromise = null;
      return fp;
    }).catch(err => {
      this.fingerprintPromise = null;
      throw err;
    });

    return this.fingerprintPromise;
  }

  /**
   * Inicia uma sessão de visualização (gera fingerprint e identifica estado atual)
   * O fingerprint é cacheado: a primeira chamada leva ~3-5s, as demais são instantâneas.
   */
  public static async beginViewSession(storyId: string): Promise<StoryViewSessionContext | null> {
    try {
      const fingerprint = await this.getCachedFingerprint();
      const visitorId = getVisitorId();
      const sessionId = this.generateSessionId();

      const { data: existingView } = await supabase
        .from('story_views')
        .select('id, session_count, watch_time_ms, viewed_percentage, completed, exit_reason, playback_events, first_viewed_at')
        .eq('story_id', storyId)
        .eq('fingerprint', fingerprint.fingerprint)
        .maybeSingle();

      return {
        storyId,
        sessionId,
        visitorId,
        fingerprint,
        existingView: existingView
          ? {
              id: existingView.id,
              session_count: existingView.session_count ?? 1,
              watch_time_ms: existingView.watch_time_ms ?? 0,
              viewed_percentage: existingView.viewed_percentage ?? 0,
              completed: existingView.completed ?? false,
              exit_reason: existingView.exit_reason ?? null,
              playback_events: existingView.playback_events ?? [],
              first_viewed_at: existingView.first_viewed_at ?? fingerprint.timestamp.toISOString(),
            }
          : undefined,
      };
    } catch (error) {
      console.error('❌ Erro ao iniciar sessão de story:', error);
      return null;
    }
  }

  /**
   * Finaliza/atualiza uma sessão de visualização com métricas detalhadas
   */
  public static async commitViewSession(
    session: StoryViewSessionContext,
    progress: StoryViewProgressPayload
  ): Promise<boolean> {
    try {
      if (!this.shouldCountView(progress)) {
        console.log('ℹ️ Visualização ignorada (abaixo dos critérios mínimos).');
        return false;
      }

      const normalizedPercentage = this.formatPercentage(progress.viewedPercentage);
      const endedAt = progress.endedAt || new Date().toISOString();
      const playbackEventsPayload = this.mergePlaybackEvents(
        session.existingView?.playback_events,
        progress.playbackEvents
      );

      if (session.existingView) {
        const newSessionCount = (session.existingView.session_count ?? 1) + 1;
        const updatePayload = {
          session_id: session.sessionId,
          session_count: newSessionCount,
          watch_time_ms: Math.max(session.existingView.watch_time_ms ?? 0, Math.round(progress.watchTimeMs)),
          viewed_percentage: Math.max(session.existingView.viewed_percentage ?? 0, normalizedPercentage),
          completed: session.existingView.completed || progress.completed,
          exit_reason: progress.exitReason ?? session.existingView.exit_reason,
          playback_events: playbackEventsPayload,
          last_viewed_at: endedAt,
          viewed_at: progress.startedAt,
          visitor_id: session.visitorId,
          fingerprint: session.fingerprint.fingerprint,
        };

        const { error } = await supabase
          .from('story_views')
          .update(updatePayload)
          .eq('id', session.existingView.id);

        if (error) {
          console.error('❌ Erro ao atualizar visualização de story:', error);
          return false;
        }

        session.existingView = {
          ...session.existingView,
          session_count: newSessionCount,
          watch_time_ms: updatePayload.watch_time_ms,
          viewed_percentage: updatePayload.viewed_percentage,
          completed: updatePayload.completed,
          exit_reason: updatePayload.exit_reason ?? null,
          playback_events: playbackEventsPayload,
          first_viewed_at: session.existingView.first_viewed_at,
        };

        console.log(`🔄 Visualização atualizada para story ${session.storyId}`);
        return true;
      }

      const insertPayload = this.prepareInsertPayload(session, progress, normalizedPercentage, endedAt, playbackEventsPayload);

      const { data, error } = await supabase
        .from('story_views')
        .insert(insertPayload)
        .select('id, session_count, watch_time_ms, viewed_percentage, completed, exit_reason, playback_events, first_viewed_at')
        .single();

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          console.warn('⚠️ Inserção duplicada detectada. Recarregando sessão e tentando novamente.');
          const refreshedSession = await this.beginViewSession(session.storyId);
          if (refreshedSession) {
            session.existingView = refreshedSession.existingView;
          }
          return false;
        }

        console.error('❌ Erro ao inserir visualização de story:', error);
        return false;
      }

      session.existingView = data
        ? {
            id: data.id,
            session_count: data.session_count ?? 1,
            watch_time_ms: data.watch_time_ms ?? Math.round(progress.watchTimeMs),
            viewed_percentage: data.viewed_percentage ?? normalizedPercentage,
            completed: data.completed ?? progress.completed,
            exit_reason: data.exit_reason ?? progress.exitReason ?? null,
            playback_events: data.playback_events ?? playbackEventsPayload,
            first_viewed_at: data.first_viewed_at ?? progress.startedAt,
          }
        : undefined;

      console.log(`✅ Visualização registrada para story ${session.storyId}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao finalizar sessão de story:', error);
      return false;
    }
  }

  /**
   * Obtém estatísticas de visualizações de um story
   */
  public static async getStoryStats(storyId: string): Promise<StoryViewStats | null> {
    try {
      const { data, error } = await supabase
        .from('story_view_stats')
        .select('*')
        .eq('story_id', storyId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro ao obter stats:', error);
      return null;
    }
  }

  /**
   * Obtém todas as visualizações de um story
   */
  public static async getStoryViews(storyId: string): Promise<StoryView[]> {
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select('*')
        .eq('story_id', storyId)
        .order('last_viewed_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar visualizações:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao obter visualizações:', error);
      return [];
    }
  }

  /**
   * Obtém visualizações agrupadas por país
   */
  public static async getViewsByCountry(storyId: string): Promise<ViewsByCountry[]> {
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select('country, fingerprint')
        .eq('story_id', storyId)
        .not('country', 'is', null);

      if (error) {
        console.error('❌ Erro ao buscar visualizações por país:', error);
        return [];
      }

      // Contar visitantes únicos por país (1 fingerprint = 1 view)
      const countryMap = new Map<string, Set<string>>();
      data.forEach((view: any) => {
        const country = view.country;
        if (!countryMap.has(country)) countryMap.set(country, new Set());
        countryMap.get(country)!.add(view.fingerprint);
      });

      return Array.from(countryMap.entries())
        .map(([country, fps]) => ({ country, count: fps.size }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Erro ao obter views por país:', error);
      return [];
    }
  }

  /**
   * Obtém visualizações agrupadas por tipo de dispositivo
   */
  public static async getViewsByDevice(storyId: string): Promise<ViewsByDevice[]> {
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select('device_type, fingerprint')
        .eq('story_id', storyId)
        .not('device_type', 'is', null);

      if (error) {
        console.error('❌ Erro ao buscar visualizações por dispositivo:', error);
        return [];
      }

      // Contar visitantes únicos por dispositivo
      const deviceMap = new Map<string, Set<string>>();
      data.forEach((view: any) => {
        const device = view.device_type;
        if (!deviceMap.has(device)) deviceMap.set(device, new Set());
        deviceMap.get(device)!.add(view.fingerprint);
      });

      return Array.from(deviceMap.entries())
        .map(([device_type, fps]) => ({ device_type, count: fps.size }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Erro ao obter views por dispositivo:', error);
      return [];
    }
  }

  /**
   * Obtém visualizações agrupadas por cidade (com coordenadas para mapa)
   */
  public static async getViewsByCity(storyId: string): Promise<ViewsByCity[]> {
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select('city, country, latitude, longitude, fingerprint')
        .eq('story_id', storyId)
        .not('city', 'is', null);

      if (error) {
        console.error('❌ Erro ao buscar visualizações por cidade:', error);
        return [];
      }

      // Contar visitantes únicos por cidade
      const cityMap = new Map<string, { city: string; country: string; fingerprints: Set<string>; latitude: number | null; longitude: number | null }>();
      data.forEach((view: any) => {
        const key = `${view.city}_${view.country}`;
        if (cityMap.has(key)) {
          cityMap.get(key)!.fingerprints.add(view.fingerprint);
        } else {
          const fps = new Set<string>();
          fps.add(view.fingerprint);
          cityMap.set(key, {
            city: view.city,
            country: view.country,
            fingerprints: fps,
            latitude: view.latitude,
            longitude: view.longitude,
          });
        }
      });

      return Array.from(cityMap.values())
        .map(v => ({ city: v.city, country: v.country, count: v.fingerprints.size, latitude: v.latitude, longitude: v.longitude }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Erro ao obter views por cidade:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas agregadas de todos os stories
   */
  public static async getAllStoriesStats(): Promise<StoryViewStats[]> {
    try {
      const { data, error } = await supabase
        .from('story_view_stats')
        .select('*')
        .order('unique_views', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar todas as estatísticas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao obter todas as stats:', error);
      return [];
    }
  }

  /**
   * Limpa caches internos (caso necessário futuramente)
   */
  public static clearLocalCache(): void {
    console.log('✅ Nenhum cache interno a limpar (sessões são controladas pelo componente React).');
  }

  private static shouldCountView(progress: StoryViewProgressPayload): boolean {
    const minWatchTime = progress.mediaType === 'video' ? MIN_VIEW_TIME_VIDEO_MS : MIN_VIEW_TIME_IMAGE_MS;
    const meetsWatchTime = progress.watchTimeMs >= minWatchTime;
    const meetsPercentage = progress.viewedPercentage >= MIN_PERCENTAGE_FOR_COUNT;

    return progress.completed || meetsWatchTime || meetsPercentage;
  }

  private static formatPercentage(value: number): number {
    const normalized = Math.min(1, Math.max(0, value));
    return Math.round(normalized * 10000) / 100; // duas casas decimais em %
  }

  private static mergePlaybackEvents(existing: any[] | undefined, incoming: StoryPlaybackEvent[]): any[] {
    const base = Array.isArray(existing) ? existing : [];
    if (!incoming.length) {
      return base;
    }
    return [...base, ...incoming];
  }

  private static prepareInsertPayload(
    session: StoryViewSessionContext,
    progress: StoryViewProgressPayload,
    normalizedPercentage: number,
    endedAt: string,
    playbackEvents: any[]
  ): Partial<StoryView> {
    return {
      story_id: session.storyId,
      visitor_id: session.visitorId,
      session_id: session.sessionId,
      session_count: 1,
      watch_time_ms: Math.round(progress.watchTimeMs),
      viewed_percentage: normalizedPercentage,
      completed: progress.completed,
      exit_reason: progress.exitReason,
      playback_events: playbackEvents,
      first_viewed_at: progress.startedAt,
      last_viewed_at: endedAt,
      viewed_at: progress.startedAt,
      ...this.prepareVisitorData(session.fingerprint),
    };
  }

  private static prepareVisitorData(fingerprint: VisitorFingerprint) {
    return {
      // Geolocalização
      ip_address: fingerprint.geoLocation?.ip || null,
      country: fingerprint.geoLocation?.country || null,
      city: fingerprint.geoLocation?.city || null,
      region: fingerprint.geoLocation?.region || null,
      latitude: fingerprint.geoLocation?.latitude || null,
      longitude: fingerprint.geoLocation?.longitude || null,
      isp: fingerprint.geoLocation?.isp || null,

      // Dispositivo
      device_type: fingerprint.deviceInfo.deviceType,
      device_model: fingerprint.deviceInfo.deviceModel,
      device_vendor: fingerprint.deviceInfo.deviceVendor,

      // Browser/OS
      browser: fingerprint.deviceInfo.browser,
      browser_version: fingerprint.deviceInfo.browserVersion,
      os: fingerprint.deviceInfo.os,
      os_version: fingerprint.deviceInfo.osVersion,
      user_agent: fingerprint.deviceInfo.userAgent,

      // Fingerprints
      fingerprint: fingerprint.fingerprint,
      canvas_fingerprint: fingerprint.advancedFingerprints.canvasFingerprint,
      webgl_fingerprint: fingerprint.advancedFingerprints.webglFingerprint,
      audio_fingerprint: fingerprint.advancedFingerprints.audioFingerprint,
      fonts_fingerprint: fingerprint.advancedFingerprints.fontsFingerprint,

      // Tela
      screen_resolution: fingerprint.screenInfo.screenResolution,
      screen_color_depth: fingerprint.screenInfo.screenColorDepth,
      pixel_ratio: fingerprint.screenInfo.pixelRatio,

      // Idioma
      timezone: fingerprint.languageInfo.timezone,
      language: fingerprint.languageInfo.language,
      languages: fingerprint.languageInfo.languages,
    };
  }

  private static generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

