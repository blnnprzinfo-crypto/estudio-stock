import type { ID } from '../types/index.js';

export function generateId(): ID {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
