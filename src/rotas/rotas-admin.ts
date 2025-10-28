import { Router } from 'express'
import usuariosController from '../usuarios/usuarios.controller.js'
import adminController from '../admin/admin.controller.js'
import { authorizeRoles } from '../middlewares/auth.js'

const rotas = Router()

// Middleware para verificar se é admin em TODAS as rotas deste arquivo
rotas.use(authorizeRoles('admin'));

// Rotas de Gerenciamento de Usuários (do seu 'routes.ts' original)
rotas.get('/admin/users', usuariosController.getAllUsers)
rotas.put('/admin/users/:id', usuariosController.updateUser)
rotas.delete('/admin/users/:id', usuariosController.deleteUser)

// Rota de Analytics (do seu 'routes.ts' original)
rotas.get('/admin/analytics', adminController.getCartAnalytics)

export default rotas