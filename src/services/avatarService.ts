/**
 * Serviço para gerar avatares aleatórios usando Random User API
 */
export class AvatarService {
  /**
   * Gera um avatar aleatório usando Random User API
   * IDs de 1 a 99
   */
  static getRandomAvatar(): string {
    const gender = Math.random() > 0.5 ? 'men' : 'women';
    const randomId = Math.floor(Math.random() * 99) + 1; // 1 a 99
    return `https://randomuser.me/api/portraits/${gender}/${randomId}.jpg`;
  }

  /**
   * Gera avatar baseado em um nome (sempre retorna o mesmo para o mesmo nome)
   * IDs de 1 a 99
   */
  static getAvatarByName(name: string): string {
    // Usa o nome como seed para gerar avatar consistente
    const hash = this.hashString(name);
    const gender = hash % 2 === 0 ? 'men' : 'women';
    const id = (hash % 99) + 1; // 1 a 99
    return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
  }

  /**
   * Gera múltiplos avatares de uma vez
   */
  static getMultipleAvatars(count: number): string[] {
    return Array.from({ length: count }, () => this.getRandomAvatar());
  }

  /**
   * Hash simples de string para número
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}


