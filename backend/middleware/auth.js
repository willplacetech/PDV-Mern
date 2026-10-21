module.exports = function (req, res, next) {
  req.user = { id: 'mock-admin', username: 'admin', role: 'admin' };
  next();
};
