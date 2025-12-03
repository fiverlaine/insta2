/**
 * Utilitário para rastreamento de eventos do Facebook Pixel (Meta Pixel)
 * com Advanced Matching Parameters e Custom Parameters
 * 
 * Este módulo fornece funções para rastrear eventos personalizados
 * usando o Facebook Pixel instalado na aplicação, incluindo:
 * - Advanced Matching Parameters (ud[]) para melhor correspondência
 * - Custom Parameters (client_ip_address, client_user_agent, fbp, fbc)
 * 
 * @module facebookPixel
 */

import { hashSHA256, hashCity, hashState, hashCountry } from './dataNormalization';
import { FingerprintService, type VisitorFingerprint } from '@/services/fingerprintService';
import { getVisitorId } from './visitor';

// Declaração de tipo para o Facebook Pixel
declare global {
  interface Window {
    fbq?: (
      action: 'init' | 'track' | 'trackCustom',
      eventName: string,
      params?: Record<string, any>
    ) => void;
  }
}

/**
 * Interface para Advanced Matching Parameters
 */
export interface AdvancedMatchingParams {
  em?: string; // Email (hasheado SHA256)
  ph?: string; // Telefone (hasheado SHA256)
  fn?: string; // Primeiro nome (hasheado SHA256)
  ln?: string; // Último nome (hasheado SHA256)
  ct?: string; // Cidade (hasheado SHA256)
  st?: string; // Estado (hasheado SHA256)
  zp?: string; // CEP (hasheado SHA256)
  country?: string; // País (hasheado SHA256)
  external_id?: string; // ID externo (hasheado SHA256)
  ge?: string; // Gênero (hasheado SHA256)
  db?: string; // Data de nascimento (hasheado SHA256)
}

/**
 * Interface para Custom Parameters
 */
export interface CustomParams {
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string; // Facebook Browser ID
  fbc?: string; // Facebook Click ID
  [key: string]: any;
}

/**
 * Verifica se o Facebook Pixel está carregado e disponível
 * 
 * @returns {boolean} True se o pixel estiver disponível, false caso contrário
 */
export function isPixelLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/**
 * Obtém o valor do cookie _fbp (Facebook Browser ID)
 * 
 * @returns {string | null} Valor do cookie _fbp ou null se não existir
 */
export function getFbpCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; _fbp=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
  } catch (error) {
    console.warn('Erro ao ler cookie _fbp:', error);
  }
  return null;
}

/**
 * Obtém o valor do cookie _fbc (Facebook Click ID)
 * 
 * @returns {string | null} Valor do cookie _fbc ou null se não existir
 */
export function getFbcCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; _fbc=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
  } catch (error) {
    console.warn('Erro ao ler cookie _fbc:', error);
  }
  return null;
}

/**
 * Coleta dados do visitante para Custom Parameters
 * 
 * @returns {Promise<CustomParams>} Objeto com Custom Parameters
 */
async function collectCustomParams(): Promise<CustomParams> {
  const customParams: CustomParams = {};

  try {
    // Facebook Browser ID (_fbp) - sempre disponível rapidamente
    const fbp = getFbpCookie();
    if (fbp) {
      customParams.fbp = fbp;
    }

    // Facebook Click ID (_fbc) - sempre disponível rapidamente
    const fbc = getFbcCookie();
    if (fbc) {
      customParams.fbc = fbc;
    }

    // User Agent - disponível imediatamente
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      customParams.client_user_agent = navigator.userAgent;
    }

    // Tentar obter fingerprint do visitante (pode estar em cache)
    try {
      const fingerprint = await FingerprintService.generateFingerprint();
      
      // IP Address
      if (fingerprint.geoLocation?.ip) {
        customParams.client_ip_address = fingerprint.geoLocation.ip;
      }
    } catch (fingerprintError) {
      // Se falhar, continua sem IP (não é crítico)
      console.warn('Erro ao obter fingerprint para IP:', fingerprintError);
    }
  } catch (error) {
    console.warn('Erro ao coletar Custom Parameters:', error);
  }

  return customParams;
}

