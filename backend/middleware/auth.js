module.exports = function (req, res, next) {
  req.user = { id: '000000000000000000000001', username: 'admin', role: 'admin' };
  next();
};
