import { Request, Response } from "express";
import { db } from "../database/banco-mongo.js"; // Conexão do professor
import { ObjectId } from "mongodb";

class AdminController {

    // Sua função 'getCartAnalytics'
    async getCartAnalytics(req: Request, res: Response) {
        try {
            const activeUsers = await db.collection('carrinhos').distinct('userId');
            const activeUsersCount = activeUsers.length;

            const cartValues = await db.collection('carrinhos').aggregate([
                { $unwind: '$items' },
                { 
                    $group: {
                        _id: '$_id',
                        total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    } 
                },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: '$total' },
                        avgCartValue: { $avg: '$total' },
                        cartCount: { $sum: 1 }
                    }
                }
            ]).toArray();

            const popularItems = await db.collection('carrinhos').aggregate([
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        name: { $first: '$items.name' },
                        category: { $first: '$items.category' },
                        totalQuantity: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }
            ]).toArray();

            const userActivity = await db.collection('carrinhos').aggregate([
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$userId',
                        cartCount: { $sum: 1 },
                        lastActive: { $max: '$updatedAt' },
                        totalSpent: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                {
                    $lookup: {
                        from: 'usuarios', // Coleção de usuários do professor
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        _id: 1,
                        userName: '$user.nome',
                        userEmail: '$user.email',
                        cartCount: 1,
                        lastActive: 1,
                        totalSpent: 1
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 10 }
            ]).toArray();

            return res.status(200).json({
                success: true,
                data: {
                    activeUsers: {
                        count: activeUsersCount,
                        users: activeUsers.map(id => id.toString())
                    },
                    cartStatistics: cartValues[0] || { totalValue: 0, avgCartValue: 0, cartCount: 0 },
                    popularItems,
                    topUsers: userActivity
                }
            });

        } catch (error) {
            console.error('Error fetching cart analytics:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
        }
    }
}

export default new AdminController();