/**
 * Prepara Advanced Matching Parameters baseado nos dados disponíveis
 * 
 * @param {VisitorFingerprint} fingerprint - Fingerprint do visitante
 * @param {string} [externalId] - ID externo do usuário (opcional)
 * @returns {Promise<AdvancedMatchingParams>} Objeto com Advanced Matching Parameters
 */
async function prepareAdvancedMatching(
  fingerprint: VisitorFingerprint,
  externalId?: string
): Promise<AdvancedMatchingParams> {
  const advancedMatching: AdvancedMatchingParams = {};

  try {
    // External ID (usando visitor ID se não fornecido)
    if (externalId) {
      advancedMatching.external_id = await hashSHA256(externalId);
    } else {
      const visitorId = getVisitorId();
      if (visitorId) {
        advancedMatching.external_id = await hashSHA256(visitorId);
      }
    }

    // Geolocalização (se disponível)
    if (fingerprint.geoLocation) {
      if (fingerprint.geoLocation.city) {
        advancedMatching.ct = await hashCity(fingerprint.geoLocation.city);
      }
      if (fingerprint.geoLocation.region) {
        advancedMatching.st = await hashState(fingerprint.geoLocation.region);
      }
      if (fingerprint.geoLocation.country) {
        advancedMatching.country = await hashCountry(fingerprint.geoLocation.country);
      }
    }

    // Nota: Email, telefone, nome, etc. seriam coletados do perfil do usuário
    // se disponível. Por enquanto, não temos esses dados no contexto atual.
  } catch (error) {
    console.warn('Erro ao preparar Advanced Matching Parameters:', error);
  }

  return advancedMatching;
}

/**
 * Rastreia um evento padrão do Facebook Pixel com Advanced Matching e Custom Parameters
 * 
 * @param {string} eventName - Nome do evento a ser rastreado (ex: 'Lead', 'Purchase', 'ViewContent')
 * @param {Record<string, any>} [params] - Parâmetros opcionais do evento
 * @param {boolean} [includeAdvancedMatching=true] - Incluir Advanced Matching Parameters
 * @param {boolean} [includeCustomParams=true] - Incluir Custom Parameters
 * 
 * @example
 * trackEvent('Lead', { content_name: 'Story Link Click' });
 */
