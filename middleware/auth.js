import jwt from 'jsonwebtoken'

export const authenticateToken = (req, res, next) => {
  // Get the access token from cookies
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Attach user info to request object
    req.user = user;
    next();
  });
};
