import express, { Request, Response, NextFunction } from 'express'
import 'dotenv/config'
import rotasAutenticadas from './rotas/rotas-autenticadas.js'
import rotasNaoAutenticadas from './rotas/rotas-nao-autenticadas.js'
import Auth from './middlewares/auth.js'
const app = express()
//Esse middleware faz com que o 
// express faça o parse do body da requisição para json 

app.use(express.json())


// Usando as rotas definidas em rotas.ts
// Usando o middleware de autenticação
app.use(Auth,rotasAutenticadas)

//Não usando o middleware de autenticação
app.use(rotasNaoAutenticadas)

// Criando o servidor na porta 8000 com o express
app.listen(8000, () => {
    console.log('Server is running on port 8000')
})