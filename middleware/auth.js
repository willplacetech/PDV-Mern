module.exports = function (req, res, next) {
  req.user = { username: 'operador' };
  next();
};