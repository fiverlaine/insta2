import { supabase } from '@/lib/supabase';

/**
 * Serviço de Upload e Gerenciamento de Mídias
 */
export class MediaService {
  private static readonly BUCKET_NAME = 'chat-media';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Faz upload de um arquivo para o Supabase Storage
   */
  static async uploadFile(
    file: File,
    conversationId: string
  ): Promise<{ url: string; path: string } | null> {
    try {
      // Validar tamanho
      if (file.size > this.MAX_FILE_SIZE) {
        console.error('Arquivo muito grande. Máximo: 50MB');
        return null;
      }

      // Gerar nome único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const fileName = `${conversationId}/${timestamp}_${random}.${extension}`;

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erro ao fazer upload:', error);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Erro no uploadFile:', error);
      return null;
    }
  }

  /**
   * Detecta o tipo de mídia baseado no arquivo
   */
  static getMediaType(file: File): 'image' | 'video' | 'audio' | 'document' {
    const type = file.type.toLowerCase();
    
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * Valida se o tipo de arquivo é permitido
   */
  static isValidFileType(file: File): boolean {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'application/pdf',
    ];

    return validTypes.includes(file.type.toLowerCase());
  }

  /**
   * Formata o tamanho do arquivo para exibição
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Cria uma thumbnail para vídeo (usando canvas)
   */
  static async createVideoThumbnail(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadeddata = () => {
        // Pegar frame do meio do vídeo
        video.currentTime = video.duration / 2;
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          URL.revokeObjectURL(video.src);
          resolve(thumbnail);
        } else {
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
    });
  }

  static async createVideoThumbnailFromUrl(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = url;

      const cleanup = () => {
        if (video.src && video.src.startsWith('blob:')) {
          URL.revokeObjectURL(video.src);
        }
      };

      video.onloadedmetadata = () => {
        const captureTime = video.duration ? video.duration / 2 : 0.1;
        try {
          video.currentTime = captureTime;
        } catch {
          resolve(null);
        }
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 568;

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          cleanup();
          resolve(thumbnail);
        } else {
          cleanup();
          resolve(null);
        }
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };
    });
  }

  /**
   * Obtém duração de áudio/vídeo
   */
  static async getMediaDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const media = file.type.startsWith('video/') 
        ? document.createElement('video')
        : document.createElement('audio');
      
      media.preload = 'metadata';
      media.src = URL.createObjectURL(file);

      media.onloadedmetadata = () => {
        URL.revokeObjectURL(media.src);
        resolve(Math.round(media.duration));
      };

      media.onerror = () => {
        URL.revokeObjectURL(media.src);
        resolve(null);
      };
    });
  }

  /**
   * Formata duração em segundos para MM:SS
   */
  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Comprime imagem antes do upload
   */
  static async compressImage(file: File, maxWidth: number = 1920): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Redimensionar se necessário
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              0.85
            );
          } else {
            resolve(file);
          }
        };
      };
      
      reader.readAsDataURL(file);
    });
  }
}

