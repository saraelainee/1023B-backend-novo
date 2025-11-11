import { Request, Response } from "express";
import { db } from "../database/banco-mongo.js";
import { ObjectId } from "mongodb";

class AdminController {


    async getCartAnalytics(req: Request, res: Response) {
        try {
            // Usuários ativos (com carrinhos)
            const activeUsers = await db.collection('carrinhos').distinct('usuarioId');
            const activeUsersCount = activeUsers.length;

            // Estatísticas dos carrinhos
            const cartValues = await db.collection('carrinhos').aggregate([
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: '$total' },
                        avgCartValue: { $avg: '$total' },
                        cartCount: { $sum: 1 }
                    }
                }
            ]).toArray();

            // Itens populares
            const popularItems = await db.collection('carrinhos').aggregate([
                { $unwind: '$itens' },
                {
                    $group: {
                        _id: '$itens.produtoId',
                        name: { $first: '$itens.nome' },
                        totalQuantity: { $sum: '$itens.quantidade' },
                        totalRevenue: {
                            $sum: {
                                $multiply: ['$itens.precoUnitario', '$itens.quantidade']
                            }
                        }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }
            ]).toArray();

            // Top usuários
            const userActivity = await db.collection('carrinhos').aggregate([
                {
                    $group: {
                        _id: '$usuarioId',
                        cartCount: { $sum: 1 },
                        lastActive: { $max: '$dataAtualizacao' },
                        totalSpent: { $sum: '$total' }
                    }
                },
                {
                    $lookup: {
                        from: 'usuarios',
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
                },
                message: 'Analytics fetched successfully'
            });

        } catch (error) {
            if (error instanceof Error) {
                console.error('Error fetching cart analytics:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar estatísticas',
                    error: error.message
                });
            }
        }
    }

    // NOVO MÉTODO - TAREFA DA SARA (Admin: Listar todos os carrinhos com nome do usuário)
    async listarTodosOsCarrinhos(req: Request, res: Response) {
        try {
            const carrinhos = await db.collection('carrinhos').aggregate([
                {
                    // Novo campo 'usuarioObjId'
                    // Tenta converter o 'usuarioId' (que pode ser string) para ObjectId.
                    $addFields: {
                        usuarioObjId: {
                            $cond: {
                                // Se o 'usuarioId' for tipo 'string'
                                if: { $eq: [{ $type: "$usuarioId" }, "string"] },
                                // Então: converta para ObjectId
                                then: { $toObjectId: "$usuarioId" },
                                // Senão: apenas use o valor (que já deve ser ObjectId)
                                else: "$usuarioId"
                            }
                        }
                    }
                },
                {
                    // PASSO 2: Fazer o $lookup usando o novo campo 'usuarioObjId'
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuarioObjId', // Usando o campo convertido
                        foreignField: '_id',
                        as: 'dadosUsuario'
                    }
                },
                {
                    // $unwind transforma o array 'dadosUsuario' (que só tem 1 item) em um objeto
                    $unwind: {
                        path: '$dadosUsuario',
                        preserveNullAndEmptyArrays: true // Mantém carrinhos mesmo se o usuário foi deletado
                    }
                },
                {
                    $project: {
                        _id: 1,
                        total: 1,
                        dataAtualizacao: 1,
                        quantidadeItens: { $size: '$itens' },
                        usuario: {
                            _id: '$dadosUsuario._id',
                            nome: '$dadosUsuario.nome',
                            email: '$dadosUsuario.email'
                        }
                    }
                }
            ]).toArray();

            res.status(200).json({ success: true, data: carrinhos });

        } catch (error) {
            console.error('Erro ao listar todos os carrinhos (admin):', error);
            // Isso envia um erro 500
            res.status(500).json({
                success: false,
                message: 'Erro interno ao buscar carrinhos. Verifique o log do servidor.',
                // @ts-ignore
                error: error.message
            });
        }
    }

    //TAREFA DA SARA (Admin: Deletar carrinho por ID do carrinho)
    async deletarCarrinhoPorId(req: Request, res: Response) {
        // id do carrinho
        const { id } = req.params;

        if (!ObjectId.isValid(id!)) {
            return res.status(400).json({ success: false, message: "ID de carrinho inválido" });
        }

        try {
            const resultado = await db.collection('carrinhos').deleteOne({ _id: new ObjectId(id) });

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ success: false, message: "Carrinho não encontrado" });
            }

            return res.status(200).json({ success: true, message: "Carrinho deletado com sucesso pelo administrador" });

        } catch (error) {
            console.error('Erro ao deletar carrinho (admin):', error);
            return res.status(500).json({ success: false, message: "Erro interno ao deletar carrinho" });
        }
    }
}

export default new AdminController();