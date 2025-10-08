import {Router} from 'express'

import carrinhoController from './carrinho/carrinho.controller.js'
import produtosController from './produtos/produtos.controller.js'
import usuariosController from './usarios/usuarios.controller.js'

const rotas = Router()

// Rotas do Carrinho
//rotas.get('/carrinho',carrinhoController.listar)
//rotas.post('/carrinho',carrinhoController.adicionar)

// Rotas dos produtos
rotas.get('/produtos',produtosController.listar)
rotas.post('/produtos',produtosController.adicionar)

rotas.post('/adicionarItem',carrinhoController.adicionarItem)

rotas.post('/adicionarUsuario', usuariosController.adicionar)
rotas.post('/login', usuariosController.login)


export default rotas