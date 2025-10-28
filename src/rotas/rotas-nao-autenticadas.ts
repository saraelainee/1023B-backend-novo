// ARQUIVO: rotas-nao-autenticadas.ts
import {Router} from 'express'

import produtosController from '../produtos/produtos.controller.js'
import usuariosController from '../usuarios/usuarios.controller.js'

const rotas = Router()

// --- Rotas de Usuário ---
rotas.post('/adicionarUsuario',usuariosController.adicionar)
rotas.post('/login',usuariosController.login)

// --- Rotas Públicas de Produto ---
// ADICIONADO: Permite que visitantes (sem login) vejam os produtos
// Atende à Tarefa da Laísa (filtragem) e Lorena (listar) para o público
rotas.get('/produtos', produtosController.listar) 


export default rotas