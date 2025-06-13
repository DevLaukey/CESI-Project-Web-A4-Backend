const jwt = require('jsonwebtoken');

const SERVICE_SECRET = process.env.SERVICE_SECRET || 'your_service_secret_here';

function serviceAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'No authorization header provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, SERVICE_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        // Optionally, check for service-specific claims
        req.service = decoded;
        next();
    });
}

module.exports = serviceAuth;