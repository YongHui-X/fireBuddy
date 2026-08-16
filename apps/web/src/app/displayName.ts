interface DisplayNameUser {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

/** Normalize a profile name or email prefix into consistent title case for display. */
export function getDisplayName(user?: DisplayNameUser | null, fallback = 'Demo user') {
  const metadataName = user?.user_metadata?.name ?? user?.user_metadata?.full_name;
  const source = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName
    : user?.email?.split('@')[0];

  if (!source?.trim()) {
    return fallback;
  }

  return source
    .trim()
    .split(/[._\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toLocaleUpperCase('en-SG')}${part.slice(1).toLocaleLowerCase('en-SG')}`)
    .join(' ');
}
