import {Router} from 'express'

import produtosController from '../produtos/produtos.controller.js'
import usuariosController from '../usarios/usuarios.controller.js'

const rotas = Router()

// Rotas dos produtos



rotas.post('/adicionarUsuario', usuariosController.adicionar)
rotas.post('/login', usuariosController.login)


export default rotas