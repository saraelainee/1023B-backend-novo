import { User, AdminUser } from "./usersClass";
import { Request, Response } from "express";
import db from "../DB/db.connection";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { ObjectId, Collection } from "mongodb";

export default class UserController {
    // Usa a instância de 'db' importada
    private db = db;
    private users = this.db.collection('users');
    private readonly JWT_SECRET = process.env.JWT_SECRET || 'JWTSEGREDOGIGATONICO';
    
    async createUser(req: Request, res: Response) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        try {
            const { nome, email, password } = req.body;

            if (!nome || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Todos os campos são obrigatórios"
                });
            }

            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Formato de e-mail inválido"
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: "A senha deve ter pelo menos 8 caracteres"
                });
            }

            const existingUser = await this.users.findOne({ email });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "E-mail já cadastrado"
                });
            }

            const user = new User(nome, email, password);
            await this.users.insertOne(user);

            return res.status(201).json({
                success: true,
                message: "Usuário criado com sucesso"
            });

        } catch (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao criar usuário"
            });
        }
    }

    async createAdminUser(req: Request, res: Response) {
        try {
            const { nome, email, password } = req.body;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!nome || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Todos os campos são obrigatórios"
                });
            }

            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Formato de e-mail inválido"
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: "A senha deve ter pelo menos 8 caracteres"
                });
            }

            const existingAdmin = await this.users.findOne({ email, role: 'admin' });
            if (existingAdmin) {
                return res.status(409).json({
                    success: false,
                    message: "Administrador já cadastrado"
                });
            }

            const adminUser = new AdminUser(nome, email, password);
            await this.users.insertOne(adminUser);

            return res.status(201).json({
                success: true,
                message: "Administrador criado com sucesso"
            });

        } catch (error) {
            console.error('Error creating admin:', error);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao criar administrador"
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "E-mail e senha são obrigatórios"
                });
            }

            const user = await this.users.findOne({ email });

            if (!user || user.password !== password) {
                return res.status(401).json({
                    success: false,
                    message: "Credenciais inválidas"
                });
            }

            const token = jwt.sign(
                {
                    userId: user._id.toString(),
                    email: user.email,
                    role: user.role || 'user'
                },
                this.JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.status(200).json({
                success: true,
                token,
                user: {
                    id: user._id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role || 'user'
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao fazer login"
            });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID de usuário inválido"
                });
            }

            const result = await this.users.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Usuário não encontrado"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Usuário removido com sucesso"
            });

        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao remover usuário"
            });
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID de usuário inválido"
                });
            }

            if ('role' in updateData) {
                delete updateData.role;
            }

            const result = await this.users.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Usuário não encontrado"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Usuário atualizado com sucesso"
            });

        } catch (error) {
            console.error('Error updating user:', error);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao atualizar usuário"
            });
        }
    }

    async getAllUsers(req: Request, res: Response) {
        try {
            const users = await this.users.find(
                {},
                { projection: { password: 0 } }
            ).toArray();

            return res.status(200).json({
                success: true,
                data: users
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao buscar usuários"
            });
        }
    }
}