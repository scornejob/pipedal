const TONE3000_BASE_URL = 'https://www.tone3000.com/api/v1';

const STORAGE_ACCESS_TOKEN = 'tone3000_access_token';
const STORAGE_REFRESH_TOKEN = 'tone3000_refresh_token';
const STORAGE_EXPIRES_AT = 'tone3000_expires_at';

// ---- Enums ----

export type Gear = 'amp' | 'full-rig' | 'pedal' | 'outboard' | 'ir';
export type Platform = 'nam' | 'ir' | 'aida-x' | 'aa-snapshot' | 'proteus';
export type License = 't3k' | 'cc-by' | 'cc-by-sa' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nd' | 'cc-by-nc-nd' | 'cco';
export type Size = 'standard' | 'lite' | 'feather' | 'nano' | 'custom';
export type TonesSort = 'best-match' | 'newest' | 'oldest' | 'trending' | 'downloads-all-time';

// ---- Types ----

export interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: 'bearer';
}

export interface EmbeddedUser {
    id: string;
    username: string;
    avatar_url: string | null;
    url: string;
}

export interface Make {
    id: number;
    name: string;
}

export interface Tag {
    id: number;
    name: string;
}

export interface Tone {
    id: number;
    user_id: string;
    user: EmbeddedUser;
    created_at: string;
    updated_at: string;
    title: string;
    description: string | null;
    gear: Gear;
    images: string[] | null;
    is_public: boolean | null;
    links: string[] | null;
    platform: Platform;
    license: License;
    sizes?: Size[];
    makes: Make[];
    tags: Tag[];
    models_count: number;
    downloads_count: number;
    favorites_count: number;
    url: string;
}

export interface Model {
    id: number;
    created_at: string;
    updated_at: string;
    user_id: string;
    model_url: string;
    name: string;
    size: Size;
    tone_id: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface SearchTonesOptions {
    query?: string;
    page?: number;
    page_size?: number;
    sort?: TonesSort;
    gear?: Gear[];
    sizes?: Size[];
}

// ---- Client ----

export class Tone3000Client {

    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private expiresAt: number = 0;

    constructor() {
        this.accessToken = localStorage.getItem(STORAGE_ACCESS_TOKEN);
        this.refreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN);
        this.expiresAt = parseInt(localStorage.getItem(STORAGE_EXPIRES_AT) ?? '0', 10);
    }

    get hasSession(): boolean {
        return this.accessToken !== null && this.refreshToken !== null;
    }

    clearSession(): void {
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = 0;
        localStorage.removeItem(STORAGE_ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_EXPIRES_AT);
    }

    async createSession(apiKey: string): Promise<void> {
        const response = await fetch(`${TONE3000_BASE_URL}/auth/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey }),
        });
        if (!response.ok) {
            throw new Error(`Failed to create session: ${response.statusText}`);
        }
        const session: Session = await response.json();
        this.storeSession(session);
    }

    async searchTones(options: SearchTonesOptions = {}): Promise<PaginatedResponse<Tone>> {
        const params = new URLSearchParams();
        if (options.query)     params.set('query', options.query);
        if (options.page)      params.set('page', String(options.page));
        if (options.page_size) params.set('page_size', String(options.page_size));
        if (options.sort)      params.set('sort', options.sort);
        if (options.gear?.length)  params.set('gear', options.gear.join('_'));
        if (options.sizes?.length) params.set('sizes', options.sizes.join('-'));

        const url = `${TONE3000_BASE_URL}/tones/search?${params.toString()}`;
        return this.fetchAuthenticated<PaginatedResponse<Tone>>(url);
    }

    async getToneModels(toneId: number, page: number = 1, page_size: number = 100): Promise<PaginatedResponse<Model>> {
        const params = new URLSearchParams({
            tone_id: String(toneId),
            page: String(page),
            page_size: String(page_size),
        });
        const url = `${TONE3000_BASE_URL}/models?${params.toString()}`;
        return this.fetchAuthenticated<PaginatedResponse<Model>>(url);
    }

    async downloadModelBlob(modelUrl: string): Promise<Blob> {
        if (!this.accessToken) throw new Error('Not authenticated.');
        if (Date.now() > this.expiresAt) await this.refreshSession();

        const response = await fetch(modelUrl, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` },
        });
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        return response.blob();
    }



    // ---- Private helpers ----

    private storeSession(session: Session): void {
        this.accessToken = session.access_token;
        this.refreshToken = session.refresh_token;
        this.expiresAt = Date.now() + session.expires_in * 1000;
        localStorage.setItem(STORAGE_ACCESS_TOKEN, this.accessToken);
        localStorage.setItem(STORAGE_REFRESH_TOKEN, this.refreshToken);
        localStorage.setItem(STORAGE_EXPIRES_AT, String(this.expiresAt));
    }

    private async refreshSession(): Promise<void> {
        if (!this.refreshToken || !this.accessToken) {
            throw new Error('No session to refresh.');
        }
        const response = await fetch(`${TONE3000_BASE_URL}/auth/session/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refresh_token: this.refreshToken,
                access_token: this.accessToken,
            }),
        });
        if (!response.ok) {
            this.clearSession();
            throw new Error('Session refresh failed. Please re-authenticate.');
        }
        const session: Session = await response.json();
        this.storeSession(session);
    }

    private async fetchAuthenticated<T>(url: string): Promise<T> {
        if (!this.accessToken) {
            throw new Error('Not authenticated.');
        }

        if (Date.now() > this.expiresAt) {
            await this.refreshSession();
        }

        let response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 401) {
            await this.refreshSession();
            response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
        }

        if (!response.ok) {
            throw new Error(`Request failed: ${response.statusText}`);
        }

        return response.json() as Promise<T>;
    }
}
