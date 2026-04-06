export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CLIENT'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  adresse?: string
}