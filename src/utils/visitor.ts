/**
 * Gera ou recupera um ID único para o visitante
 * Armazenado no localStorage para persistência entre sessões
 */
export function getVisitorId(): string {
  const STORAGE_KEY = 'instagram_clone_visitor_id';
  
  let visitorId = localStorage.getItem(STORAGE_KEY);
  
  if (!visitorId) {
    // Gerar ID único baseado em timestamp + random
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  
  return visitorId;
}

/**
 * Limpa o ID do visitante (útil para testes)
 */
export function clearVisitorId(): void {
  localStorage.removeItem('instagram_clone_visitor_id');
}

