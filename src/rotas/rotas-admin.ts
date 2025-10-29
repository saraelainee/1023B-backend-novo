import { Router } from 'express'
import usuariosController from '../usuarios/usuarios.controller.js'
import adminController from '../admin/admin.controller.js'
import produtosController from '../produtos/produtos.controller.js' // IMPORTADO
import { authorizeRoles } from '../middlewares/auth.js'

const rotas = Router()

// Middleware para verificar se é admin em TODAS as rotas deste arquivo
rotas.use(authorizeRoles('admin'));

// --- Rotas de Gerenciamento de Usuários (Existentes) ---
// TAREFA LORENA (Listar usuários) e SARA (Deletar usuários)
rotas.get('/admin/users', usuariosController.getAllUsers)
rotas.put('/admin/users/:id', usuariosController.updateUser)
rotas.delete('/admin/users/:id', usuariosController.deleteUser)

// --- Rotas de Gerenciamento de Produtos (Novas) ---
// TAREFA LAÍSA (Cadastrar produto)
rotas.post('/admin/produtos', produtosController.adicionar)
// TAREFA LAÍSA (Editar produto)
rotas.put('/admin/produtos/:id', produtosController.atualizar)
// TAREFA VÂNIA (Excluir produto)
rotas.delete('/admin/produtos/:id', produtosController.deletar)


// --- Rotas de Gerenciamento de Carrinhos (Novas) ---
// TAREFA SARA (Listar todos os carrinhos e donos)
rotas.get('/admin/carrinhos', adminController.listarTodosOsCarrinhos)
// TAREFA SARA (Admin deletar qualquer carrinho por ID do *carrinho*)
rotas.delete('/admin/carrinhos/:id', adminController.deletarCarrinhoPorId)


// --- Rotas de Analytics (Existente) ---
rotas.get('/admin/analytics', adminController.getCartAnalytics)

export default rotas