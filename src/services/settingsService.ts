import { supabase } from '@/lib/supabase';

export interface Setting {
    key: string;
    value: string;
    description?: string;
}

export const SettingsService = {
    async getSetting(key: string): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', key)
                .single();

            if (error) {
                console.warn(`Erro ao buscar configuração ${key}:`, error);
                return null;
            }

            return data?.value || null;
        } catch (error) {
            console.error(`Erro inesperado ao buscar configuração ${key}:`, error);
            return null;
        }
    },

    async updateSetting(key: string, value: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('settings')
                .update({ value, updated_at: new Date().toISOString() })
                .eq('key', key);

            if (error) {
                console.error(`Erro ao atualizar configuração ${key}:`, error);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Erro inesperado ao atualizar configuração ${key}:`, error);
            return false;
        }
    },

    async getFacebookPixelId(): Promise<string | null> {
        return this.getSetting('facebook_pixel_id');
    },

    async setFacebookPixelId(pixelId: string): Promise<boolean> {
        return this.updateSetting('facebook_pixel_id', pixelId);
    }
};
