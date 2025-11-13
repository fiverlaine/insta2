/**
 * Utilitários para limpar cache e forçar reload de recursos
 */

/**
 * Limpa todo o cache do localStorage
 */
export function clearAllCache(): void {
  try {
    // Limpar localStorage
    localStorage.clear();
    console.log('✅ Cache do localStorage limpo');

    // Limpar sessionStorage
    sessionStorage.clear();
    console.log('✅ Cache do sessionStorage limpo');

    // Se houver Service Worker, limpar cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        console.log('✅ Service Workers desregistrados');
      });
    }

    // Limpar cache do navegador
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
        console.log('✅ Cache API limpo');
      });
    }
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
  }
}

/**
 * Adiciona timestamp à URL para forçar reload
 */
export function addCacheBuster(url: string): string {
  if (!url) return url;

  try {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}`;
  } catch (error) {
    console.error('Erro ao adicionar cache buster:', error);
    return url;
  }
}

/**
 * Força reload completo da página (sem cache)
 */
export function forceHardReload(): void {
  window.location.reload();
}

/**
 * Limpa cache de imagens específicas do Supabase
 */
export function clearSupabaseImageCache(): void {
  const keys = Object.keys(localStorage);
  const supabaseKeys = keys.filter(
    (key) => key.includes('profile_') || key.includes('posts_')
  );

  supabaseKeys.forEach((key) => {
    localStorage.removeItem(key);
    console.log(`🗑️ Cache removido: ${key}`);
  });

  console.log(`✅ ${supabaseKeys.length} caches do Supabase limpos`);
}

/**
 * Pré-carrega uma imagem e retorna uma Promise
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log('✅ Imagem pré-carregada:', url);
      resolve();
    };
    img.onerror = (error) => {
      console.error('❌ Erro ao pré-carregar imagem:', url, error);
      reject(error);
    };
    img.src = url;
  });
}

/**
 * Pré-carrega múltiplas imagens em paralelo
 */
export async function preloadImages(urls: string[]): Promise<void> {
  try {
    await Promise.all(urls.map((url) => preloadImage(url)));
    console.log(`✅ ${urls.length} imagens pré-carregadas`);
  } catch (error) {
    console.error('Erro ao pré-carregar imagens:', error);
  }
}

/**
 * Verifica se uma URL é acessível
 */
export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar imagem:', url, error);
    return false;
  }
}

/**
 * Diagnóstico completo de imagens
 */
export async function diagnoseImageLoading(urls: string[]): Promise<void> {
  console.log('🔍 Iniciando diagnóstico de imagens...');
  console.log(`📊 Total de URLs: ${urls.length}`);

  for (const url of urls) {
    console.log(`\n🖼️ Testando: ${url}`);
    
    const isAccessible = await isImageAccessible(url);
    if (isAccessible) {
      console.log('✅ URL acessível');
    } else {
      console.error('❌ URL não acessível');
    }
  }

  console.log('\n✅ Diagnóstico completo');
}

