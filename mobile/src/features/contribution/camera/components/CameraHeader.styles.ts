import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    height: 44,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  locationPill: {
    flex: 1,
    marginHorizontal: 10,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    maxWidth: '85%',
  },
});
