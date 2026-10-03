import { Href } from 'expo-router';
import { ContributionLocation } from '../camera/types';

interface ContributionRouter {
  push: (href: Href) => void;
}

export function startContributionFlow(router: ContributionRouter, location: ContributionLocation) {
  router.push({
    pathname: '/contribute/camera',
    params: {
      locationId: location.id,
      locationName: location.name,
    },
  } as Href);
}
