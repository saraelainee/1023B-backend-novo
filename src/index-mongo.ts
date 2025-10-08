import express from 'express'
import 'dotenv/config'
import rotas from './rotas.js'
const app = express()
//Esse middleware faz com que o 
// express faça o parse do body da requisição para json 


//Meu primeiro middleware
function middleware1(req:express.Request,res:express.Response,next:express.NextFunction){
    console.log("Passei no middleware 1")
    next() //chama o próximo middleware
}

app.use(middleware1,rotas)

app.use(express.json())

app.use(rotas)

// Criando o servidor na porta 8000 com o express
app.listen(8000, () => {
    console.log('Server is running on port 8000')
})