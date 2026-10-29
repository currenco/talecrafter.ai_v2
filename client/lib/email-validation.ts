export function emailValidationMessage(value: string): string {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || /\s/.test(email) || parts[0].startsWith(".") || parts[0].endsWith(".") || parts[0].includes("..")) {
    return "Enter a valid email address, such as name@example.com.";
  }
  const domain = parts[1].toLowerCase();
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
    return "Enter a valid email address, such as name@example.com.";
  }
  const repeatedProvider = /^(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|aol)\.com(?:\.com)+$/.exec(domain);
  if (repeatedProvider) return `Check your email address: did you mean ${repeatedProvider[1]}.com instead of ${domain}?`;
  return "";
}
