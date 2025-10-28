import { Request, Response } from "express";
import { ObjectId } from "bson";
import { db } from "../database/banco-mongo.js";
import { AutenticacaoRequest } from "../middlewares/auth.js"; // Importa a interface

// Interfaces do modelo delas
interface ItemCarrinho {
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nome: string;
}
interface Carrinho {
    usuarioId: string;
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
}

class CarrinhoController {
    
    // SUA LÓGICA DE LISTAGEM (getCartItems) - substituindo o 'listar' delas
    async listar(req: AutenticacaoRequest, res: Response) {
        try {
            // Corrigido: Pega o ID do middleware 'Auth', não do parâmetro
            const { usuarioId } = req; 
            if (!usuarioId) {
                return res.status(401).json({ success: false, message: "Usuário não autenticado" });
            }

            const { 
                name, minPrice, maxPrice, minQuantity, maxQuantity,
                category, sortBy = 'name', sortOrder = 'asc'
            } = req.query;

            const filter: any = { userId: new ObjectId(usuarioId) };
            const itemFilters: any[] = [];
            
            if (name) itemFilters.push({ 'items.name': { $regex: name, $options: 'i' } });
            if (category) itemFilters.push({ 'items.category': { $regex: category, $options: 'i' } });

            if (minPrice || maxPrice) {
                const priceFilter: any = {};
                if (minPrice) priceFilter.$gte = parseFloat(minPrice as string);
                if (maxPrice) priceFilter.$lte = parseFloat(maxPrice as string);
                itemFilters.push({ 'items.price': priceFilter });
            }
            if (minQuantity || maxQuantity) {
                const quantityFilter: any = {};
                if (minQuantity) quantityFilter.$gte = parseInt(minQuantity as string);
                if (maxQuantity) quantityFilter.$lte = parseInt(maxQuantity as string);
                itemFilters.push({ 'items.quantity': quantityFilter });
            }

            const pipeline: any[] = [
                { $match: filter },
                { $unwind: '$items' },
                { $match: {} } // Placeholder
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

            // Usa a coleção 'carrinhos' (do modelo delas)
            const result = await db.collection('carrinhos').aggregate(pipeline).toArray();
            
            return res.status(200).json({
                success: true,
                data: result[0] || { items: [], total: 0 }
            });

        } catch (error) {
            console.error('Error fetching cart items:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar itens do carrinho' });
        }
    }

    // FUNÇÕES DELAS (Mantidas)
    async adicionarItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId, quantidade } = req.body;
        if (!req.usuarioId)
            return res.status(401).json({ mensagem: "Usuário inválido!" })
        
        const usuarioId = req.usuarioId 
        const produto = await db.collection("produtos").findOne({ _id: ObjectId.createFromHexString(produtoId) });
        if (!produto) {
            return res.status(400).json({ mensagem: "Produto não encontrado" });
        }
        
        const precoUnitario = (produto as any).preco; 
        const nome = (produto as any).nome;
        
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioId });
        
        if (!carrinho) {
            const novoCarrinho: Carrinho = {
                usuarioId: usuarioId,
                itens: [{ produtoId: produtoId, quantidade: quantidade, precoUnitario: precoUnitario, nome: nome }],
                dataAtualizacao: new Date(),
                total: precoUnitario * quantidade
            };
            await db.collection("carrinhos").insertOne(novoCarrinho);
            return res.status(201).json(novoCarrinho);
        }
        
        const itemExistente = carrinho.itens.find(item => item.produtoId === produtoId);
        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.itens.push({ produtoId: produtoId, quantidade: quantidade, precoUnitario: precoUnitario, nome: nome });
        }
        
        carrinho.total = carrinho.itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
        carrinho.dataAtualizacao = new Date();
        
        await db.collection("carrinhos").updateOne(
            { usuarioId: usuarioId },
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );
        return res.status(200).json(carrinho);
    }
    
    // FUNÇÃO DELAS (Mantida)
    async removerItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId } = req.body;
        if (!req.usuarioId)
            return res.status(401).json({ mensagem: "Usuário inválido!" })
        
        const usuarioId = req.usuarioId
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioId });
        
        if (!carrinho) {
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }

        const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
        if (itemIndex === -1) {
            return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
        }
        
        carrinho.itens.splice(itemIndex, 1);
        carrinho.total = carrinho.itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
        carrinho.dataAtualizacao = new Date();
        
        await db.collection("carrinhos").updateOne(
            { usuarioId: usuarioId },
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );
        return res.status(200).json(carrinho);
    }
    
    // FUNÇÃO DELAS (Mantida)
    async remover(req: AutenticacaoRequest, res: Response) {
        if (!req.usuarioId)
            return res.status(401).json({ mensagem: "Usuário inválido!" })
        
        const usuarioId = req.usuarioId;
        const resultado = await db.collection("carrinhos").deleteOne({ usuarioId: usuarioId });
        
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }
        return res.status(200).json({ mensagem: "Carrinho removido com sucesso" });
    }
}

export default new CarrinhoController()