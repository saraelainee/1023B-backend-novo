import express, { Request, Response, NextFunction } from "express";
import UserController from "./src/users/usersController";
import CartController from "./src/cart/cartController";
import AdminController from "./src/admin/adminController";
import authMiddleware, { authorizeRoles } from "./src/MidleWare/auth";

type AuthRequest = Request & {
    userId?: string;
    role?: string;
};

const router = express.Router();
const userController = new UserController();
const cartController = new CartController();
const adminController = new AdminController();

// Public routes
router.get("/", (req, res) => {
    res.send(`Por favor dirija-se para http://localhost:5173/ em uma rota válida`);
});

router.post("/auth/register", (req, res) => userController.createUser(req, res));
router.post("/auth/login", (req, res) => userController.login(req, res));

// Protected User routes
router.get("/cart/items", (req, res) => cartController.getCartItems(req, res));
// Add other cart routes here (add, update, remove items, etc.)

// Admin only routes
router.get("/admin/analytics", 
    authMiddleware, 
    (req: AuthRequest, res: Response, next: NextFunction) => {
        const middleware = authorizeRoles('admin');
        return middleware(req as Request, res, next);
    }, 
    (req: Request, res: Response) => adminController.getCartAnalytics(req, res)
);

// Admin user management routes
router.get("/admin/users", 
    authMiddleware,
    (req: AuthRequest, res: Response, next: NextFunction) => {
        const middleware = authorizeRoles('admin');
        return middleware(req as Request, res, next);
    },
    (req: Request, res: Response) => userController.getAllUsers(req, res)
);

router.delete("/admin/users/:id", 
    authMiddleware,
    (req: AuthRequest, res: Response, next: NextFunction) => {
        const middleware = authorizeRoles('admin');
        return middleware(req as Request, res, next);
    },
    (req: Request, res: Response) => userController.deleteUser(req, res)
);

// Health check endpoint
router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

export default router;
