import { describe, it, expect } from 'vitest';
import { ROLES, ROLE_HIERARCHY, PERMISSIONS } from '../constants/roles';

describe('ROLES', () => {
  it('should contain exactly 4 roles', () => {
    expect(ROLES).toHaveLength(4);
    expect(ROLES).toEqual(['owner', 'admin', 'editor', 'viewer']);
  });
});

describe('ROLE_HIERARCHY', () => {
  it('should have owner as highest role', () => {
    expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.admin);
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.editor);
    expect(ROLE_HIERARCHY.editor).toBeGreaterThan(ROLE_HIERARCHY.viewer);
  });
});

describe('PERMISSIONS', () => {
  it('should restrict brands:create to owner and admin', () => {
    expect(PERMISSIONS['brands:create']).toEqual(['owner', 'admin']);
  });

  it('should allow all roles to view analytics', () => {
    expect(PERMISSIONS['analytics:view']).toEqual(['owner', 'admin', 'editor', 'viewer']);
  });

  it('should allow owner, admin, and editor to create content', () => {
    expect(PERMISSIONS['content:create']).toEqual(['owner', 'admin', 'editor']);
  });

  it('should restrict ads:create to owner and admin', () => {
    expect(PERMISSIONS['ads:create']).toEqual(['owner', 'admin']);
  });

  it('should have 14 permissions defined', () => {
    expect(Object.keys(PERMISSIONS)).toHaveLength(14);
  });
});
