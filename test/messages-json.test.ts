import { describe, expect, it } from 'vitest';
import enMessages from '@/../messages/en.json';
import zhMessages from '@/../messages/zh.json';

describe('messages JSON', () => {
  it('英文文案文件可被解析并包含 auth 命名空间', () => {
    expect(enMessages).toHaveProperty('auth');
  });

  it('中文文案文件可被解析并包含 auth 命名空间', () => {
    expect(zhMessages).toHaveProperty('auth');
  });
});
