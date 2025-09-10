import express from 'express'
import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { Request, Response } from 'express'

const client = new MongoClient(process.env.MONGO_URI!)
await client.connect()
const db = client.db(process.env.MONGO_DB!)


const app = express()

app.use(express.json()) //Permite receber JSON no body da requisição
//Criando uma rota para acesso pelo navegador
app.get('/produtos', async (req:Request, res:Response) => {
    const produtos = await db.collection('produtos').find().toArray()
    res.json(produtos)
})
//Criando o servidor na porta 8000 com o express
app.listen(8000, () => {
    console.log('Server is running on port 8000')
})