export function isAdmin(email: string | undefined): boolean {
  if (!email) {
    return false;
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

  return adminEmails.includes(email);
}
