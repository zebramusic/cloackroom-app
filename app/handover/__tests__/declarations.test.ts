import { describe, it, expect } from 'vitest';
import { buildDeclarationRO, buildDeclarationEN } from '../declarations';

describe('declarations', () => {
  it('RO declaration includes coat number, name and placeholder when notes empty', () => {
    const out = buildDeclarationRO({ coatNumber: '123', fullName: 'Jane Doe' });
    expect(out).toContain('123');
    expect(out).toContain('Jane Doe');
    expect(out).toContain('[Marca, modelul, seria, culoarea, starea etc.]');
  });

  it('EN declaration uses provided notes', () => {
    const out = buildDeclarationEN({ coatNumber: '7', fullName: 'John Smith', notes: 'Red jacket size M' });
    expect(out).toContain('Red jacket size M');
    expect(out).not.toContain('[Brand, model, serial, color, condition, etc.]');
  });
});
