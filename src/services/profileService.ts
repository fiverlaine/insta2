import { supabase } from '@/lib/supabase';

export interface ProfileSettings {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  bio: string[];
  link: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  profile_username: string;
  images: string[];
  likes_count: number;
  comments_count?: number;
  caption: string;
  post_date: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Serviço de Gerenciamento de Perfil e Posts com Cache
 */
export class ProfileService {
  private static readonly BUCKET_NAME = 'profile-media';
  private static readonly STATIC_DATA_BUCKET = 'profile-media';
  private static readonly STATIC_PROFILE_FILE = 'static-profile-data.json';
  private static readonly STATIC_POSTS_FILE = 'static-posts-data.json';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private static readonly CACHE_KEY_PROFILE = 'profile_';
  private static readonly CACHE_KEY_POSTS = 'posts_';
  private static staticProfileStatus: 'unknown' | 'available' | 'missing' = 'unknown';
  private static staticPostsStatus: 'unknown' | 'available' | 'missing' = 'unknown';

  /**
   * Retornar perfil em cache (mesmo que expirado) para carregar instantaneamente
   */
  static getCachedProfileSync(): ProfileSettings | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY_PROFILE}active`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Erro ao obter perfil em cache:', error);
      return null;
    }
  }

  /**
   * Retornar posts em cache (mesmo que expirados) para carregar instantaneamente
   */
  static getCachedPostsSync(): Post[] {
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY_POSTS}active`);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn('Erro ao obter posts em cache:', error);
      return [];
    }
  }

  private static cacheProfileData(profile: ProfileSettings): void {
    try {
      const cacheKey = `${this.CACHE_KEY_PROFILE}active`;
      const cacheTimeKey = `${cacheKey}_time`;
      localStorage.setItem(cacheKey, JSON.stringify(profile));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
    } catch (error) {
      console.warn('Erro ao salvar cache do perfil:', error);
    }
  }

  private static cachePostsData(posts: Post[]): void {
    try {
      const cacheKey = `${this.CACHE_KEY_POSTS}active`;
      const cacheTimeKey = `${cacheKey}_time`;
      localStorage.setItem(cacheKey, JSON.stringify(posts));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
    } catch (error) {
      console.warn('Erro ao salvar cache de posts:', error);
    }
  }

  /**
   * Buscar configurações do perfil (ESTÁTICO PRIMEIRO, depois Supabase)
   * 1. Tenta carregar do arquivo estático (instantâneo, sem rede)
   * 2. Se não existir, busca do Supabase
   */
  static async getProfile(
    _username?: string,
    options?: { forceRefresh?: boolean }
  ): Promise<ProfileSettings | null> {
    const forceRefresh = options?.forceRefresh ?? false;

    const cacheKey = `${this.CACHE_KEY_PROFILE}active`;
    const cacheTimeKey = `${cacheKey}_time`;

    if (!forceRefresh) {
      // 1. TENTAR ARQUIVO ESTÁTICO PRIMEIRO (instantâneo!)
      try {
        const staticData = await this.loadStaticProfile();
        if (staticData) {
          this.cacheProfileData(staticData);
          return staticData;
        }
      } catch (error) {
        console.warn('Arquivo estático não encontrado, buscando do Supabase...');
      }

      // 2. Tentar cache do localStorage
      try {
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < this.CACHE_DURATION) {
            return JSON.parse(cached);
          }
        }
      } catch (error) {
        console.warn('Erro ao ler cache:', error);
      }
    } else {
      // Se for refresh, invalidar status para garantir atualização futura
      this.staticProfileStatus = 'unknown';
    }

    // 3. Buscar do Supabase - busca o ÚNICO perfil ativo
    try {
      console.log('🔍 [ProfileService] Buscando perfil ativo...');
      const { data, error } = await supabase
        .from('profile_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error) {
        console.error('❌ [ProfileService] Erro ao buscar perfil:', error);
        // Tentar buscar sem filtro de is_active como fallback
        console.log('🔄 [ProfileService] Tentando buscar perfil sem filtro is_active...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profile_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (!fallbackError && fallbackData) {
          console.log('✅ [ProfileService] Perfil encontrado (fallback):', { username: fallbackData.username });
          this.cacheProfileData(fallbackData);
          return fallbackData;
        }
        
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : null;
      }

      console.log('✅ [ProfileService] Perfil encontrado:', { username: data?.username, name: data?.name });
      this.cacheProfileData(data);

      if (forceRefresh || this.staticProfileStatus !== 'available' || this.staticPostsStatus !== 'available') {
        this.generateStaticFiles().catch((err) => {
          console.warn('Erro ao gerar arquivo estático (background):', err);
        });
      }

      return data;
    } catch (error) {
      console.error('Erro no getProfile:', error);
      return null;
    }
  }

  /**
   * Carregar perfil do arquivo estático (instantâneo, sem query no banco)
   */
  private static async loadStaticProfile(): Promise<ProfileSettings | null> {
    try {
      if (this.staticProfileStatus === 'missing') {
        return null;
      }

      const { data, error } = await supabase.storage
        .from(this.STATIC_DATA_BUCKET)
        .download(this.STATIC_PROFILE_FILE);

      if (error || !data) {
        this.staticProfileStatus = 'missing';
        return null;
      }

      const text = await data.text();
      const profile = JSON.parse(text);
      this.staticProfileStatus = 'available';
      this.cacheProfileData(profile);
      return profile;
    } catch (error) {
      this.staticProfileStatus = 'missing';
      return null;
    }
  }

  /**
   * Atualizar configurações do perfil
   * Se o username mudar, atualiza também todas as tabelas relacionadas
   */
  static async updateProfile(
    oldUsername: string,
    updates: Partial<ProfileSettings>
  ): Promise<boolean> {
    try {
      const newUsername = updates.username;
      const usernameChanged = newUsername && newUsername !== oldUsername;

      if (usernameChanged) {
        console.log(`🔄 Atualizando username: ${oldUsername} → ${newUsername}`);
      }

      // Atualizar profile_settings
      const { error } = await supabase
        .from('profile_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('username', oldUsername);

      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        return false;
      }

      console.log('✅ Perfil atualizado com sucesso!');

      // Limpar cache após atualizar
      this.clearProfileCache();
      this.clearPostsCache();

      // GERAR ARQUIVO ESTÁTICO (para carregamento instantâneo)
      await this.generateStaticFiles();

      return true;
    } catch (error) {
      console.error('Erro no updateProfile:', error);
      return false;
    }
  }

  /**
   * Upload de foto de perfil
   */
  static async uploadAvatar(file: File, username: string): Promise<string | null> {
    try {
      if (file.size > this.MAX_FILE_SIZE) {
        console.error('Arquivo muito grande. Máximo: 50MB');
        return null;
      }

      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${username}/avatar_${timestamp}.${extension}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Erro ao fazer upload do avatar:', error);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro no uploadAvatar:', error);
      return null;
    }
  }

  /**
   * Buscar posts do perfil (ESTÁTICO PRIMEIRO, depois Supabase)
   * 1. Tenta carregar do arquivo estático (instantâneo, sem rede)
   * 2. Se não existir, busca do Supabase
   */
  static async getPosts(_username?: string): Promise<Post[]> {
    // 1. TENTAR ARQUIVO ESTÁTICO PRIMEIRO (instantâneo!)
    try {
      const staticPosts = await this.loadStaticPosts();
      if (staticPosts && staticPosts.length > 0) {
        this.cachePostsData(staticPosts);
        return staticPosts;
      }
    } catch (error) {
      console.warn('Arquivo estático de posts não encontrado, buscando do Supabase...');
    }

    // 2. Tentar cache do localStorage
      const cacheKey = `${this.CACHE_KEY_POSTS}active`;
      const cacheTimeKey = `${cacheKey}_time`;
    try {
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < this.CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.warn('Erro ao ler cache:', error);
    }

    // 3. Primeiro, buscar o perfil ativo para pegar o username atual
    try {
      const profile = await this.getProfile();
      if (!profile) {
        return [];
      }

      // Buscar posts usando o username atual do perfil
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('profile_username', profile.username)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erro ao buscar posts:', error);
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : [];
      }

      const posts = data || [];

      this.cachePostsData(posts);

      if (this.staticPostsStatus !== 'available') {
        this.generateStaticFiles().catch((err) => {
          console.warn('Erro ao gerar arquivo estático (background):', err);
        });
      }

      return posts;
    } catch (error) {
      console.error('Erro no getPosts:', error);
      return [];
    }
  }

  /**
   * Carregar posts do arquivo estático (instantâneo, sem query no banco)
   */
  private static async loadStaticPosts(): Promise<Post[] | null> {
    try {
      if (this.staticPostsStatus === 'missing') {
        return null;
      }

      const { data, error } = await supabase.storage
        .from(this.STATIC_DATA_BUCKET)
        .download(this.STATIC_POSTS_FILE);

      if (error || !data) {
        return null;
      }

      const text = await data.text();
      const posts = JSON.parse(text);
      this.staticPostsStatus = 'available';
      this.cachePostsData(posts);
      return posts;
    } catch (error) {
      this.staticPostsStatus = 'missing';
      return null;
    }
  }

  /**
   * Buscar TODOS os posts (para admin)
   */
  static async getAllPosts(username: string): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('profile_username', username)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erro ao buscar posts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro no getAllPosts:', error);
      return [];
    }
  }

  /**
   * Criar novo post
   */
  static async createPost(
    username: string,
    images: string[],
    caption: string,
    postDate: string,
    likesCount: number = 0
  ): Promise<Post | null> {
    try {
      // Buscar o próximo order_index
      const { data: maxOrder } = await supabase
        .from('posts')
        .select('order_index')
        .eq('profile_username', username)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('posts')
        .insert({
          profile_username: username,
          images,
          caption,
          post_date: postDate,
          likes_count: likesCount,
          order_index: nextOrder,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar post:', error);
        return null;
      }

      // Limpar cache e atualizar contagem
      this.clearPostsCache(username);
      await this.updatePostsCount(username);

      // GERAR ARQUIVO ESTÁTICO
      await this.generateStaticFiles();

      return data;
    } catch (error) {
      console.error('Erro no createPost:', error);
      return null;
    }
  }

  /**
   * Atualizar post existente
   */
  static async updatePost(
    postId: string,
    username: string,
    updates: Partial<Post>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        console.error('Erro ao atualizar post:', error);
        return false;
      }

      // Limpar cache após atualizar
      this.clearPostsCache(username);

      // GERAR ARQUIVO ESTÁTICO
      await this.generateStaticFiles();

      return true;
    } catch (error) {
      console.error('Erro no updatePost:', error);
      return false;
    }
  }

  /**
   * Deletar post
   */
  static async deletePost(postId: string, username: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Erro ao deletar post:', error);
        return false;
      }

      // Limpar cache e atualizar contagem
      this.clearPostsCache(username);
      await this.updatePostsCount(username);

      // GERAR ARQUIVO ESTÁTICO
      await this.generateStaticFiles();

      return true;
    } catch (error) {
      console.error('Erro no deletePost:', error);
      return false;
    }
  }

  /**
   * Ativar/Desativar post
   */
  static async togglePostActive(
    postId: string,
    isActive: boolean,
    username: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      if (error) {
        console.error('Erro ao atualizar status do post:', error);
        return false;
      }

      // Limpar cache e atualizar contagem
      this.clearPostsCache(username);
      await this.updatePostsCount(username);

      // GERAR ARQUIVO ESTÁTICO
      await this.generateStaticFiles();

      return true;
    } catch (error) {
      console.error('Erro no togglePostActive:', error);
      return false;
    }
  }

  /**
   * Reordenar posts
   */
  static async reorderPosts(postIds: string[], username: string): Promise<boolean> {
    try {
      const updates = postIds.map((id, index) => ({
        id,
        order_index: index,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('posts')
          .update({
            order_index: update.order_index,
            updated_at: update.updated_at,
          })
          .eq('id', update.id);

        if (error) {
          console.error('Erro ao reordenar:', error);
          return false;
        }
      }

      // Limpar cache após reordenar
      this.clearPostsCache(username);

      // GERAR ARQUIVO ESTÁTICO
      await this.generateStaticFiles();

      return true;
    } catch (error) {
      console.error('Erro no reorderPosts:', error);
      return false;
    }
  }

  /**
   * Upload de imagem de post
   */
  static async uploadPostImage(file: File, username: string): Promise<string | null> {
    try {
      if (file.size > this.MAX_FILE_SIZE) {
        console.error('Arquivo muito grande. Máximo: 50MB');
        return null;
      }

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const fileName = `${username}/posts/${timestamp}_${random}.${extension}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro no uploadPostImage:', error);
      return null;
    }
  }

  /**
   * Atualizar contagem de posts automaticamente
   */
  private static async updatePostsCount(username: string): Promise<void> {
    try {
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('profile_username', username)
        .eq('is_active', true);

      if (count !== null) {
        await this.updateProfile(username, { posts_count: count });
      }
    } catch (error) {
      console.error('Erro ao atualizar contagem de posts:', error);
    }
  }

  /**
   * Limpar cache do perfil
   */
  static clearProfileCache(_username?: string): void {
    try {
      const cacheKey = `${this.CACHE_KEY_PROFILE}active`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_time`);
      console.log('✅ Cache do perfil limpo');
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
    this.staticProfileStatus = 'unknown';
  }

  /**
   * Limpar cache de posts
   */
  static clearPostsCache(_username?: string): void {
    try {
      const cacheKey = `${this.CACHE_KEY_POSTS}active`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_time`);
      console.log('✅ Cache de posts limpo');
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
    this.staticPostsStatus = 'unknown';
  }

  /**
   * Limpar todos os caches
   */
  static clearAllCaches(_username?: string): void {
    this.clearProfileCache();
    this.clearPostsCache();
  }

  /**
   * Gerar arquivos JSON estáticos para carregamento instantâneo
   * Salva no Supabase Storage para acesso público
   * Pode ser chamado manualmente pelo admin
   */
  static async generateStaticFiles(): Promise<boolean> {
    try {
      // 1. Buscar perfil ativo
      const { data: profileData, error: profileError } = await supabase
        .from('profile_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (profileError || !profileData) {
        console.warn('Perfil não encontrado para gerar arquivo estático');
        return false;
      }

      // 2. Buscar posts ativos
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('profile_username', profileData.username)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (postsError) {
        console.warn('Erro ao buscar posts para arquivo estático:', postsError);
      }

      const posts = postsData || [];

      // 3. Gerar JSON do perfil
      const profileJson = JSON.stringify(profileData, null, 2);
      const profileBlob = new Blob([profileJson], { type: 'application/json' });

      // 4. Gerar JSON dos posts
      const postsJson = JSON.stringify(posts, null, 2);
      const postsBlob = new Blob([postsJson], { type: 'application/json' });

      // 5. Upload para Supabase Storage (público)
      const [profileUpload, postsUpload] = await Promise.all([
        supabase.storage
          .from(this.STATIC_DATA_BUCKET)
          .upload(this.STATIC_PROFILE_FILE, profileBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/json',
          }),
        supabase.storage
          .from(this.STATIC_DATA_BUCKET)
          .upload(this.STATIC_POSTS_FILE, postsBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/json',
          }),
      ]);

      if (profileUpload.error) {
        console.error('Erro ao salvar arquivo estático do perfil:', profileUpload.error);
      } else {
        console.log('✅ Arquivo estático do perfil gerado com sucesso!');
      }

      if (postsUpload.error) {
        console.error('Erro ao salvar arquivo estático dos posts:', postsUpload.error);
        return false;
      } else {
        console.log('✅ Arquivo estático dos posts gerado com sucesso!');
      }

      this.staticProfileStatus = 'available';
      this.staticPostsStatus = 'available';

      return true;
    } catch (error) {
      console.error('Erro ao gerar arquivos estáticos:', error);
      return false;
    }
  }
}

