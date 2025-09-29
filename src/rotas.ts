import { Router } from "express";

import carrinhoController from "./carrinho/carrinho.controller.js";
import produtoController from "./produtos/produtos.controller.js";

const rotas = Router();

// rotas de carrinho
rotas.get('/carrinho', carrinhoController.listar);
//rotas.post('/carrinho', carrinhoController.adicionar);

// rotas de produtos
rotas.get('/produtos', produtoController.listar);
rotas.post('/produtos', produtoController.adicionar);

export default rotas;
