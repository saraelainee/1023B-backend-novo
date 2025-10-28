// ARQUIVO: rotas-autenticadas.ts
import { Router } from 'express'
import carrinhoController from '../carrinho/carrinho.controller.js'
// import produtosController from '../produtos/produtos.controller.js' // Removido, pois produtos agora são públicos ou admin

const rotas = Router()

// Rotas de Produto (Movidas para admin ou não-autenticadas)
// rotas.post('/produtos', produtosController.adicionar) // Agora é rota de ADMIN
// rotas.get('/produtos', produtosController.listar) // Agora é rota PÚBLICA

// Rotas de Carrinho
rotas.post('/carrinho/adicionarItem', carrinhoController.adicionarItem)
rotas.post('/carrinho/removerItem', carrinhoController.removerItem) // TAREFA SARA

// ADICIONADO: ROTA PARA TAREFA DA LORENA (Alterar quantidade)
rotas.put('/carrinho/atualizarItem', carrinhoController.atualizarQuantidadeItem)

// Rota usa a lógica complexa (listar) e pega o ID do token
rotas.get('/carrinho', carrinhoController.listar) 

// Rota pega o ID do token (deletar o *próprio* carrinho)
rotas.delete('/carrinho', carrinhoController.remover) // TAREFA LAÍSA (deletar próprio carrinho)

export default rotas