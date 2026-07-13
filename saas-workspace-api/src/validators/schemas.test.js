'use strict';

const { paginationSchema } = require('./schemas');

describe('paginationSchema', () => {
  it('should default page to 1 and limit to 20 when omitted', () => {
    const { value, error } = paginationSchema.validate({});

    expect(error).toBeUndefined();
    expect(value).toEqual({ page: 1, limit: 20 });
  });

  it('should cap limit at 100 even if a higher value is requested', () => {
    const { error } = paginationSchema.validate({ limit: 500 });

    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/must be less than or equal to 100/);
  });

  it('should reject a limit below 1', () => {
    const { error } = paginationSchema.validate({ limit: 0 });

    expect(error).toBeDefined();
  });

  it('should accept a valid page and limit within bounds', () => {
    const { value, error } = paginationSchema.validate({ page: 3, limit: 50 });

    expect(error).toBeUndefined();
    expect(value).toEqual({ page: 3, limit: 50 });
  });
});
