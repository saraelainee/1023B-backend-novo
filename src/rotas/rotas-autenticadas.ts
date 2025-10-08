import {Router} from 'express'

import carrinhoController from '../carrinho/carrinho.controller.js'
import produtosController from '../produtos/produtos.controller.js'
import usuariosController from '../usarios/usuarios.controller.js'

const rotas = Router()

// Rotas do Carrinho
//rotas.get('/carrinho',carrinhoController.listar)
//rotas.post('/carrinho',carrinhoController.adicionar)

// Rotas dos produtos
rotas.post('/produtos',produtosController.adicionar)

rotas.post('/adicionarItem',carrinhoController.adicionarItem)
rotas.post('/removerItem',carrinhoController.removerItem)
rotas.get('/carrinho/:usuarioId',carrinhoController.listar)
rotas.delete('/carrinho/:usuarioId',carrinhoController.remover)





export default rotas