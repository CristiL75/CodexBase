// Script to clear all localStorage tokens
// Run this in the browser console

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('token');
localStorage.removeItem('user');

console.log('All tokens and user data cleared from localStorage');
console.log('Current localStorage keys:', Object.keys(localStorage));
