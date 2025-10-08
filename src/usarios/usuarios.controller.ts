import { Request, Response } from "express";
import { db } from "../database/banco-mongo.js";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

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

    async login(req:Request, res:Response){
        const {email, senha} = req.body
        if(!email || !senha){
            return res.status(400).json({menssagem:"Email e senha são obrigatórios!"})

        }
        //como verificar se o usuário tem acesso ou não?
        const usuario = await db.collection('usuarios').findOne({email})
        if(!usuario){
            return res.status(400).json({menssagem:"Ops, não autorizado!"})
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha)
        if(senhaValida){
            return res.status(401).json({menssagem:"Ops, não autorizado!"})
        }

        //gerar o token
        const token = jwt.sign({id: usuario._id}, process.env.JWT_SECRET!, { expiresIn: '1m' })
        res.status(200).json({ token:token })


        res.status(401).json({menssagem:"Ops, não autorizado!"})
    } 
}

export default new UsuariosController()