export async function trackEvent(
  eventName: string,
  params?: Record<string, any>,
  includeAdvancedMatching: boolean = true,
  includeCustomParams: boolean = true
): Promise<void> {
  if (!isPixelLoaded()) {
    console.warn('Facebook Pixel não está carregado. Evento não rastreado:', eventName);
    return;
  }

  // Inicializar parâmetros do evento com os parâmetros básicos
  const eventParams: Record<string, any> = { ...params };

  // Função para adicionar Custom Parameters com timeout
  const addCustomParams = async (): Promise<void> => {
    if (!includeCustomParams) return;
    
    try {
      // Timeout de 2 segundos para não bloquear o evento
      const customParamsPromise = collectCustomParams();
      const timeoutPromise = new Promise<CustomParams>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      const customParams = await Promise.race([customParamsPromise, timeoutPromise]);
      Object.assign(eventParams, customParams);
    } catch (error) {
      // Se falhar, tenta adicionar apenas fbp e fbc (mais rápidos)
      try {
        const fbp = getFbpCookie();
        if (fbp) eventParams.fbp = fbp;
        
        const fbc = getFbcCookie();
        if (fbc) eventParams.fbc = fbc;
      } catch (e) {
        console.warn('Erro ao adicionar cookies fbp/fbc:', e);
      }
      console.warn('Erro ao adicionar Custom Parameters (continuando sem eles):', error);
    }
  };

  // Função para adicionar Advanced Matching Parameters com timeout
  const addAdvancedMatching = async (): Promise<void> => {
    if (!includeAdvancedMatching) return;
    
    try {
      // Timeout de 2 segundos para não bloquear o evento
      const fingerprintPromise = FingerprintService.generateFingerprint();
      const timeoutPromise = new Promise<VisitorFingerprint>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      const fingerprint = await Promise.race([fingerprintPromise, timeoutPromise]);
      const advancedMatching = await prepareAdvancedMatching(fingerprint);
      
      // Adicionar Advanced Matching Parameters no formato correto do Meta Pixel browser
      // O Meta Pixel browser aceita os parâmetros diretamente (não como ud[])
      if (advancedMatching.external_id) {
        eventParams.external_id = advancedMatching.external_id;
      }
      if (advancedMatching.ct) {
        eventParams.ct = advancedMatching.ct;
      }
      if (advancedMatching.st) {
        eventParams.st = advancedMatching.st;
      }
      if (advancedMatching.country) {
        eventParams.country = advancedMatching.country;
      }
      // Adicionar outros parâmetros se disponíveis
      if (advancedMatching.em) eventParams.em = advancedMatching.em;
      if (advancedMatching.ph) eventParams.ph = advancedMatching.ph;
      if (advancedMatching.fn) eventParams.fn = advancedMatching.fn;
      if (advancedMatching.ln) eventParams.ln = advancedMatching.ln;
      if (advancedMatching.zp) eventParams.zp = advancedMatching.zp;
      if (advancedMatching.ge) eventParams.ge = advancedMatching.ge;
      if (advancedMatching.db) eventParams.db = advancedMatching.db;
    } catch (error) {
      // Se falhar, tenta adicionar apenas external_id (mais rápido)
      try {
        const visitorId = getVisitorId();
        if (visitorId) {
          const externalId = await hashSHA256(visitorId);
          if (externalId) {
            eventParams.external_id = externalId;
          }
        }
      } catch (e) {
        console.warn('Erro ao adicionar external_id:', e);
      }
      console.warn('Erro ao adicionar Advanced Matching Parameters (continuando sem eles):', error);
    }
  };

  try {
    // Coletar dados em paralelo com timeout
    await Promise.allSettled([
      addCustomParams(),
      addAdvancedMatching()
    ]);

    // Enviar evento mesmo se alguns parâmetros falharem
    window.fbq!('track', eventName, eventParams);
    console.log(`✅ Evento rastreado: ${eventName}`, eventParams);
  } catch (error) {
    // Fallback: enviar evento apenas com parâmetros básicos
    console.error('Erro ao rastrear evento do Facebook Pixel, enviando evento básico:', error);
    try {
      window.fbq!('track', eventName, params || {});
      console.log(`✅ Evento básico rastreado: ${eventName}`, params || {});
    } catch (fallbackError) {
      console.error('Erro crítico ao enviar evento:', fallbackError);
    }
  }
}

/**
 * Rastreia um evento customizado do Facebook Pixel
 * 
 * @param {string} eventName - Nome do evento customizado
 * @param {Record<string, any>} [params] - Parâmetros opcionais do evento
 * 
 * @example
 * trackCustomEvent('StoryLinkClick', { story_index: 3, link_url: 'https://example.com' });
 */
export function trackCustomEvent(
  eventName: string,
  params?: Record<string, any>
): void {
  if (!isPixelLoaded()) {
    console.warn('Facebook Pixel não está carregado. Evento customizado não rastreado:', eventName);
    return;
  }

  try {
    if (params) {
      window.fbq!('trackCustom', eventName, params);
    } else {
      window.fbq!('trackCustom', eventName);
    }
    console.log(`✅ Evento customizado rastreado: ${eventName}`, params || '');
  } catch (error) {
    console.error('Erro ao rastrear evento customizado do Facebook Pixel:', error);
  }
}

/**
 * Rastreia o evento "Lead" quando um usuário clica no link invisível dos stories
 * com Advanced Matching Parameters e Custom Parameters
 * 
 * @param {number} storyIndex - Índice do story (order_index)
 * @param {string} linkUrl - URL do link clicado
 * 
 * @example
 * await trackLeadFromStory(3, 'https://example.com');
 */
export async function trackLeadFromStory(storyIndex: number, linkUrl: string): Promise<void> {
  await trackEvent('Lead', {
    content_name: `Story ${storyIndex + 1} Link Click`,
    content_category: 'Story',
    content_ids: [`story_${storyIndex}`],
    value: 0,
    currency: 'BRL',
    source: 'Instagram Story',
    link_url: linkUrl,
  }, true, true); // Incluir Advanced Matching e Custom Parameters
}

