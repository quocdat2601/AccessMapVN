import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modeSwitch: {
    width: 154,
    height: 32,
    borderRadius: 16,
    padding: 3,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  modeOption: {
    flex: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  modeText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeTextActive: {
    color: '#ffffff',
  },
  hint: {
    marginTop: 8,
    marginBottom: 12,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sideSpacer: {
    width: 48,
  },
  captureOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#ffffff',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureOuterVideo: {
    borderColor: '#ffffff',
  },
  captureInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
  captureInnerVideo: {
    backgroundColor: '#ef4444',
  },
  stopInner: {
    width: 24,
    height: 24,
    borderRadius: 5,
  },
  sideAction: {
    width: 48,
    alignItems: 'center',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
