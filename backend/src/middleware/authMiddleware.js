import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "echohire_super_secret_jwt_key_2026";

/**
 * Middleware to authenticate requests using JWT
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Access token missing or invalid format.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const targetUserId = decoded.id || decoded.userId;
    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid token payload.",
      });
    }

    const user = await User.findOne({
      $or: [{ id: targetUserId }, { _id: targetUserId }],
    }).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User account not found or deactivated.",
      });
    }

    req.user = {
      id: user._id.toString(),
      customId: user.id || user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Token verification failed.",
      error: error.message,
    });
  }
}

/**
 * Middleware to enforce role-based access control (RBAC)
 * @param  {...string} roles Allowed roles ('user', 'recruiter')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(", ")}] roles.`,
      });
    }

    next();
  };
}
