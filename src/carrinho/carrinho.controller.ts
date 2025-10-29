// ARQUIVO: carrinho.controller.ts
import { Request, Response } from "express";
import { ObjectId } from "bson"; // Importado corretamente
import { db } from "../database/banco-mongo.js";
import { AutenticacaoRequest } from "../middlewares/auth.js"; 

// Interfaces (Mantidas)
interface ItemCarrinho {
    produtoId: string; // Mantido como string, pois é o ID do produto
    quantidade: number;
    precoUnitario: number;
    nome: string;
}
interface Carrinho {
    usuarioId: ObjectId; // CORRIGIDO: Deve ser ObjectId
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
}

class CarrinhoController {
    
    // MÉTODO (listar) - CORRIGIDO (Inconsistência de ID)
    async listar(req: AutenticacaoRequest, res: Response) {
        try {
            const { usuarioId } = req; // Este ID vem do Token (string)
            if (!usuarioId) {
                return res.status(401).json({ success: false, message: "Usuário não autenticado" });
            }

            // ... (Lógica de filtros mantida) ...
            const { 
                name, minPrice, maxPrice, minQuantity, maxQuantity,
                category, sortBy = 'name', sortOrder = 'asc'
            } = req.query;

            // CORREÇÃO: Converter a string 'usuarioId' para ObjectId
            // CORREÇÃO: O campo no banco é 'usuarioId', não 'userId'
            const filter: any = { usuarioId: new ObjectId(usuarioId) }; 
            const itemFilters: any[] = [];
            
            // ... (Restante da lógica de agregação mantida) ...
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
                    userId: { $first: '$usuarioId' }, // CORREÇÃO: campo é 'usuarioId'
                    items: { $push: '$items' },
                    total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    createdAt: { $first: '$createdAt' }, // Assumindo que você tem esses campos
                    updatedAt: { $first: '$updatedAt' } // Assumindo que você tem esses campos
                }
            });
            
            const result = await db.collection('carrinhos').aggregate(pipeline).toArray();
            
            return res.status(200).json({
                success: true,
                data: result[0] || { items: [], total: 0 }
            });

        } catch (error) {
            console.error('Error fetching cart items:', error);
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(500).json({ success: false, message: 'Erro ao buscar itens do carrinho. Tente novamente mais tarde.' });
        }
    }

    // MÉTODO (adicionarItem) - CORRIGIDO (Inconsistência de ID)
    async adicionarItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId, quantidade } = req.body;
        
        if (!req.usuarioId)
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para adicionar itens." })
        
        // CORREÇÃO: Converter o ID do usuário (string) para ObjectId
        const usuarioObjId = new ObjectId(req.usuarioId);
        
        if (!ObjectId.isValid(produtoId)) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(400).json({ mensagem: "O produto informado não é válido." });
        }

        const produto = await db.collection("produtos").findOne({ _id: new ObjectId(produtoId) });
        if (!produto) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(404).json({ mensagem: "Produto não encontrado" });
        }
        
        const precoUnitario = (produto as any).preco; 
        const nome = (produto as any).nome;
        
        // CORREÇÃO: Buscar o carrinho usando o ObjectId do usuário
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioObjId });
        
        if (!carrinho) {
            const novoCarrinho: Carrinho = {
                usuarioId: usuarioObjId, // CORREÇÃO: Salvar como ObjectId
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
            { usuarioId: usuarioObjId }, // CORREÇÃO: Atualizar usando o ObjectId
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );
        return res.status(200).json(carrinho);
    }

    // NOVO MÉTODO - TAREFA DA LORENA (Atualizar Quantidade de Item)
    async atualizarQuantidadeItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId, quantidade } = req.body;

        if (!req.usuarioId) {
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para alterar seu carrinho." });
        }
        
        // Validação da quantidade
        const novaQuantidade = parseInt(quantidade, 10);
        if (isNaN(novaQuantidade) || novaQuantidade < 0) {
            return res.status(400).json({ mensagem: "Quantidade inválida. Deve ser um número maior ou igual a zero." });
        }

        const usuarioObjId = new ObjectId(req.usuarioId);
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioObjId });

        if (!carrinho) {
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }

        const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
        if (itemIndex === -1) {
            return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
        }

        // Se a quantidade for 0, remove o item
        if (novaQuantidade === 0) {
            // Verifica se o item ainda existe antes de remover
            if (carrinho.itens[itemIndex]) {
                carrinho.itens.splice(itemIndex, 1);
            } else {
                return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
            }
        } else {
            // Caso contrário, atualiza a quantidade
            const item = carrinho.itens[itemIndex];
            if (!item) {
                return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
            }
            item.quantidade = novaQuantidade;
        }

        // Recalcula o total
        carrinho.total = carrinho.itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
        carrinho.dataAtualizacao = new Date();

        // Atualiza o carrinho no banco
        await db.collection("carrinhos").updateOne(
            { usuarioId: usuarioObjId },
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );

        return res.status(200).json(carrinho);
    }
    
    // MÉTODO (removerItem) - CORRIGIDO (Inconsistência de ID)
    // TAREFA DA SARA (backend) - Este método já existia e atende à tarefa.
    async removerItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId } = req.body;
        
        if (!req.usuarioId)
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para remover itens." })
        
        // CORREÇÃO: Converter para ObjectId
        const usuarioObjId = new ObjectId(req.usuarioId);
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioObjId });
        
        if (!carrinho) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }

        const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
        if (itemIndex === -1) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
        }
        
        carrinho.itens.splice(itemIndex, 1); // Remove o item
        carrinho.total = carrinho.itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
        carrinho.dataAtualizacao = new Date();
        
        await db.collection("carrinhos").updateOne(
            { usuarioId: usuarioObjId }, // CORREÇÃO: Atualiza usando ObjectId
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );
        return res.status(200).json(carrinho);
    }
    
    // MÉTODO (remover) - CORRIGIDO (Inconsistência de ID)
    // TAREFA DA LAÍSA (backend) - Este método já existia e atende à tarefa (usuário logado deleta o *próprio* carrinho).
    async remover(req: AutenticacaoRequest, res: Response) {
        if (!req.usuarioId)
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para remover seu carrinho." })
        
        // CORREÇÃO: Converter para ObjectId
        const usuarioObjId = new ObjectId(req.usuarioId);
        const resultado = await db.collection("carrinhos").deleteOne({ usuarioId: usuarioObjId });
        
        if (resultado.deletedCount === 0) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }
        return res.status(200).json({ mensagem: "Carrinho removido com sucesso" });
    }
}

export default new CarrinhoController()