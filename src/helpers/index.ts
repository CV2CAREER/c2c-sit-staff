export const setCookie = (name: string, value: string, hours: number = 2) => {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString();
  let cookieString = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;

  // For production cross-domain, you might need:
  // cookieString += "; Secure";
  // cookieString += "; Domain=.cvtocareer.com";   // adjust if needed

  document.cookie = cookieString;
};