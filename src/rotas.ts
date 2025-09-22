import { Router } from "express";

import carrinhoController from "./carrinho/carrinho";


const rotas = Router();
rotas.get('/carrinho', carrinhoController.listar)
rotas.post('/carrinho', carrinhoController.adicionar)

export default rotas;