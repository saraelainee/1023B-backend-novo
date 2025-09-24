import { Request, Response } from "express";
import { db } from "../database/banco-mongo.js";
import bcrypt from 'bcryptjs'
class UsuariosController{
    async adicionar(req:Request, res:Response){
        const {nome, idade, email, senha } = req.body
     if(!nome || !idade || !email || !senha) {
        return res.status(400).json({error: 'Nome, idade, email, senha'})
    }
    if(senha.lenght < 6) {
        return res.status(400).json({error: "A senha deve ter no mínimo 6 caracteres"})
    }
    if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({error: 'Email inválido'})
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10)
    const usuario = {nome, idade, email, senha}


    const resultado = await db.collection('usuarios').insertOne(usuario)
    res.status(201).json({ nome, idade, email, senha: senhaCriptografada})
    }

    async listar(req:Request, res:Response){
         const usuarios = await db.collection('usuarios').find().toArray()
         const usuariosSemSenha = usuarios.map(({senha, ...rest}) => rest)
         res.status(200).json(usuariosSemSenha)
    }
}

export default new UsuariosController()