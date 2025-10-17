// Quick test of sweph package
const sweph = require('sweph');

console.log('Testing sweph package...');

// Test julday
const jd = sweph.julday(2025, 8, 13, 0.0, 1);
console.log('Julian Day:', jd);

// Test calc_ut for sun
console.log('Testing sun calculation...');
try {
  const sunResult = sweph.calc_ut(jd, 0, 2); // SE_SUN=0, SEFLG_SWIEPH=2
  console.log('Sun result:', sunResult);
  console.log('Sun result type:', typeof sunResult);
  console.log('Sun result keys:', Object.keys(sunResult));
} catch (error) {
  console.error('Sun calculation error:', error);
}

// Test calc_ut for moon
console.log('\nTesting moon calculation...');
try {
  const moonResult = sweph.calc_ut(jd, 1, 2); // SE_MOON=1, SEFLG_SWIEPH=2
  console.log('Moon result:', moonResult);
  console.log('Moon result type:', typeof moonResult);
  console.log('Moon result keys:', Object.keys(moonResult));
} catch (error) {
  console.error('Moon calculation error:', error);
}
