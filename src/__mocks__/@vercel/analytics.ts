/**
 * Mock for @vercel/analytics
 */
export const track = jest.fn();
export const pageview = jest.fn();
export const inject = jest.fn();
export default { track, pageview, inject };
