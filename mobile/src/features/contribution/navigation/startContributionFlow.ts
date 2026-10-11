import { Href } from 'expo-router';
import type { ContributionLocation } from '@/entities/contribution';

interface ContributionRouter {
  push: (href: Href) => void;
}

export function startContributionFlow(router: ContributionRouter, location: ContributionLocation) {
  router.push({
    pathname: '/contribute/camera',
    params: {
      locationId: location.id,
      locationName: location.name,
      ...(location.latitude != null ? { latitude: String(location.latitude) } : {}),
      ...(location.longitude != null ? { longitude: String(location.longitude) } : {}),
    },
  } as Href);
}
