/**
 * Utilitar pentru gestionarea automată a refresh token-urilor în frontend
 */

class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.loadTokensFromStorage();
  }

  /**
   * Încarcă tokens din localStorage
   */
  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  /**
   * Salvează tokens în localStorage
   */
  private saveTokensToStorage(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Șterge tokens din localStorage
   */
  public clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token'); // token vechi pentru compatibilitate
    localStorage.removeItem('user'); // dacă există
    this.accessToken = null;
    this.refreshToken = null;
    console.log('[TokenManager] Tokens cleared');
  }

  /**
   * Returnează access token-ul curent
   */
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Setează tokens noi
   */
  public setTokens(accessToken: string, refreshToken: string): void {
    console.log('[TokenManager] Setting new tokens:', { 
      accessToken: accessToken.substring(0, 20) + '...', 
      refreshToken: refreshToken.substring(0, 20) + '...'
    });
    this.saveTokensToStorage(accessToken, refreshToken);
  }

  /**
   * Verifică dacă utilizatorul este autentificat
   */
  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Refresh access token folosind refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    console.log(`[TokenManager] Attempting to refresh access token...`);
    
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/refresh`;
    console.log(`[TokenManager] Refresh URL:`, url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken
      }),
    });

    console.log(`[TokenManager] Refresh response status:`, response.status);

    if (!response.ok) {
      // Refresh token invalid/expirat
      console.log(`[TokenManager] Refresh failed, clearing tokens`);
      this.clearTokens();
      throw new Error('Refresh token expired');
    }

    const data = await response.json();
    console.log(`[TokenManager] Refresh successful, saving new tokens`);
    this.saveTokensToStorage(data.accessToken, data.refreshToken);
    
    return data.accessToken;
  }

  /**
   * Obține un access token valid (refresh automat dacă este necesar)
   */
  public async getValidAccessToken(): Promise<string | null> {
    console.log(`[TokenManager] Getting valid access token...`);
    console.log(`[TokenManager] Current accessToken:`, this.accessToken ? 'exists' : 'null');
    console.log(`[TokenManager] Current refreshToken:`, this.refreshToken ? 'exists' : 'null');
    
    if (!this.accessToken) {
      console.log(`[TokenManager] No access token available`);
      return null;
    }

    // Dacă se încearcă deja un refresh, așteaptă
    if (this.isRefreshing && this.refreshPromise) {
      console.log(`[TokenManager] Refresh in progress, waiting...`);
      try {
        return await this.refreshPromise;
      } catch {
        return null;
      }
    }

    // Verifică dacă token-ul este încă valid
    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp > now) {
        console.log(`[TokenManager] Access token is still valid`);
        return this.accessToken;
      } else {
        console.log(`[TokenManager] Access token expired, attempting refresh...`);
        return await this.handleTokenRefresh();
      }
    } catch (error) {
      console.log(`[TokenManager] Error checking token validity:`, error);
      return await this.handleTokenRefresh();
    }
  }

  /**
   * Încearcă refresh token-ul dacă request-ul primește 401
   */
  public async handleTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      // Dacă se încearcă deja un refresh, așteaptă
      if (this.refreshPromise) {
        try {
          return await this.refreshPromise;
        } catch {
          return null;
        }
      }
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshAccessToken();

    try {
      const newToken = await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return newToken;
    } catch {
      this.isRefreshing = false;
      this.refreshPromise = null;
      this.clearTokens();
      
      // Redirecționează la login
      window.location.href = '/login';
      return null;
    }
  }

  /**
   * Logout - șterge tokens și notifică server-ul
   */
  public async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.warn('Error during logout:', error);
    } finally {
      this.clearTokens();
      window.location.href = '/login';
    }
  }
}

// Instanță singleton
export const tokenManager = new TokenManager();

/**
 * Interceptor pentru fetch care gestionează automat refresh token-urile
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await tokenManager.getValidAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  // Construiește URL-ul complet
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const fullURL = url.startsWith('http') ? url : `${baseURL}${url}`;

  console.log(`[TokenManager] Making request to: ${fullURL}`);
  console.log(`[TokenManager] Base URL: ${baseURL}`);
  console.log(`[TokenManager] Original URL: ${url}`);
  console.log(`[TokenManager] Method: ${options.method || 'GET'}`);
  console.log(`[TokenManager] Has body: ${!!options.body}`);
  if (options.body && typeof options.body === 'string') {
    console.log(`[TokenManager] Body size: ${options.body.length} characters`);
  }

  // Adaugă token-ul la headers
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(fullURL, {
    ...options,
    headers,
  });

  console.log(`[TokenManager] Response status: ${response.status}`);

  // Dacă primește 401, încearcă refresh
  if (response.status === 401) {
    console.log(`[TokenManager] Got 401, trying to refresh token...`);
    const newToken = await tokenManager.handleTokenRefresh();
    
    if (newToken) {
      console.log(`[TokenManager] Token refreshed, retrying request...`);
      // Reîncearcă request-ul cu noul token
      const retryHeaders = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`,
      };

      return fetch(fullURL, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  return response;
}

/**
 * Hook pentru React (opțional)
 */
export function useTokenManager() {
  return {
    isAuthenticated: tokenManager.isAuthenticated(),
    getAccessToken: () => tokenManager.getAccessToken(),
    logout: () => tokenManager.logout(),
    clearTokens: () => tokenManager.clearTokens(),
  };
}
