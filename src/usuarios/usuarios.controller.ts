import { Request, Response } from 'express'
import { db } from '../database/banco-mongo.js' // Mantém a conexão delas
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt' // Mantém o bcrypt delas
import { ObjectId } from 'mongodb'
import { AutenticacaoRequest } from '../middlewares/auth.js'

class UsuariosController {
    
    async adicionar(req: Request, res: Response) {
        const { nome, idade, email, senha } = req.body
        if (!nome || !idade || !email || !senha)
            return res.status(400).json({ error: "Nome, idade, email e senha são obrigatórios" })
        if (senha.length < 6)
            return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" })

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Formato de e-mail inválido" });
        }
        
        const existingUser = await db.collection('usuarios').findOne({ email });
        if (existingUser) {
            return res.status(409).json({message: "E-mail já cadastrado" });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10)
        
        const usuario = { 
            nome, 
            idade, 
            email, 
            senha: senhaCriptografada,
            role: 'user', // Define 'user' como padrão
            createdAt: new Date().toISOString()
        }

        const resultado = await db.collection('usuarios').insertOne(usuario)
        res.status(201).json({ nome, idade, email, _id: resultado.insertedId })
    }

    async login(req: Request, res: Response) {
        const { email, senha } = req.body
        if (!email || !senha) return res.status(400).json({ mensagem: "Email e senha são obrigatórios!" })

        const usuario = await db.collection('usuarios').findOne({ email })
        if (!usuario) return res.status(401).json({ mensagem: "Usuário Incorreto!" })
        
        const senhaValida = await bcrypt.compare(senha, usuario.senha)
        if (!senhaValida) return res.status(401).json({ mensagem: "Senha Incorreta!" })

        const token = jwt.sign(
            { usuarioId: usuario._id, role: usuario.role, nome: usuario.nome }, // LINHA NOVA
            process.env.JWT_SECRET!,
            { expiresIn: '1d' }
        )   
        
        res.status(200).json({
            success: true,
            message: "Login bem-sucedido",
            token,
            user: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role
            }
        });
    }

    async getAllUsers(req: Request, res: Response) {
        try {
            const usuarios = await db.collection('usuarios').find(
                {},
                { projection: { senha: 0 } }
            ).toArray()
            
            res.status(200).json({
                success: true,
                data: usuarios
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ success: false, message: "Erro interno ao buscar usuários" });
        }
    }

    async updateUser(req: AutenticacaoRequest, res: Response) {
        try {
            const { id } = req.params; // ID do usuário a ser atualizado
            const updateData = req.body;

            if (!id) {
                return res.status(400).json({ success: false, message: "ID do usuário não fornecido" });
            }


            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "ID de usuário inválido" });
            }

            if ('role' in updateData) {
                delete updateData.role;
            }
            
            if ('senha' in updateData) {
                 delete updateData.senha;
            }

            const result = await db.collection('usuarios').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ success: false, message: "Usuário não encontrado" });
            }

            return res.status(200).json({ success: true, message: "Usuário atualizado com sucesso" });

        } catch (error) {
            console.error('Error updating user:', error);
            return res.status(500).json({ success: false, message: "Erro interno ao atualizar usuário" });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ success: false, message: "ID do usuário não fornecido" });
            }

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "ID de usuário inválido" });
            }

            const result = await db.collection('usuarios').deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, message: "Usuário não encontrado" });
            }

            return res.status(200).json({ success: true, message: "Usuário deletado com sucesso" });

        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ success: false, message: "Erro interno ao deletar usuário" });
        }
    }
}

export default new UsuariosController()