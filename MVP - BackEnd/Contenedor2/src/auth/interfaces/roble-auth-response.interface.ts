export interface RobleLoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RobleRefreshResponse {
  accessToken: string;
}

export interface RobleVerifyTokenResponse {
  valid: boolean;
  userId?: string;
}

export interface RobleGenericSuccess {
  success?: boolean;
  message?: string;
}
