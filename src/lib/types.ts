export type AccountType = 'cash' | 'tax';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  available_accounts?: AccountType[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface MeResponse {
  user: User;
}
