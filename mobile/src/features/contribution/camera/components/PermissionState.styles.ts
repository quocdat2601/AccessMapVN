import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c1314' },
  content: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(142,233,220,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  message: { color: '#b8c5c5', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  button: {
    minHeight: 44,
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#8ee9dc',
  },
  buttonText: { color: '#00373f', fontSize: 13.5, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
