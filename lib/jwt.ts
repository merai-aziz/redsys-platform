import { SignJWT, jwtVerify } from 'jose'

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

// Access Token — expire en 1h
export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(accessSecret)
}

// Refresh Token — expire en 7 jours
export async function signRefreshToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret)
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}