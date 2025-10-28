import { Request, Response } from "express";
import db from "../DB/db.connection";
import { ObjectId } from "mongodb";

export default class CartController {
    private db = db;
    private carts = this.db.collection('carts');
    private products = this.db.collection('products');

    async getCartItems(req: any, res: Response) {
        try {
            const { userId } = req.user;
            const { 
                name, 
                minPrice, 
                maxPrice, 
                minQuantity, 
                maxQuantity,
                category,
                sortBy = 'name',
                sortOrder = 'asc'
            } = req.query;

            const filter: any = { userId: new ObjectId(userId) };
            
            const itemFilters: any[] = [];
            
            if (name) {
                itemFilters.push({
                    'items.name': { $regex: name, $options: 'i' }
                });
            }
            
            if (category) {
                itemFilters.push({
                    'items.category': { $regex: category, $options: 'i' }
                });
            }
            
            if (minPrice || maxPrice) {
                const priceFilter: any = {};
                if (minPrice) priceFilter.$gte = parseFloat(minPrice);
                if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
                itemFilters.push({ 'items.price': priceFilter });
            }
            
            if (minQuantity || maxQuantity) {
                const quantityFilter: any = {};
                if (minQuantity) quantityFilter.$gte = parseInt(minQuantity, 10);
                if (maxQuantity) quantityFilter.$lte = parseInt(maxQuantity, 10);
                itemFilters.push({ 'items.quantity': quantityFilter });
            }

            const pipeline: any[] = [
                { $match: { userId: new ObjectId(userId) } },
                { $unwind: '$items' },
                { $match: {} }
            ];

            if (itemFilters.length > 0) {
                pipeline[2].$match.$and = itemFilters;
            }
            const sort: any = {};
            sort[`items.${sortBy}`] = sortOrder === 'asc' ? 1 : -1;
            pipeline.push({ $sort: sort });

            pipeline.push({
                $group: {
                    _id: '$_id',
                    userId: { $first: '$userId' },
                    items: { $push: '$items' },
                    total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    createdAt: { $first: '$createdAt' },
                    updatedAt: { $first: '$updatedAt' }
                }
            });

            const result = await this.carts.aggregate(pipeline).toArray();
            
            return res.status(200).json({
                success: true,
                data: result[0] || { items: [], total: 0 },
                filters: {
                    name,
                    minPrice,
                    maxPrice,
                    minQuantity,
                    maxQuantity,
                    category,
                    sortBy,
                    sortOrder
                }
            });

        } catch (error) {
            console.error('Error fetching cart items:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar itens do carrinho'
            });
        }
    }
}
