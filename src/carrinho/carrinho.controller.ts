import { Request, Response } from "express";

class CarrinhoController{
    adicionar(req:Request, res:Response){
        res.send('Produto adicionado ao carrinho')
    }
    listar(req:Request, res:Response){
        res.send('Listando produtos do carrinho')
    }
}

export default new CarrinhoController()