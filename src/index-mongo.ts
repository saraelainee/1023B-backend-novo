import express from 'express'
import 'dotenv/config'
import cors from 'cors'
// Importa as 3 rotas
import rotasNaoAutenticadas from './rotas/rotas-nao-autenticadas.js'
import rotasAutenticadas from './rotas/rotas-autenticadas.js'
import rotasAdmin from './rotas/rotas-admin.js' // ADICIONADO
import Auth from './middlewares/auth.js'

const app = express()
app.use(cors())
app.use(express.json())

// Rotas públicas
app.use(rotasNaoAutenticadas)

// Middleware de Autenticação - Tudo abaixo disto exigirá token
app.use(Auth)

// Rotas de usuário autenticado
app.use(rotasAutenticadas)

// Rotas de administrador autenticado
app.use(rotasAdmin) // ADICIONADO

app.listen(process.env.PORT || 8000, () => {
    console.log(`Servidor rodando na porta ${process.env.PORT || 8000}`)
})