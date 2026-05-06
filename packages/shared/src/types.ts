export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface Room {
  id: number;
  slug: string;
  name: string;
  hostId: number;
  createdAt: string;
}

export interface ApiError {
  error: string;
}
