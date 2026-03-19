import { describe, expect, it } from 'vitest';
import enMessages from '@/../messages/en.json';
import zhMessages from '@/../messages/zh.json';

function collectKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    collectKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

function collectIcuParams(value: unknown, map = new Map<string, string[]>(), prefix = '') {
  if (typeof value === 'string') {
    const matches = [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
    map.set(prefix, matches);
    return map;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return map;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    collectIcuParams(nested, map, prefix ? `${prefix}.${key}` : key);
  }

  return map;
}

describe('messages JSON', () => {
  it('英文文案文件可被解析并包含 auth 命名空间', () => {
    expect(enMessages).toHaveProperty('auth');
  });

  it('中文文案文件可被解析并包含 auth 命名空间', () => {
    expect(zhMessages).toHaveProperty('auth');
  });

  it('中英文文案拥有一致的 key 集', () => {
    expect(collectKeys(enMessages).sort()).toEqual(collectKeys(zhMessages).sort());
  });

  it('包含悬赏大厅新增命名空间', () => {
    for (const namespace of ['bounty', 'hunter', 'sprite', 'errors', 'admin']) {
      expect(enMessages).toHaveProperty(namespace);
      expect(zhMessages).toHaveProperty(namespace);
    }
  });

  it('中英文 ICU 参数占位符保持一致', () => {
    const enParams = collectIcuParams(enMessages);
    const zhParams = collectIcuParams(zhMessages);

    expect([...enParams.keys()].sort()).toEqual([...zhParams.keys()].sort());

    for (const [key, params] of enParams.entries()) {
      expect(zhParams.get(key)).toEqual(params);
    }
  });
});
