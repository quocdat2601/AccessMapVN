import { DiscoveryScreen } from '@/features/discovery';
import { startContributionFlow } from '@/features/contribution';
import { useRouter } from 'expo-router';

export default function MapRoute() {
  const router = useRouter();

  return (
    <DiscoveryScreen
      onNavigateToContribute={(place) => {
        startContributionFlow(router, { id: place.id, name: place.name });
      }}
    />
  );
}
