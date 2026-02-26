export interface RobleInsertResponse<T> {
  inserted: T[];
  skipped: {
    index: number;
    reason: string;
  }[];
}

export interface RobleUserPayload {
  sub: string;
  email: string;
  role?: string;
  dbName?: string;
}

export interface RobleVerifyTokenResponse {
  valid: boolean;
  user: RobleUserPayload;
}

export interface RobleLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RobleRefreshResponse {
  accessToken: string;
}
