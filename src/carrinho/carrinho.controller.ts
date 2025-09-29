import { Request, Response } from "express";
//import aqui as dependências necessárias
import { ObjectId } from "bson";
import { db } from "../database/banco-mongo.js";

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
    //adicionarItem
    async adicionarItem(req:Request, res:Response) {
        console.log(req.body);
        console.log("Chegou na rota de adicionar item ao carrinho");
        const { usuarioId, produtoId, quantidade } = req.body;
         //Buscar o produto no banco de dados
        const produto = await db.collection("produtos").findOne({ _id: ObjectId.createFromHexString(produtoId)});
        if (!produto) {
            return res.status(400).json({ message: "Produto não encontrado" });
        }
        //Pegar o preço do produto
        //Pegar o nome do produto
        const precoUnitario = produto.preco; // Supondo que o produto tenha um campo 'preco'
        const nome = produto.nome; // Supondo que o produto tenha um campo 'nome'


        // Verificar se um carrinho com o usuário já existe
        // const carrinhoExistente = await db.collection("carrinhos").findOne({ usuarioId: usuarioId });

        // if (carrinhoExistente) {
        //     // Se não existir deve criar um novo carrinho
        //     const novoCarrinho: Carrinho = {
        //         usuarioId: usuarioId,
        //         itens: [
        //             {
        //                 produtoId: produtoId,
        //                 quantidade: quantidade,
        //                 precoUnitario: precoUnitario,
        //                 nome: nome
        //             }
        //         ],
        //         dataAtualizacao: new Date(),
        //         total: precoUnitario * quantidade
        //     };
        //     await db.collection("carrinhos").insertOne(novoCarrinho);
        // } else {
        //     // Se existir, deve adicionar o item ao carrinho existente
        //     await db.collection("carrinhos").updateOne(
        //         { usuarioId: usuarioId },
        //         {
        //             push: { itens: { produtoId, quantidade, precoUnitario, nome } },
        //             $set: { dataAtualizacao: new Date() }
        //         }
        //     );
        // }

        // // Calcular o total do carrinho
        // const carrinhoAtualizado = await db.collection("carrinhos").findOne({ usuarioId: usuarioId });
        // if (carrinhoAtualizado) {
        //     const total = carrinhoAtualizado.itens.reduce((acc:any, item:any) => acc + item.precoUnitario * item.quantidade, 0);
        //     await db.collection("carrinhos").updateOne(
        //         { usuarioId: usuarioId },
        //         { $set: { total: total } }
        //     );
        // }

        // // Atualizar a data de atualização do carrinho

        // res.status(200).json({ message: "Item adicionado ao carrinho com sucesso" });
        

        

        

    } 
       
        






    // //removerItem

    // async removerItem(req: Request, res: Response) {
    //     const { usuarioId, produtoId } = req.body;

    //     // Remover o item do carrinho
    //     await db.collection("carrinhos").updateOne(
    //         { usuarioId: usuarioId },
    //         { pull: { itens: { produtoId: produtoId } } }
    //     );

    //     res.status(200).json({ message: "Item removido do carrinho com sucesso" });
    // }

    // //atualizarQuantidade
    // async atualizarQuantidade(req: Request, res: Response) {
    //     const { usuarioId, produtoId, quantidade } = req.body;

    //     // Atualizar a quantidade do item no carrinho
    //     await db.collection("carrinhos").updateOne(
    //         { usuarioId: usuarioId, "itens.produtoId": produtoId },
    //         { $set: { "itens.$.quantidade": quantidade } }
    //     );

    //     res.status(200).json({ message: "Quantidade atualizada com sucesso" });
    // }

    // //listar
    // async listar(req: Request, res: Response) {
    //     const { usuarioId } = req.body;

    //     // Listar os itens do carrinho
    //     const carrinho = await db.collection("carrinhos").findOne({ usuarioId: usuarioId });
    //     if (!carrinho) {
    //         return res.status(404).json({ message: "Carrinho não encontrado" });
    //     }

    //     res.status(200).json(carrinho);
    // }

    // //remover                -> Remover o carrinho todo
    // async remover(req: Request, res: Response) {
    //     const { usuarioId } = req.body;

    //     // Remover o carrinho do usuário
    //     await db.collection("carrinhos").deleteOne({ usuarioId: usuarioId });

    //     res.status(200).json({ message: "Carrinho removido com sucesso" });
    // }

}
export default new CarrinhoController();