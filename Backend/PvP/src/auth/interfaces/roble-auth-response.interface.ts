export interface RobleLoginResponse {
  accessToken: string;
  refreshToken: string;
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    name?: string;
    role?: string;
    [key: string]: unknown;
  };
}

export interface RobleRefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface RobleVerifyTokenResponse {
  valid: boolean;
  userId?: string;
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    name?: string;
    role?: string;
    [key: string]: unknown;
  };
  sub?: string;
  email?: string;
  role?: string;
}

export interface RobleGenericSuccess {
  success?: boolean;
  message?: string;
}
