import express from 'express'
import mysql from 'mysql2/promise'
import 'dotenv/config'

const app = express()
app.get('/', async (req, res) => {
      if (process.env.DBHOST === undefined){
            res.status(500).send('DBHOST não está definido nas variáveis de ambiente!')
            return
        }
        if (process.env.DBUSER === undefined){
            res.status(500).send('DBUSER não está definido nas variáveis de ambiente!') 
            return
        }
        if (process.env.DBPASSAWORD === undefined){
            res.status(500).send('DBPASSWORD não está definido nas variáveis de ambiente!') 
            return
        }
        if (process.env.DBDATABASE === undefined){
            res.status(500).send('DBNAME não está definido nas variáveis de ambiente!') 
            return
        }
        if (process.env.DBPORT === undefined){
            res.status(500).send('DBPORT não está definido nas variáveis de ambiente!') 
            return
        }
        try{
             const conn = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASSAWORD,
        database: process.env.DBDATABASE,
        port: Number(process.env.DBPORT)
     })
    res.send("Conectado ao banco de dados com sucesso!")
        }
        catch(err){
            if(err instanceof Error === false){
                res.status(500).send('Erro desconhecido ao conectar ao banco de dados')
                return
            }
            const error = err as Error
            res.status(500).send('Erro ao conectar ao banco de dados: ' + error.message)    
        }

    
})
app.listen(8000, () => {
    console.log('Server is running on port 8000')
})