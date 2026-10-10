import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    height: 44,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  locationPill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  gpsBadge: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  gpsText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '600',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4ade80',
  },
  dotWarning: {
    backgroundColor: '#fbbf24',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flashActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.6)',
  },
  spacer: {
    width: 38,
  },
});
