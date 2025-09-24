import { Router } from "express";

import carrinhoController from "./carrinho/carrinho.controller.js";
import produtoController from "./produtos/produtos.controller.js";


const rotas = Router();

//rotas de carrinho
rotas.get('/carrinho', carrinhoController.listar)
rotas.post('/carrinho', carrinhoController.adicionar)

//rotas de produtos
rotas.get('/produtos', carrinhoController.listar)
rotas.post('/produtos', carrinhoController.adicionar)


export default rotas;