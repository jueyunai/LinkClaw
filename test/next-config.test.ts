import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('next.config Server Actions 配置', () => {
  it('允许本地开发环境通过带端口的 Host 发起 Server Action', () => {
    expect(nextConfig).toMatchObject({
      experimental: {
        serverActions: {
          allowedOrigins: expect.arrayContaining([
            'localhost:3000',
            '127.0.0.1:3000',
          ]),
        },
      },
    });
  });
});
