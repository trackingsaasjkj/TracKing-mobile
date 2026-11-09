import { joinApiPath, normalizeBaseUrl } from '@/core/api/config';

describe('normalizeBaseUrl', () => {
  it('removes one trailing slash', () => {
    expect(normalizeBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  });

  it('removes multiple trailing slashes', () => {
    expect(normalizeBaseUrl('http://192.168.1.7:3000///')).toBe('http://192.168.1.7:3000');
  });

  it('keeps URLs without a trailing slash unchanged', () => {
    expect(normalizeBaseUrl('https://api.example.com')).toBe('https://api.example.com');
  });
});

describe('joinApiPath', () => {
  it('joins a base with trailing slash and a path without double slash', () => {
    expect(joinApiPath('https://api.example.com/', '/api/courier/location')).toBe(
      'https://api.example.com/api/courier/location',
    );
  });

  it('joins a base without trailing slash and a path without leading slash', () => {
    expect(joinApiPath('https://api.example.com', 'api/courier/location')).toBe(
      'https://api.example.com/api/courier/location',
    );
  });

  it('never produces a double slash at the join point', () => {
    const url = joinApiPath('https://44lhvcz2-3000.use2.devtunnels.ms///', '//api/auth/refresh');
    expect(url).toBe('https://44lhvcz2-3000.use2.devtunnels.ms/api/auth/refresh');
    expect(url).not.toContain('//api');
  });
});
