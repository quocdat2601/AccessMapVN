import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DiscoveryScreen } from '@/features/discovery';
import { startContributionFlow } from '@/features/contribution';
import { CommunityScreen } from '@/features/community';
import { ProfileScreen } from '@/features/auth';
import { BottomNavBar, type BottomNavTab } from './BottomNavBar';

export type MainNavTab = 'map' | 'community' | 'profile';

const TAB_INDEX: Record<MainNavTab, number> = {
  map: 0,
  community: 2,
  profile: 3,
};

interface MainTabContainerProps {
  initialTab?: MainNavTab;
}

export function MainTabContainer({ initialTab = 'map' }: MainTabContainerProps) {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  const [activeTab, setActiveTab] = useState<MainNavTab>(initialTab);
  const [prevTab, setPrevTab] = useState<MainNavTab | null>(null);
  const [isPlaceSelected, setIsPlaceSelected] = useState(false);

  // Animation driver:
  // When forward (next > prev): starts at 1, goes to 0
  // When backward (next < prev): starts at -1, goes to 0
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  const handleTabPress = useCallback(
    (tab: BottomNavTab) => {
      if (tab === 'contribute') {
        startContributionFlow(router, {
          id: 's9.01',
          name: 'Tòa S9.01 - The Origami',
          latitude: 10.8454,
          longitude: 106.8373,
        });
        return;
      }

      const targetTab = tab as MainNavTab;
      if (targetTab === activeTab || isAnimatingRef.current) return;

      const prevIndex = TAB_INDEX[activeTab];
      const nextIndex = TAB_INDEX[targetTab];
      const isForward = nextIndex > prevIndex;

      isAnimatingRef.current = true;
      setPrevTab(activeTab);
      setActiveTab(targetTab);

      slideAnim.setValue(isForward ? 1 : -1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setPrevTab(null);
        isAnimatingRef.current = false;
      });
    },
    [activeTab, router, slideAnim]
  );

  const handleContributePress = useCallback(() => {
    startContributionFlow(router, {
      id: 's9.01',
      name: 'Tòa S9.01 - The Origami',
      latitude: 10.8454,
      longitude: 106.8373,
    });
  }, [router]);

  // Compute translateX interpolations:
  // For incoming screen:
  const incomingTranslateX = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-screenWidth, 0, screenWidth],
  });

  // For outgoing screen:
  const outgoingTranslateX = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, screenWidth, -screenWidth],
  });

  const getScreenTransform = (tab: MainNavTab) => {
    if (activeTab === tab && prevTab === null) {
      return [{ translateX: 0 }];
    }
    if (activeTab === tab && prevTab !== null) {
      return [{ translateX: incomingTranslateX }];
    }
    if (prevTab === tab) {
      return [{ translateX: outgoingTranslateX }];
    }
    return [{ translateX: screenWidth * 2 }];
  };

  return (
    <View style={styles.rootContainer}>
      {/* Main content viewport: fixed boundary, only contents slide */}
      <View style={styles.mainViewport}>
        {/* 1. Map Tab (kept continuously mounted to preserve MapLibre context & tiles) */}
        <Animated.View
          style={[
            styles.screenSlide,
            { transform: getScreenTransform('map') },
            activeTab !== 'map' && prevTab !== 'map' && styles.screenHidden,
          ]}
          pointerEvents={activeTab === 'map' && !prevTab ? 'auto' : 'none'}
        >
          <DiscoveryScreen
            hideBottomNav={true}
            onActivePlaceChange={setIsPlaceSelected}
            onNavigateToContribute={(place) => {
              startContributionFlow(router, {
                id: place.id,
                name: place.name,
                latitude: place.latitude,
                longitude: place.longitude,
              });
            }}
          />
        </Animated.View>

        {/* 2. Community Tab */}
        {(activeTab === 'community' || prevTab === 'community') && (
          <Animated.View
            style={[styles.screenSlide, styles.screenElevated, { transform: getScreenTransform('community') }]}
            pointerEvents={activeTab === 'community' && !prevTab ? 'auto' : 'none'}
          >
            <CommunityScreen hideBottomNav={true} />
          </Animated.View>
        )}

        {/* 3. Profile Tab */}
        {(activeTab === 'profile' || prevTab === 'profile') && (
          <Animated.View
            style={[styles.screenSlide, styles.screenElevated, { transform: getScreenTransform('profile') }]}
            pointerEvents={activeTab === 'profile' && !prevTab ? 'auto' : 'none'}
          >
            <ProfileScreen hideBottomNav={true} />
          </Animated.View>
        )}
      </View>

      {/* Rock-solid, fixed Bottom Navigation Bar: NEVER shifts or animates during tab swipes */}
      {!isPlaceSelected && (
        <BottomNavBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          onContributePress={handleContributePress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  screenSlide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  screenElevated: {
    zIndex: 5,
  },
  screenHidden: {
    opacity: 0,
    zIndex: -10,
  },
});
