import { Router } from 'express'
import carrinhoController from '../carrinho/carrinho.controller.js'
// import produtosController from '../produtos/produtos.controller.js' // (Se vcs tiverem, mantenham)

const rotas = Router()

// Rotas de Produto (se existirem)
// rotas.post('/produtos', produtosController.adicionar)
// rotas.get('/produtos', produtosController.listar)

// Rotas de Carrinho
rotas.post('/carrinho/adicionarItem', carrinhoController.adicionarItem)
rotas.post('/carrinho/removerItem', carrinhoController.removerItem)

// MODIFICADO: Rota usa a sua lógica complexa e pega o ID do token
rotas.get('/carrinho', carrinhoController.listar) 

// MODIFICADO: Rota pega o ID do token
rotas.delete('/carrinho', carrinhoController.remover)

export default rotas