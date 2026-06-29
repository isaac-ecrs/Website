interface SiteData {
  name: string;
  address?: string;
  phone?: string;
  accessibilityNote?: string;
  image?: string;
}

export interface ResolvedVenue {
  location: string;
  address?: string;
  phone?: string;
  accessibilityNote?: string;
  image?: string;
}

export function resolveVenue(
  event: {
    location?: string;
    address?: string;
    phone?: string;
    accessibilityNote?: string;
    image?: string;
  },
  site?: SiteData
): ResolvedVenue {
  return {
    location: event.location ?? site?.name ?? '',
    address: event.address ?? site?.address,
    phone: event.phone ?? site?.phone,
    accessibilityNote: event.accessibilityNote ?? site?.accessibilityNote,
    image: event.image ?? site?.image,
  };
}
