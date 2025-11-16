// server/middleware/roles.js
export function requireRole(roleOrArr) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const allowed = Array.isArray(roleOrArr) ? roleOrArr : [roleOrArr];
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
