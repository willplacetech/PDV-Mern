const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPage, getEffectivePage, parsePagination } = require('../services/pagination');

test('pagination remains opt-in for legacy list consumers', () => {
  assert.equal(parsePagination({}), null);
});

test('pagination uses the default page and caps page size', () => {
  assert.deepEqual(parsePagination({ page: '2', pageSize: '500' }), {
    page: 2,
    pageSize: 100,
    skip: 100,
  });
  assert.deepEqual(parsePagination({ pageSize: '10' }), {
    page: 1,
    pageSize: 10,
    skip: 0,
  });
});

test('pagination rejects invalid and unsafe values', () => {
  for (const query of [
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { pageSize: 'abc' },
    { page: '9007199254740991', pageSize: '100' },
  ]) {
    assert.match(parsePagination(query).error, /inteiro positivo|intervalo permitido/);
  }
});

test('effective pages and response metadata are consistent with total items', () => {
  const page = getEffectivePage(4, 20, 41);
  assert.equal(page, 3);
  assert.deepEqual(buildPage(['item'], page, 20, 41, { summary: { total: 41 } }), {
    items: ['item'],
    page: 3,
    pageSize: 20,
    total: 41,
    summary: { total: 41 },
  });
});
