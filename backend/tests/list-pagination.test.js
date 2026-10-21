const test = require('node:test');
const assert = require('node:assert/strict');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const customersRouter = require('../routes/customers');
const productsRouter = require('../routes/products');
const ordersRouter = require('../routes/orders');

const getHandler = (router) => (
  router.stack.find((layer) => layer.route?.path === '/' && layer.route.methods.get)
    .route.stack.at(-1).handle
);

const getMutationHandler = (router, method, path = '/') => (
  router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method])
    .route.stack.at(-1).handle
);

const createQuery = (items) => {
  let skip = 0;
  let limit = items.length;
  const query = {
    sort() { return this; },
    skip(value) { skip = value; return this; },
    limit(value) { limit = value; return this; },
    then(resolve, reject) {
      return Promise.resolve(items.slice(skip, skip + limit)).then(resolve, reject);
    },
  };
  return query;
};

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  },
});

test('customer route returns a paginated envelope when pagination is requested', async (t) => {
  const originalFind = Customer.find;
  const originalCountDocuments = Customer.countDocuments;
  t.after(() => {
    Customer.find = originalFind;
    Customer.countDocuments = originalCountDocuments;
  });
  Customer.find = () => createQuery([
    { _id: 'customer-1' },
    { _id: 'customer-2' },
    { _id: 'customer-3' },
    { _id: 'customer-4' },
  ]);
  Customer.countDocuments = async () => 4;

  const response = createResponse();
  await getHandler(customersRouter)({ query: { page: '2', pageSize: '2' } }, response);

  assert.deepEqual(response.body, {
    items: [{ _id: 'customer-3' }, { _id: 'customer-4' }],
    page: 2,
    pageSize: 2,
    total: 4,
  });
});

test('customer route keeps the legacy array contract when pagination is omitted', async (t) => {
  const originalFind = Customer.find;
  t.after(() => { Customer.find = originalFind; });
  const customers = [{ _id: 'customer-1' }];
  Customer.find = () => createQuery(customers);

  const response = createResponse();
  await getHandler(customersRouter)({ query: {} }, response);

  assert.deepEqual(response.body, customers);
});

test('customer creation checks duplicate documents without a scope error', async (t) => {
  const originalExists = Customer.exists;
  const originalSave = Customer.prototype.save;
  t.after(() => {
    Customer.exists = originalExists;
    Customer.prototype.save = originalSave;
  });
  let duplicateQuery;
  Customer.exists = async (query) => {
    duplicateQuery = query;
    return null;
  };
  Customer.prototype.save = async function save() {
    assert.equal(this.validateSync(), undefined);
    return this;
  };

  const response = createResponse();
  const request = {
    body: {
      nome: 'Cliente de teste',
      documento: '52998224725',
    },
  };
  auth(request, {}, () => {});
  await getMutationHandler(customersRouter, 'post')(request, response);

  assert.equal(response.statusCode, 201);
  assert.equal(request.user.id, '000000000000000000000001');
  assert.deepEqual(duplicateQuery, {
    $or: [
      { documento: '52998224725' },
      { cpf: '52998224725' },
    ],
  });
});

test('customer updates exclude the current customer from duplicate checks', async (t) => {
  const originalExists = Customer.exists;
  const originalFindByIdAndUpdate = Customer.findByIdAndUpdate;
  t.after(() => {
    Customer.exists = originalExists;
    Customer.findByIdAndUpdate = originalFindByIdAndUpdate;
  });
  let duplicateQuery;
  Customer.exists = async (query) => {
    duplicateQuery = query;
    return null;
  };
  Customer.findByIdAndUpdate = async () => ({ _id: 'customer-1' });

  const response = createResponse();
  await getMutationHandler(customersRouter, 'put', '/:id')({
    body: { documento: '52998224725' },
    params: { id: 'customer-1' },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(duplicateQuery, {
    $or: [
      { documento: '52998224725' },
      { cpf: '52998224725' },
    ],
    _id: { $ne: 'customer-1' },
  });
});

test('product route keeps the legacy array contract when pagination is omitted', async (t) => {
  const originalFind = Product.find;
  t.after(() => { Product.find = originalFind; });
  const products = [{ _id: 'product-1' }];
  Product.find = () => createQuery(products);

  const response = createResponse();
  await getHandler(productsRouter)({ query: {} }, response);

  assert.deepEqual(response.body, products);
});

test('orders route keeps the legacy array contract when pagination is omitted', async (t) => {
  const originalFind = Order.find;
  t.after(() => { Order.find = originalFind; });
  const orders = [{ _id: 'order-1' }];
  Order.find = () => createQuery(orders);

  const response = createResponse();
  await getHandler(ordersRouter)({ query: {} }, response);

  assert.deepEqual(response.body, orders);
});

test('product pagination returns next-code metadata only when requested', async (t) => {
  const originalFind = Product.find;
  const originalCountDocuments = Product.countDocuments;
  const originalAggregate = Product.aggregate;
  t.after(() => {
    Product.find = originalFind;
    Product.countDocuments = originalCountDocuments;
    Product.aggregate = originalAggregate;
  });
  Product.find = () => createQuery([{ _id: 'product-1' }]);
  Product.countDocuments = async () => 1;
  Product.aggregate = async () => [{ _id: null, maximum: 9 }];

  const response = createResponse();
  await getHandler(productsRouter)({
    query: { page: '1', pageSize: '20', includeMetadata: '1' },
  }, response);

  assert.equal(response.body.total, 1);
  assert.equal(response.body.metadata.nextCode, '10');
});

test('orders pagination returns full-filter summaries with only the requested page', async (t) => {
  const originalFind = Order.find;
  const originalCountDocuments = Order.countDocuments;
  const originalAggregate = Order.aggregate;
  t.after(() => {
    Order.find = originalFind;
    Order.countDocuments = originalCountDocuments;
    Order.aggregate = originalAggregate;
  });
  Order.find = () => createQuery(Array.from({ length: 21 }, (_, index) => ({
    _id: `order-${index + 1}`,
  })));
  Order.countDocuments = async () => 21;
  let aggregateCall = 0;
  Order.aggregate = async () => {
    aggregateCall += 1;
    return aggregateCall === 1
      ? [{ totalVendido: 300, totalPagoGeral: 100, totalEmAberto: 200 }]
      : [{ _id: 'Mercearia', valor: 300 }];
  };

  const response = createResponse();
  await getHandler(ordersRouter)({
    query: { status: 'pendente', page: '2', pageSize: '20' },
  }, response);

  assert.deepEqual(response.body, {
    items: [{ _id: 'order-21' }],
    page: 2,
    pageSize: 20,
    total: 21,
    summary: {
      totalVendido: 300,
      totalPagoGeral: 100,
      totalEmAberto: 200,
      porCategoria: [{ nome: 'Mercearia', valor: 300 }],
    },
  });
});
