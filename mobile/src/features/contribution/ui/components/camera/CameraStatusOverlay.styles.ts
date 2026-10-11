import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  reticleCenterWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 240,
    height: 240,
    position: 'relative',
    opacity: 0.65,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#ffffff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },
  auditWatermark: {
    position: 'absolute',
    bottom: 148,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    maxWidth: '75%',
  },
  watermarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBig: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  timeDivider: {
    width: 2,
    height: 24,
    backgroundColor: '#f59e0b',
    borderRadius: 1,
  },
  dateCol: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  dayText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  watermarkLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  watermarkLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  watermarkGpsText: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#5eead4',
    marginTop: 2,
  },
});
