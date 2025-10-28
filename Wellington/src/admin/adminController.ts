import { Request, Response } from "express";
import db from "../DB/db.connection";
import { ObjectId } from "mongodb";

export default class AdminController {
    private db = db;
    private users = this.db.collection('users');
    private carts = this.db.collection('carts');
    private products = this.db.collection('products');

    async getCartAnalytics(req: Request, res: Response) {
        try {
            const activeUsers = await this.carts.distinct('userId');
            const activeUsersCount = activeUsers.length;

            const cartValues = await this.carts.aggregate([
                { $unwind: '$items' },
                { 
                    $group: {
                        _id: '$_id',
                        total: { 
                            $sum: { 
                                $multiply: ['$items.price', '$items.quantity'] 
                            } 
                        }
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

            const popularItems = await this.carts.aggregate([
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        name: { $first: '$items.name' },
                        category: { $first: '$items.category' },
                        totalQuantity: { $sum: '$items.quantity' },
                        inCarts: { $sum: 1 },
                        totalRevenue: { 
                            $sum: { 
                                $multiply: ['$items.price', '$items.quantity'] 
                            } 
                        }
                    }
                },
                { $sort: { inCarts: -1, totalQuantity: -1 } },
                { $limit: 10 }
            ]).toArray();

            const userActivity = await this.carts.aggregate([
                {
                    $group: {
                        _id: '$userId',
                        cartCount: { $sum: 1 },
                        lastActive: { $max: '$updatedAt' },
                        totalSpent: {
                            $sum: {
                                $reduce: {
                                    input: '$items',
                                    initialValue: 0,
                                    in: {
                                        $add: [
                                            '$$value',
                                            { $multiply: ['$$this.price', '$$this.quantity'] }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
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
                    cartStatistics: cartValues[0] || {
                        totalValue: 0,
                        avgCartValue: 0,
                        cartCount: 0
                    },
                    popularItems,
                    topUsers: userActivity
                }
            });

        } catch (error) {
            console.error('Error fetching cart analytics:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar estatísticas do carrinho'
            });
        }
    }
}
