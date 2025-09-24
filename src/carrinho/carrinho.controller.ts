import { Request, Response } from "express";

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
        const { usuarioId, produtoId, quantidade } = req.body;
    } 
        //Buscar o produto no banco de dados
        //Pegar o preço do produto
        //Pegar o nome do produto


        // Verificar se um carrinho com o usuário já existe

        // Se não existir deve criar um novo carrinho

        // Se existir, deve adicionar o item ao carrinho existente

        // Calcular o total do carrinho

        // Atualizar a data de atualização do carrinho




    //removerItem
    //atualizarQuantidade
    //listar
    //remover   -> Remover o carrinho todo

}
export default new CarrinhoController();