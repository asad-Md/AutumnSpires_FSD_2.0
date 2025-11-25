export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getOTPExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}
