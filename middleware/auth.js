const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Pegar token do header
  const token = req.header('x-auth-token');

  // Verificar se existe token
  if (!token) {
    return res.status(401).json({ msg: 'Sem token, autorização negada' });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido' });
  }
};