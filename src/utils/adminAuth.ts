const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Matematica123*';
const STORAGE_KEY = 'admin_auth_token';

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function authenticateAdmin(email: string, password: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }

  return false;
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

export function getAdminEmail(): string {
  return ADMIN_EMAIL;
}

