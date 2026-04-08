export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface MeResponse {
  user: User;
}
