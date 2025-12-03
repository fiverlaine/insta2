/**
 * Utilitário para normalização e hash de dados para Advanced Matching do Meta Pixel
 * 
 * Este módulo fornece funções para normalizar e aplicar hash SHA256 em dados
 * que serão enviados como Advanced Matching Parameters (ud[]) para o Meta Pixel.
 * 
 * @module dataNormalization
 */

/**
 * Normaliza um email removendo espaços e convertendo para minúsculas
 * 
 * @param {string} email - Email a ser normalizado
 * @returns {string} Email normalizado ou string vazia se inválido
 * 
 * @example
 * normalizeEmail('  USER@EXAMPLE.COM  ') // 'user@example.com'
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Normaliza um número de telefone removendo caracteres não numéricos
 * 
 * @param {string} phone - Telefone a ser normalizado
 * @returns {string} Telefone normalizado (apenas dígitos) ou string vazia se inválido
 * 
 * @example
 * normalizePhone('(11) 99999-9999') // '11999999999'
 * normalizePhone('+55 11 99999-9999') // '5511999999999'
 */
export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  // Remove todos os caracteres não numéricos
  return phone.replace(/\D/g, '');
}

/**
 * Normaliza um nome removendo espaços extras e caracteres especiais
 * 
 * @param {string} name - Nome a ser normalizado
 * @returns {string} Nome normalizado (minúsculas, sem acentos) ou string vazia se inválido
 * 
 * @example
 * normalizeName('  João  ') // 'joao'
 */
export function normalizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  // Remove espaços extras, converte para minúsculas e remove acentos
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' '); // Remove espaços múltiplos
}

/**
 * Normaliza um CEP removendo caracteres não numéricos
 * 
 * @param {string} zip - CEP a ser normalizado
 * @returns {string} CEP normalizado (apenas dígitos) ou string vazia se inválido
 * 
 * @example
 * normalizeZip('12345-678') // '12345678'
 */
export function normalizeZip(zip: string): string {
  if (!zip || typeof zip !== 'string') return '';
  return zip.replace(/\D/g, '');
}

/**
 * Normaliza uma cidade removendo espaços extras e convertendo para minúsculas
 * 
 * @param {string} city - Cidade a ser normalizada
 * @returns {string} Cidade normalizada ou string vazia se inválida
 */
export function normalizeCity(city: string): string {
  if (!city || typeof city !== 'string') return '';
  return city.trim().toLowerCase();
}

/**
 * Normaliza um estado removendo espaços extras e convertendo para minúsculas
 * 
 * @param {string} state - Estado a ser normalizado
 * @returns {string} Estado normalizado ou string vazia se inválido
 */
export function normalizeState(state: string): string {
  if (!state || typeof state !== 'string') return '';
  return state.trim().toLowerCase();
}

/**
 * Normaliza um país removendo espaços extras e convertendo para minúsculas
 * 
 * @param {string} country - País a ser normalizado
 * @returns {string} País normalizado ou string vazia se inválido
 */
export function normalizeCountry(country: string): string {
  if (!country || typeof country !== 'string') return '';
  return country.trim().toLowerCase();
}

/**
 * Aplica hash SHA256 em uma string
 * 
 * @param {string} data - Dados a serem hasheados
 * @returns {Promise<string>} Hash SHA256 em hexadecimal (minúsculas) ou string vazia se erro
 * 
 * @example
 * await hashSHA256('user@example.com') // '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'
 */
export async function hashSHA256(data: string): Promise<string> {
  if (!data || typeof data !== 'string') return '';
  
  try {
    // Usar Web Crypto API (disponível em navegadores modernos)
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Erro ao aplicar hash SHA256:', error);
    return '';
  }
}

/**
 * Normaliza e aplica hash SHA256 em um email
 * 
 * @param {string} email - Email a ser processado
 * @returns {Promise<string>} Hash SHA256 do email normalizado
 */
export async function hashEmail(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!normalized) return '';
  return await hashSHA256(normalized);
}

/**
 * Normaliza e aplica hash SHA256 em um telefone
 * 
 * @param {string} phone - Telefone a ser processado
 * @returns {Promise<string>} Hash SHA256 do telefone normalizado
 */
export async function hashPhone(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  return await hashSHA256(normalized);
}

/**
 * Normaliza e aplica hash SHA256 em um nome
 * 
 * @param {string} name - Nome a ser processado
 * @returns {Promise<string>} Hash SHA256 do nome normalizado
 */
export async function hashName(name: string): Promise<string> {
  const normalized = normalizeName(name);
  if (!normalized) return '';
  return await hashSHA256(normalized);
}

/**
 * Normaliza e aplica hash SHA256 em um CEP
 * 
 * @param {string} zip - CEP a ser processado
 * @returns {Promise<string>} Hash SHA256 do CEP normalizado
 */
export async function hashZip(zip: string): Promise<string> {
  const normalized = normalizeZip(zip);
  if (!normalized) return '';
  return await hashSHA256(normalized);
}

/**
 * Normaliza e aplica hash SHA256 em uma cidade
 * 
 * @param {string} city - Cidade a ser processada
 * @returns {Promise<string>} Hash SHA256 da cidade normalizada
 */
export async function hashCity(city: string): Promise<string> {
  const normalized = normalizeCity(city);
  if (!normalized) return '';
  return await hashSHA256(normalized);
}

/**
 * Normaliza e aplica hash SHA256 em um estado
 * 
 * @param {string} state - Estado a ser processado
 * @returns {Promise<string>} Hash SHA256 do estado normalizado
 */
export async function hashState(state: string): Promise<string> {
  const normalized = normalizeState(state);
  if (!normalized) return '';
  return await hashSHA256(normalized);
}

/**
 * Normaliza e aplica hash SHA256 em um país
 * 
 * @param {string} country - País a ser processado
 * @returns {Promise<string>} Hash SHA256 do país normalizado
 */
export async function hashCountry(country: string): Promise<string> {
  const normalized = normalizeCountry(country);
  if (!normalized) return '';
  return await hashSHA256(normalized);
}

