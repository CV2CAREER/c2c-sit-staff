const AVATAR_PALETTE: [string, string][] = [
  ["#D3FFFF", "#00688F"],
  ["#F0FFF1", "#12873B"],
  ["#FFFAF5", "#B26A22"],
  ["#F1F5F9", "#4A5B6B"],
  ["#EDF3FF", "#2A4E9B"],
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = (parts[0]?.[0] || "?").toUpperCase();
  const second = (parts[1]?.[0] || "").toUpperCase();
  return first + second;
}

export function avatarColors(name: string): [string, string] {
  const idx = (name.charCodeAt(0) + name.length) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}
