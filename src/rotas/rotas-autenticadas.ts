import { Router } from 'express'
import carrinhoController from '../carrinho/carrinho.controller.js'

const rotas = Router()

// Rotas de Carrinho
rotas.post('/carrinho/adicionarItem', carrinhoController.adicionarItem)
rotas.post('/carrinho/removerItem', carrinhoController.removerItem) // TAREFA SARA

// LORENA (Alterar quantidade)
rotas.put('/carrinho/atualizarItem', carrinhoController.atualizarQuantidadeItem)

// Rota usa a lógica complexa (listar) e pega o ID do token
rotas.get('/carrinho', carrinhoController.listar) 

// Rota pega o ID do token (deletar o *próprio* carrinho)
rotas.delete('/carrinhoDeleta', carrinhoController.remover) // TAREFA LAÍSA (deletar próprio carrinho)

export default rotas