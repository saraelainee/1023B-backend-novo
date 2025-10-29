// ARQUIVO: produtos.controller.ts
import { Request, Response } from 'express'
import { db } from '../database/banco-mongo.js'
import { ObjectId } from 'mongodb' // Importar ObjectId

class ProdutosController {
    
    // MÉTODO EXISTENTE (adicionar) - Será usado pela Laísa (Admin)
    async adicionar(req: Request, res: Response) {
        const { nome, preco, urlfoto, descricao, categoria } = req.body // Adicionado 'categoria'
        
        // Adicionada 'categoria' à validação
        if (!nome || !preco || !urlfoto || !descricao || !categoria)
            return res.status(400).json({ error: "Nome, preço, urlfoto, descrição e categoria são obrigatórios" })

        const produto = { nome, preco, urlfoto, descricao, categoria } // Adicionado 'categoria'
        
        try {
            const resultado = await db.collection('produtos').insertOne(produto)
            res.status(201).json({ ...produto, _id: resultado.insertedId })
        } catch (error) {
            console.error("Erro ao adicionar produto:", error)
            res.status(500).json({ error: "Erro interno ao adicionar produto" })
        }
    }

    // MÉTODO (listar) - MODIFICADO PARA LAÍSA (Filtragem)
    async listar(req: Request, res: Response) {
        // Pega 'nome' e 'categoria' da query string (ex: /produtos?nome=mouse&categoria=perifericos)
        const { nome, categoria } = req.query;

        // Cria um objeto de filtro dinâmico
        const filtro: any = {};

        if (nome) {
            // $regex para busca parcial (como LIKE) e $options: 'i' para ignorar maiúsculas/minúsculas
            filtro.nome = { $regex: nome, $options: 'i' };
        }

        if (categoria) {
            filtro.categoria = { $regex: categoria, $options: 'i' };
        }

        try {
            // Aplica o filtro (se vazio, retorna tudo)
            const produtos = await db.collection('produtos').find(filtro).toArray()
            res.status(200).json(produtos)
        } catch (error) {
            console.error("Erro ao listar produtos:", error)
            res.status(500).json({ error: "Erro interno ao listar produtos" })
        }
    }

    // NOVO MÉTODO - TAREFA DA LAÍSA (Admin: Atualizar Produto)
    async atualizar(req: Request, res: Response) {
        const { id } = req.params // Pega o ID do produto pela URL
        const { nome, preco, urlfoto, descricao, categoria } = req.body // Pega os novos dados

        // Validação básica
        if (!nome || !preco || !urlfoto || !descricao || !categoria) {
            return res.status(400).json({ error: "Todos os campos (nome, preço, urlfoto, descrição, categoria) são obrigatórios" })
        }
        
        if (!ObjectId.isValid(id!)) {
            return res.status(400).json({ error: "ID de produto inválido" });
        }

        try {
            const resultado = await db.collection('produtos').updateOne(
                { _id: new ObjectId(id) }, // Filtro: encontra o produto pelo ID
                { 
                    $set: { // Novos dados
                        nome, 
                        preco, 
                        urlfoto, 
                        descricao,
                        categoria 
                    } 
                } 
            );

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ error: "Produto não encontrado" });
            }

            res.status(200).json({ success: true, message: "Produto atualizado com sucesso" });

        } catch (error) {
            console.error("Erro ao atualizar produto:", error)
            res.status(500).json({ error: "Erro interno ao atualizar produto" })
        }
    }

    // NOVO MÉTODO - TAREFA DA VÂNIA (Admin: Deletar Produto)
    async deletar(req: Request, res: Response) {
        const { id } = req.params; // Pega o ID do produto pela URL

        if (!ObjectId.isValid(id!)) {
            return res.status(400).json({ error: "ID de produto inválido" });
        }

        try {
            const resultado = await db.collection('produtos').deleteOne(
                { _id: new ObjectId(id) } // Filtro: encontra o produto pelo ID
            );

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ error: "Produto não encontrado" });
            }

            res.status(200).json({ success: true, message: "Produto deletado com sucesso" });

        } catch (error) {
            console.error("Erro ao deletar produto:", error)
            res.status(500).json({ error: "Erro interno ao deletar produto" })
        }
    }
}

export default new ProdutosController()